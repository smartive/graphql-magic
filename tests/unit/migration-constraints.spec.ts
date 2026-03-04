import { MigrationGenerator } from '../../src/migrations/generate';
import { ModelDefinitions, Models } from '../../src/models';

jest.mock('knex-schema-inspector', () => ({
  SchemaInspector: jest.fn(() => ({})),
}));

jest.mock('code-block-writer', () => {
  const Writer = class {
    private output = '';

    write(value: string) {
      this.output += value;
      return this;
    }

    writeLine(value: string) {
      this.output += `${value}\n`;
      return this;
    }

    blankLine() {
      this.output += '\n';
      return this;
    }

    newLine() {
      this.output += '\n';
      return this;
    }

    inlineBlock(fn: () => void) {
      this.output += ' {\n';
      fn();
      this.output += '}';
      return this;
    }

    block(fn: () => void) {
      this.output += ' {\n';
      fn();
      this.output += '}\n';
      return this;
    }

    toString() {
      return this.output;
    }
  };

  return { __esModule: true, default: { default: Writer } };
});

type MockColumn = {
  name: string;
  data_type: string;
  is_nullable: boolean;
  generation_expression?: string | null;
  numeric_precision?: number | null;
  numeric_scale?: number | null;
  max_length?: number | null;
};

type CheckRow = {
  table_name: string;
  constraint_name: string;
  check_clause: string;
};

const normalizeForCanonicalizationMock = (expr: string) => {
  let normalized = expr.replace(/\s+/g, ' ').trim();
  while (normalized.startsWith('(') && normalized.endsWith(')')) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized.replace(/"([a-z_][a-z0-9_]*)"/g, '$1');
};

const baseColumnsByTable: Record<string, MockColumn[]> = {
  Product: [
    { name: 'id', data_type: 'uuid', is_nullable: false },
    { name: 'deleted', data_type: 'boolean', is_nullable: true },
    { name: 'startDate', data_type: 'timestamp without time zone', is_nullable: true },
    { name: 'endDate', data_type: 'timestamp without time zone', is_nullable: true },
    { name: 'score', data_type: 'integer', is_nullable: true },
  ],
};

const createProductModels = (constraints: { kind: 'check'; name: string; expression: string }[]) => {
  const definitions: ModelDefinitions = [
    {
      kind: 'entity',
      name: 'Product',
      fields: [{ name: 'score', type: 'Int' }],
      constraints,
    },
  ];

  return new Models(definitions);
};

const createGenerator = (rows: CheckRow[], models: Models) => {
  const raw = jest
    .fn()
    .mockResolvedValueOnce({ rows })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValue({ rows: [] });
  const knexLike = Object.assign(
    jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      }),
    }),
    { raw },
  );

  const schema = {
    knex: knexLike,
    tables: jest.fn().mockResolvedValue(['Product']),
    columnInfo: jest.fn(async (table: string) => baseColumnsByTable[table] ?? []),
  };

  const generator = new MigrationGenerator({} as never, models);
  (generator as unknown as { schema: unknown }).schema = schema;

  return generator;
};

describe('MigrationGenerator check constraints', () => {
  beforeEach(() => {
    jest
      .spyOn(MigrationGenerator.prototype as any, 'canonicalizeCheckExpressionWithPostgres')
      .mockImplementation(async (...args: unknown[]) => normalizeForCanonicalizationMock(args[1] as string));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not detect changes for equivalent expressions with extra parentheses', async () => {
    const models = createProductModels([{ kind: 'check', name: 'score_non_negative', expression: '"score" >= 0' }]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_score_non_negative_check_0',
          check_clause: ' (( "score"   >=   0 )) ',
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('does not detect changes for equivalent expressions with quoted vs unquoted lowercase identifiers', async () => {
    jest
      .spyOn(MigrationGenerator.prototype as any, 'canonicalizeCheckExpressionWithPostgres')
      .mockImplementation(
        async () => '(deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate")',
      );
    const models = new Models([
      {
        kind: 'entity',
        name: 'Product',
        fields: [
          { name: 'deleted', type: 'Boolean' },
          { name: 'startDate', type: 'DateTime' },
          { name: 'endDate', type: 'DateTime' },
        ],
        constraints: [
          {
            kind: 'check',
            name: 'period_start_before_end',
            expression: '"deleted" = true OR "endDate" IS NULL OR "startDate" <= "endDate"',
          },
        ],
      },
    ]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_period_start_before_end_check_0',
          check_clause: '((deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate"))',
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('does not detect changes if only generated constraint index changed but expression is identical', async () => {
    const models = createProductModels([
      { kind: 'check', name: 'first', expression: '"score" >= 0' },
      { kind: 'check', name: 'second', expression: '"score" <= 100' },
    ]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_first_check_1',
          check_clause: '(("score" >= 0))',
        },
        {
          table_name: 'Product',
          constraint_name: 'Product_second_check_0',
          check_clause: '(("score" <= 100))',
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('still detects actual expression changes', async () => {
    const models = createProductModels([{ kind: 'check', name: 'score_non_negative', expression: '"score" >= 0' }]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_score_non_negative_check_0',
          check_clause: '"score" > 0',
        },
      ],
      models,
    );

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain('DROP CONSTRAINT "Product_score_non_negative_check_0"');
    expect(migration).toContain('ADD CONSTRAINT "Product_score_non_negative_check_0" CHECK ("score" >= 0)');
  });

  it('warns and treats constraint as changed when canonicalization fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest
      .spyOn(MigrationGenerator.prototype as any, 'canonicalizeCheckExpressionWithPostgres')
      .mockRejectedValue(new Error('canonicalization failed'));
    const models = createProductModels([{ kind: 'check', name: 'score_non_negative', expression: '"score" >= 0' }]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_score_non_negative_check_0',
          check_clause: '"score" >= 0',
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('MigrationGenerator exclude constraints', () => {
  const excludeModels = new Models([
    {
      kind: 'entity',
      name: 'PortfolioAllocation',
      updatable: false,
      fields: [
        { name: 'portfolioId', type: 'UUID' },
        { name: 'startDate', type: 'DateTime' },
        { name: 'endDate', type: 'DateTime' },
        { name: 'deleted', type: 'Boolean' },
      ],
      constraints: [
        {
          kind: 'exclude' as const,
          name: 'no_overlap_per_portfolio',
          using: 'gist' as const,
          elements: [
            { column: 'portfolioId', operator: '=' as const },
            {
              expression: 'tstzrange("startDate", COALESCE("endDate", \'infinity\'::timestamptz))',
              operator: '&&' as const,
            },
          ],
          where: '"deleted" = false',
          deferrable: 'INITIALLY DEFERRED' as const,
        },
      ],
    },
  ]);

  it('normalizes equivalent EXCLUDE defs (type alias, WHERE parens, identifier quoting)', () => {
    const dbDef = `EXCLUDE USING gist ("portfolioId" WITH =, tstzrange("startDate", COALESCE("endDate", 'infinity'::timestamp with time zone)) WITH &&) WHERE ((deleted = false)) DEFERRABLE INITIALLY DEFERRED`;
    const modelDef = `EXCLUDE USING gist ("portfolioId" WITH =, tstzrange("startDate", COALESCE("endDate", 'infinity'::timestamptz)) WITH &&) WHERE ("deleted" = false) DEFERRABLE INITIALLY DEFERRED`;
    const gen = new MigrationGenerator({} as never, excludeModels);
    const norm1 = (gen as any).normalizeExcludeDef(dbDef);
    const norm2 = (gen as any).normalizeExcludeDef(modelDef);
    expect(norm1).toBe(norm2);
  });
});

describe('MigrationGenerator canonicalizeCheckExpressionWithPostgres', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates temp table using LIKE source table shape', async () => {
    const raw = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            constraint_definition: 'CHECK (((deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate")))',
          },
        ],
      });
    const rollback = jest.fn().mockResolvedValue(undefined);
    const trx = { raw, rollback };
    const knexLike = {
      transaction: jest.fn().mockResolvedValue(trx),
    };
    const generator = new MigrationGenerator(knexLike as never, createProductModels([]));

    const canonical = await (generator as any).canonicalizeCheckExpressionWithPostgres(
      'RevenueSplit',
      '((deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate"))',
    );

    const createTempSql = raw.mock.calls[0]?.[0] as string;
    expect(createTempSql).toContain('CREATE TEMP TABLE');
    expect(createTempSql).toContain('(LIKE "RevenueSplit")');
    expect(createTempSql).not.toContain('gqm_check_value');
    expect(canonical).toBe('(deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate")');
    expect(rollback).toHaveBeenCalled();
  });
});
