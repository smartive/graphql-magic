import { RawModels } from '../../src/models';
import { generatePermissions, PermissionsConfig } from '../../src/permissions/generate';
import { getModels } from '../../src/utils';

export const rawModels: RawModels = [
  {
    name: 'SomeEnum',
    type: 'enum',
    values: ['A', 'B', 'C'],
  },
  {
    name: 'Role',
    type: 'enum',
    values: ['ADMIN', 'USER'],
  },

  {
    name: 'SomeRawObject',
    type: 'raw',
    fields: [{ name: 'field', type: 'String' }],
  },

  {
    type: 'object',
    name: 'User',
    fields: [
      {
        name: 'username',
        type: 'String',
      },
      {
        name: 'role',
        type: 'enum',
        typeName: 'Role',
      },
    ],
  },
  {
    type: 'object',
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
        type: 'relation',
        typeName: 'AnotherObject',
        name: 'myself',
        toOne: true,
        reverse: 'self',
      }
    ],
  },
  {
    type: 'object',
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
        type: 'relation',
        typeName: 'AnotherObject',
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
