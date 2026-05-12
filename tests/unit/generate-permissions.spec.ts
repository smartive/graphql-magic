import { type ModelDefinitions, Models } from '../../src/models';
import { generatePermissions, type PermissionsConfig, type Permissions } from '../../src/permissions/generate';

const modelDefinitions: ModelDefinitions = [
  { name: 'Role', kind: 'enum', values: ['ADMIN', 'EXPERT'] },
  {
    kind: 'entity',
    name: 'User',
    fields: [{ name: 'role', kind: 'enum', type: 'Role', nonNull: true }],
  },
  {
    kind: 'entity',
    name: 'Expert',
    fields: [
      { name: 'user', kind: 'relation', type: 'User', toOne: true, reverse: 'experts' },
    ],
  },
];

const models = new Models(modelDefinitions);

const getRole = (permissions: Permissions, role: string) => {
  const rolePermissions = permissions[role];
  if (rolePermissions === true || rolePermissions === undefined) {
    throw new Error(`expected per-type permissions for role ${role}`);
  }
  return rolePermissions;
};

describe('generatePermissions — implicit READ', () => {
  it('emits an implicit READ chain on a relation sub-block by default', () => {
    const config: PermissionsConfig = {
      WOP_ADMIN: {
        Expert: { RELATIONS: { user: { UPDATE: true } } },
      },
    };

    const role = getRole(generatePermissions(models, config), 'WOP_ADMIN');

    expect(role.User?.READ).toEqual([
      [
        { type: 'Expert' },
        { type: 'User', foreignKey: 'userId', reverse: true },
      ],
    ]);
    expect(role.User?.UPDATE).toEqual([
      [
        { type: 'Expert' },
        { type: 'User', foreignKey: 'userId', reverse: true },
      ],
    ]);
  });

  it('skips the implicit READ chain when READ: false is set on a sub-block', () => {
    const config: PermissionsConfig = {
      WOP_ADMIN: {
        Expert: { RELATIONS: { user: { READ: false, UPDATE: true } } },
      },
    };

    const role = getRole(generatePermissions(models, config), 'WOP_ADMIN');

    expect(role.User?.READ).toBeUndefined();
    expect(role.User?.UPDATE).toEqual([
      [
        { type: 'Expert' },
        { type: 'User', foreignKey: 'userId', reverse: true },
      ],
    ]);
  });

  it('skips the unconditional READ grant when READ: false is set on a top-level block', () => {
    const config: PermissionsConfig = {
      WOP_ADMIN: {
        User: { READ: false, UPDATE: true },
      },
    };

    const role = getRole(generatePermissions(models, config), 'WOP_ADMIN');

    expect(role.User?.READ).toBeUndefined();
    expect(role.User?.UPDATE).toBe(true);
  });

  it('treats READ: true as equivalent to omitting READ', () => {
    const withExplicit = generatePermissions(models, {
      WOP_ADMIN: { Expert: { RELATIONS: { user: { READ: true, UPDATE: true } } } },
    });
    const withImplicit = generatePermissions(models, {
      WOP_ADMIN: { Expert: { RELATIONS: { user: { UPDATE: true } } } },
    });

    expect(withExplicit).toEqual(withImplicit);
  });

  it('READ: false on one sub-block does not suppress sibling READ chains on the same type', () => {
    const config: PermissionsConfig = {
      WOP_ADMIN: {
        User: { WHERE: { role: 'EXPERT' } },
        Expert: { RELATIONS: { user: { READ: false, UPDATE: true } } },
      },
    };

    const role = getRole(generatePermissions(models, config), 'WOP_ADMIN');

    expect(role.User?.READ).toEqual([
      [{ type: 'User', where: { role: 'EXPERT' } }],
    ]);
    expect(role.User?.UPDATE).toEqual([
      [
        { type: 'Expert' },
        { type: 'User', foreignKey: 'userId', reverse: true },
      ],
    ]);
  });
});
