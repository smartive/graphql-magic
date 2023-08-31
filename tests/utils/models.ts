import { RawModels } from '../../src/models';
import { getModels } from '../../src/models/utils';
import { generatePermissions, PermissionsConfig } from '../../src/permissions/generate';

export const rawModels: RawModels = [
  {
    name: 'SomeEnum',
    kind: 'enum',
    values: ['A', 'B', 'C'],
  },
  {
    name: 'Role',
    kind: 'enum',
    values: ['ADMIN', 'USER'],
  },

  {
    name: 'SomeRawObject',
    kind: 'raw',
    fields: [{ name: 'field', type: 'String' }],
  },

  {
    kind: 'object',
    name: 'User',
    fields: [
      {
        name: 'username',
        type: 'String',
      },
      {
        name: 'role',
        kind: 'enum',
        type: 'Role',
      },
    ],
  },
  {
    kind: 'object',
    name: 'AnotherObject',
    listQueriable: true,
    deletable: true,
    displayField: 'name',
    fields: [
      {
        type: 'String',
        name: 'name',
        orderable: true,
      },
      {
        kind: 'relation',
        type: 'AnotherObject',
        name: 'myself',
        toOne: true,
        reverse: 'self',
      }
    ],
  },
  {
    kind: 'object',
    name: 'SomeObject',
    plural: 'ManyObjects',
    description: 'An object',
    queriable: true,
    listQueriable: true,
    creatable: true,
    updatable: true,
    deletable: true,
    fields: [
      {
        name: 'field',
        searchable: true,
        type: 'String',
      },
      {
        name: 'another',
        kind: 'relation',
        type: 'AnotherObject',
        filterable: true,
        updatable: true,
        nonNull: true,
      },
      {
        name: 'list',
        type: 'Float',
        scale: 1,
        precision: 1,
        nonNull: true,
        list: true,
        args: [{ name: 'magic', type: 'Boolean' }],
      },
      {
        name: 'xyz',
        type: 'Int',
        description: 'yay',
        nonNull: true,
        creatable: true,
        updatable: true,
        orderable: true,
      },
    ],
  },
];

export const models = getModels(rawModels);

const permissionsConfig: PermissionsConfig = {
  ADMIN: true,
};

export const permissions = generatePermissions(models, permissionsConfig);
