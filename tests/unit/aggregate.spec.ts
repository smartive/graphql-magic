import { Kind } from 'graphql';
import { ModelDefinitions, Models } from '../../src/models';
import { generateDefinitions } from '../../src/schema/generate';

describe('aggregate schema generation', () => {
  const baseDefinitions: ModelDefinitions = [
    {
      kind: 'entity',
      name: 'User',
      fields: [{ name: 'username', type: 'String' }],
    },
  ];

  it('adds COUNT and configured aggregate operation fields when aggregatable is true', () => {
    const models = new Models([
      ...baseDefinitions,
      {
        kind: 'entity',
        name: 'Invoice',
        listQueriable: true,
        aggregatable: true,
        fields: [
          { name: 'total', type: 'Float', aggregatable: ['sum'] },
          { name: 'quantity', type: 'Int', aggregatable: ['sum'] },
          { name: 'description', type: 'String' },
        ],
      },
    ]);

    const definitions = generateDefinitions(models);
    const aggregateType = definitions.find(
      (definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name?.value === 'InvoiceAggregate',
    );
    expect(aggregateType).toBeDefined();
    expect(aggregateType!.kind).toBe(Kind.OBJECT_TYPE_DEFINITION);

    const fields = (aggregateType as { fields?: readonly { name: { value: string } }[] }).fields ?? [];
    const names = fields.map((field) => field.name.value);
    expect(names).toContain('COUNT');
    expect(names).toContain('total_SUM');
    expect(names).toContain('quantity_SUM');
    expect(names).not.toContain('description_SUM');

    const sumQuantityField = (
      aggregateType as {
        fields?: readonly { name: { value: string }; type?: { kind?: string; name?: { value: string } } }[];
      }
    ).fields?.find((field) => field.name.value === 'quantity_SUM');
    expect(sumQuantityField?.type?.kind).toBe(Kind.NAMED_TYPE);
    expect(sumQuantityField?.type?.name?.value).toBe('Float');

    const aggregateQuery = definitions.find(
      (definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name?.value === 'Query',
    ) as { fields?: readonly { name: { value: string }; arguments?: readonly { name: { value: string } }[] }[] } | undefined;
    const aggregateQueryField = aggregateQuery?.fields?.find((field) => field.name.value === 'invoices_AGGREGATE');
    const argumentNames = aggregateQueryField?.arguments?.map((arg) => arg.name.value) ?? [];
    expect(argumentNames).toEqual(expect.arrayContaining(['where', 'limit', 'offset']));
  });

  it('does not expose aggregate operation fields when aggregatable is disabled', () => {
    const models = new Models([
      ...baseDefinitions,
      {
        kind: 'entity',
        name: 'Order',
        listQueriable: true,
        aggregatable: false,
        fields: [
          { name: 'subtotal', type: 'Float', aggregatable: ['sum'] },
          { name: 'tax', type: 'Float' },
        ],
      },
    ]);

    const definitions = generateDefinitions(models);
    const aggregateType = definitions.find(
      (definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name?.value === 'OrderAggregate',
    );
    expect(aggregateType).toBeUndefined();
  });

  it('does not expose aggregate query when listQueriable is disabled', () => {
    const models = new Models([
      ...baseDefinitions,
      {
        kind: 'entity',
        name: 'Holding',
        listQueriable: false,
        aggregatable: true,
        fields: [{ name: 'amount', type: 'Float', aggregatable: ['sum'] }],
      },
    ]);

    const definitions = generateDefinitions(models);
    const queryType = definitions.find(
      (definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name?.value === 'Query',
    ) as { fields?: readonly { name: { value: string } }[] } | undefined;
    const queryFieldNames = queryType?.fields?.map((field) => field.name.value) ?? [];
    expect(queryFieldNames).not.toContain('holdings_AGGREGATE');
  });

  it('throws if field defines unsupported aggregate operation for its type', () => {
    const models = new Models([
      ...baseDefinitions,
      {
        kind: 'entity',
        name: 'Payment',
        listQueriable: true,
        aggregatable: true,
        fields: [{ name: 'code', type: 'String', aggregatable: ['sum'] }],
      },
    ]);

    expect(() => generateDefinitions(models)).toThrow('Field "Payment.code" does not support aggregate operation "sum".');
  });
});
