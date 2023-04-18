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
    name: 'SomeRawObject',
    type: 'raw-object',
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
        type: 'AnotherObject',
        relation: true,
        filterable: true,
        nonNull: true,
      },
      {
        name: 'list',
        type: 'Float',
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
  {
    type: 'object',
    name: 'AnotherObject',
    fields: [],
  },
];

export const models = getModels(rawModels);

const permissionsConfig: PermissionsConfig = {
  ADMIN: true,
};

export const permissions = generatePermissions(models, permissionsConfig);
