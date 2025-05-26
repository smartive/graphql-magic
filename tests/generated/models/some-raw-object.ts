export const SomeRawObjectFieldField = {
  kind: 'primitive',
  name: 'field',
  type: 'String',
  description: undefined,
  list: false,
  nonNull: false,
  defaultValue: undefined,
  args: [undefined],
  directives: [undefined],
} as const;
export const SomeRawObjectModel = {
  kind: 'object',
  name: 'SomeRawObject',
  plural: 'SomeRawObjects',
  description: undefined,
  fields: [SomeRawObjectFieldField],
  fieldsByName: {
    field: SomeRawObjectFieldField,
  },
} as const;

