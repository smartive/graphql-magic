import { ModelDefinitions, Models } from '../../src/models';
import { assertMandatoryFiltersSatisfied } from '../../src/resolvers/filters';
import { printSchemaFromModels } from '../../src/schema/generate';

/**
 * `filterable: { nonNull: true }` encodes "every read states which values it wants" as a non-null
 * field on the plural `XWhere`. That makes the requirement positional: it can only ever be met at
 * the top level, so a query whose `OR` branches genuinely want different value sets has to also
 * state their union at the top level — where it silently intersects every branch.
 *
 * `satisfiableByOr: true` drops the field to nullable and moves the same guarantee to runtime,
 * where it can be met by constraining every branch instead.
 */
describe('satisfiableByOr mandatory filters', () => {
  const statusEnum: ModelDefinitions = [
    { kind: 'enum', name: 'Status', values: ['DRAFT', 'PUBLISHED'] },
    { kind: 'entity', name: 'User', fields: [] },
  ];

  const buildSchema = (extra: ModelDefinitions) => printSchemaFromModels(new Models([...statusEnum, ...extra]));

  const entity = (name: string, satisfiableByOr: boolean): ModelDefinitions => [
    {
      kind: 'entity',
      name,
      queriable: true,
      listQueriable: true,
      fields: [
        {
          name: 'status',
          kind: 'enum',
          type: 'Status',
          filterable: satisfiableByOr ? { nonNull: true, satisfiableByOr: true } : { nonNull: true },
        },
      ],
    },
  ];

  const blockOf = (schema: string, header: string): string => {
    const start = schema.indexOf(header);
    if (start === -1) throw new Error(`Header not found: ${header}.`);
    const end = schema.indexOf('}', start);
    if (end === -1) throw new Error(`Block end not found: ${header}.`);

    return schema.slice(start, end + 1);
  };

  describe('schema generation', () => {
    it('leaves the default (no flag) non-null on XWhere — unchanged behaviour', () => {
      expect(blockOf(buildSchema(entity('Plain', false)), 'input PlainWhere')).toContain('status: [Status!]!');
    });

    it('drops the flagged field to nullable on XWhere', () => {
      const where = blockOf(buildSchema(entity('Flagged', true)), 'input FlaggedWhere');
      expect(where).toContain('status: [Status!]');
      expect(where).not.toContain('status: [Status!]!');
    });

    it('keeps XWhereLookup non-null — a singular lookup has no OR to satisfy it', () => {
      expect(blockOf(buildSchema(entity('Flagged', true)), 'input FlaggedWhereLookup')).toContain('status: [Status!]!');
    });

    it('leaves SubWhere nullable either way', () => {
      expect(blockOf(buildSchema(entity('Plain', false)), 'input PlainSubWhere')).not.toContain('status: [Status!]!');
      expect(blockOf(buildSchema(entity('Flagged', true)), 'input FlaggedSubWhere')).not.toContain('status: [Status!]!');
    });
  });

  describe('runtime enforcement', () => {
    const model = new Models([...statusEnum, ...entity('Flagged', true)]).getModel('Flagged', 'entity');
    const plainModel = new Models([...statusEnum, ...entity('Plain', false)]).getModel('Plain', 'entity');

    it('accepts a top-level constraint', () => {
      expect(() => assertMandatoryFiltersSatisfied(model, { status: ['PUBLISHED'] })).not.toThrow();
    });

    it('accepts an OR whose every branch constrains the field', () => {
      expect(() =>
        assertMandatoryFiltersSatisfied(model, {
          OR: [{ status: ['PUBLISHED'], hidden: [false] }, { id: ['x'], status: ['DRAFT', 'PUBLISHED'] }],
        }),
      ).not.toThrow();
    });

    it('rejects an OR with one unconstrained branch — the hole any value comes back through', () => {
      expect(() =>
        assertMandatoryFiltersSatisfied(model, {
          OR: [{ status: ['PUBLISHED'] }, { id: ['x'] }],
        }),
      ).toThrow(/mandatory filter "status"/);
    });

    it('rejects an empty OR', () => {
      expect(() => assertMandatoryFiltersSatisfied(model, { OR: [] })).toThrow(/mandatory filter "status"/);
    });

    it('rejects a where that omits the field entirely', () => {
      expect(() => assertMandatoryFiltersSatisfied(model, { id: ['x'] })).toThrow(/mandatory filter "status"/);
      expect(() => assertMandatoryFiltersSatisfied(model, undefined)).toThrow(/mandatory filter "status"/);
    });

    it('accepts an AND where a single branch constrains the field — a conjunction binds every row', () => {
      expect(() =>
        assertMandatoryFiltersSatisfied(model, { AND: [{ status: ['PUBLISHED'] }, { id: ['x'] }] }),
      ).not.toThrow();
    });

    it('does not count a constraint that only appears under NOT', () => {
      expect(() => assertMandatoryFiltersSatisfied(model, { NOT: { status: ['DRAFT'] } })).toThrow(
        /mandatory filter "status"/,
      );
    });

    it('nests: an OR branch may itself satisfy the field through its own OR', () => {
      expect(() =>
        assertMandatoryFiltersSatisfied(model, {
          OR: [{ status: ['PUBLISHED'] }, { OR: [{ status: ['DRAFT'] }, { status: ['PUBLISHED'] }] }],
        }),
      ).not.toThrow();
    });

    it('ignores fields without the flag — the schema already guarantees those', () => {
      expect(() => assertMandatoryFiltersSatisfied(plainModel, { id: ['x'] })).not.toThrow();
    });
  });
});
