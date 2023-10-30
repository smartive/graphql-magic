import { ModelDefinitions, Models } from '../../src/models';
import { PermissionsConfig, generatePermissions } from '../../src/permissions/generate';

const modelDefinitions: ModelDefinitions = [
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
    kind: 'object',
    fields: [{ name: 'field', type: 'String' }],
  },

  {
    kind: 'entity',
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
    kind: 'entity',
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
      },
    ],
  },
  {
    kind: 'entity',
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
        name: 'float',
        type: 'Float',
        scale: 1,
        precision: 1,
        nonNull: true,
      },
      {
        kind: 'enum',
        name: 'list',
        type: 'SomeEnum',
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
    kind: 'entity',
    root: true,
    name: 'Reaction',
    queriable: true,
    listQueriable: true,
    creatable: true,
    updatable: true,
    deletable: true,
    fields: [
      {
        name: 'parent',
        kind: 'relation',
        reverse: 'childReactions',
        type: 'Reaction',
      },
      {
        name: 'content',
        type: 'String',
        creatable: true,
        updatable: true,
      },
    ],
  },
  {
    kind: 'entity',
    parent: 'Reaction',
    name: 'Review',
    fields: [
      {
        name: 'rating',
        type: 'Float',
        comparable: true,
        creatable: true,
        updatable: true,
      },
    ],
  },
  {
    kind: 'entity',
    parent: 'Reaction',
    name: 'Question',
    fields: [],
  },
  {
    kind: 'entity',
    parent: 'Reaction',
    name: 'Answer',
    fields: [],
  },
];

export const models = new Models(modelDefinitions);

const permissionsConfig: PermissionsConfig = {
  ADMIN: true,
};

export const permissions = generatePermissions(models, permissionsConfig);
