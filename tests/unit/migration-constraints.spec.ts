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
  constraint_def: string;
  convalidated: boolean;
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

const createProductModels = (constraints: { kind: 'check'; name: string; expression: string; notValid?: boolean }[]) => {
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
          constraint_name: 'Product_score_non_negative_check',
          constraint_def: 'CHECK ( (( "score"   >=   0 )) )',
          convalidated: true,
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
      .mockImplementation(async () => '(deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate")');
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
          constraint_name: 'Product_period_start_before_end_check',
          constraint_def: 'CHECK (((deleted = true) OR ("endDate" IS NULL) OR ("startDate" <= "endDate")))',
          convalidated: true,
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('does not detect changes when the stable constraint names and expressions match', async () => {
    const models = createProductModels([
      { kind: 'check', name: 'first', expression: '"score" >= 0' },
      { kind: 'check', name: 'second', expression: '"score" <= 100' },
    ]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_first_check',
          constraint_def: 'CHECK ((("score" >= 0)))',
          convalidated: true,
        },
        {
          table_name: 'Product',
          constraint_name: 'Product_second_check',
          constraint_def: 'CHECK ((("score" <= 100)))',
          convalidated: true,
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('detects a needed migration when a constraint still carries the legacy positional suffix', async () => {
    // Constraint names no longer carry a positional suffix, so a legacy `_{index}`-named constraint is
    // NOT matched to its model entry — it must be renamed (see generate-constraint-rename-migration).
    const models = createProductModels([{ kind: 'check', name: 'first', expression: '"score" >= 0' }]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_first_check_0',
          constraint_def: 'CHECK ((("score" >= 0)))',
          convalidated: true,
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(true);
  });

  it('still detects actual expression changes', async () => {
    const models = createProductModels([{ kind: 'check', name: 'score_non_negative', expression: '"score" >= 0' }]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_score_non_negative_check',
          constraint_def: 'CHECK (("score" > 0))',
          convalidated: true,
        },
      ],
      models,
    );

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain('DROP CONSTRAINT "Product_score_non_negative_check"');
    expect(migration).toContain('ADD CONSTRAINT "Product_score_non_negative_check" CHECK ("score" >= 0)');
  });

  it('appends NOT VALID when notValid is true', async () => {
    const models = createProductModels([
      { kind: 'check', name: 'score_non_negative', expression: '"score" >= 0', notValid: true },
    ]);
    const generator = createGenerator([], models);

    const migration = await generator.generate();

    expect(migration).toContain('ADD CONSTRAINT "Product_score_non_negative_check" CHECK ("score" >= 0) NOT VALID');
  });

  it('detects when notValid has changed', async () => {
    const models = createProductModels([
      { kind: 'check', name: 'score_non_negative', expression: '"score" >= 0', notValid: true },
    ]);
    const generator = createGenerator(
      [
        {
          table_name: 'Product',
          constraint_name: 'Product_score_non_negative_check',
          constraint_def: 'CHECK (("score" >= 0))',
          convalidated: true,
        },
      ],
      models,
    );

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain('DROP CONSTRAINT "Product_score_non_negative_check"');
    expect(migration).toContain('ADD CONSTRAINT "Product_score_non_negative_check" CHECK ("score" >= 0) NOT VALID');
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
          constraint_name: 'Product_score_non_negative_check',
          constraint_def: 'CHECK (("score" >= 0))',
          convalidated: true,
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

describe('MigrationGenerator constraint name length', () => {
  it('throws when generated constraint name exceeds PostgreSQL identifier limit', async () => {
    const models = createProductModels([
      {
        kind: 'check',
        name: 'a'.repeat(50),
        expression: '"score" >= 0',
      },
    ]);
    const generator = createGenerator([], models);

    await expect(generator.generate()).rejects.toThrow(
      /Generated constraint name "Product_.*_check" \(6\d characters\) exceeds PostgreSQL's maximum identifier length of 63 characters/,
    );
  });
});

describe('MigrationGenerator duplicate constraint names', () => {
  it('throws when two constraints on the same table produce the same name', async () => {
    // Without a positional suffix, two entries with the same name + kind collide on one Postgres object.
    const models = createProductModels([
      { kind: 'check', name: 'score_bound', expression: '"score" >= 0' },
      { kind: 'check', name: 'score_bound', expression: '"score" <= 100' },
    ]);
    const generator = createGenerator([], models);

    await expect(generator.generate()).rejects.toThrow(
      /Duplicate constraint name "Product_score_bound_check" on model "Product"/,
    );
  });
});

describe('MigrationGenerator constraint_trigger validation', () => {
  const triggerModels = new Models([
    {
      kind: 'entity',
      name: 'PortfolioAllocation',
      fields: [
        { name: 'portfolioId', type: 'UUID' },
        { name: 'startDate', type: 'DateTime' },
        { name: 'endDate', type: 'DateTime' },
      ],
      constraints: [
        {
          kind: 'constraint_trigger' as const,
          name: 'contiguous_periods',
          when: 'AFTER' as const,
          events: ['INSERT', 'UPDATE'] as const,
          forEach: 'ROW' as const,
          deferrable: 'INITIALLY DEFERRED' as const,
          function: { name: 'contiguous_periods_check' },
        },
      ],
    },
  ]);

  const parsedFunctionsWithMatch = [
    { name: 'contiguous_periods_check', signature: '', body: '', fullDefinition: '', isAggregate: false },
  ];

  const parsedFunctionsWithoutMatch = [
    { name: 'other_function', signature: '', body: '', fullDefinition: '', isAggregate: false },
  ];

  const createTriggerGenerator = (
    parsedFunctions: { name: string; signature: string; body: string; fullDefinition: string; isAggregate: boolean }[],
  ) => {
    const raw = jest.fn().mockResolvedValue({ rows: [] });
    const knexMock = Object.assign(
      jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }),
      }),
      { raw },
    );
    const generator = new MigrationGenerator(knexMock as never, triggerModels, parsedFunctions);
    (generator as unknown as { schema: unknown }).schema = {
      knex: knexMock,
      tables: jest.fn().mockResolvedValue([]),
      columnInfo: jest.fn().mockResolvedValue([]),
    };
    return generator;
  };

  it('throws when function is not defined in functions.ts', async () => {
    const generator = createTriggerGenerator(parsedFunctionsWithoutMatch);
    await expect(generator.generate()).rejects.toThrow(
      /Constraint trigger "contiguous_periods" on model PortfolioAllocation references function "contiguous_periods_check" which is not defined in functions.ts/,
    );
  });

  it('throws when functions.ts is empty or missing', async () => {
    const generator = createTriggerGenerator([]);
    await expect(generator.generate()).rejects.toThrow(
      /references function "contiguous_periods_check" which must be defined in functions.ts/,
    );
  });

  it('does not throw when function is defined in functions.ts', async () => {
    const generator = createTriggerGenerator(parsedFunctionsWithMatch);
    await expect(generator.generate()).resolves.not.toThrow();
  });
});

describe('MigrationGenerator trigger (regular, non-constraint)', () => {
  // A realistic function definition so handleFunctions() considers it already present and unchanged,
  // isolating these tests to the trigger wiring (otherwise a CREATE FUNCTION would flip needsMigration).
  const FN_DEFINITION =
    'CREATE FUNCTION mirror_user_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$';
  const FN_BODY = 'BEGIN RETURN NEW; END;';
  const parsedFunctions = [
    {
      name: 'mirror_user_status',
      signature: 'mirror_user_status()',
      body: FN_BODY,
      fullDefinition: FN_DEFINITION,
      isAggregate: false,
    },
  ];
  // Row shape returned by getDatabaseFunctions' regular-function query (pg_get_functiondef ...).
  const dbFunctionRow = {
    name: 'mirror_user_status',
    arguments: '',
    definition: FN_DEFINITION,
    is_aggregate: false,
  };

  const createTriggerModels = (
    overrides: {
      when?: 'AFTER' | 'BEFORE';
      events?: readonly ('INSERT' | 'UPDATE' | 'DELETE')[];
      forEach?: 'ROW' | 'STATEMENT';
      args?: readonly string[];
    } = {},
  ) =>
    new Models([
      {
        kind: 'entity',
        name: 'Customer',
        updatable: false,
        fields: [
          { name: 'userId', type: 'UUID' },
          { name: 'status', type: 'String' },
        ],
        constraints: [
          {
            kind: 'trigger' as const,
            name: 'mirror_status',
            when: overrides.when ?? ('AFTER' as const),
            events: overrides.events ?? (['INSERT', 'UPDATE'] as const),
            forEach: overrides.forEach ?? ('ROW' as const),
            function: { name: 'mirror_user_status', args: overrides.args },
          },
        ],
      },
    ]);

  // Routes the setup queries in generate() by inspecting the SQL so order is irrelevant.
  // `plainTriggerRows` is returned for the regular-trigger query (the one that joins pg_trigger
  // directly and filters tgconstraint = 0).
  const createTriggerGenerator = (
    models: Models,
    plainTriggerRows: { table_name: string; trigger_name: string; trigger_def: string }[],
    tablesExist: boolean,
  ) => {
    const raw = jest.fn((sql: string) => {
      if (typeof sql === 'string' && sql.includes('tgconstraint = 0')) {
        return Promise.resolve({ rows: plainTriggerRows });
      }
      // getDatabaseFunctions' regular-function query: report mirror_user_status as already present
      // and unchanged so handleFunctions() does not emit a CREATE FUNCTION.
      if (typeof sql === 'string' && sql.includes('pg_get_functiondef')) {
        return Promise.resolve({ rows: [dbFunctionRow] });
      }
      return Promise.resolve({ rows: [] });
    });
    const knexLike = Object.assign(
      jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }),
      }),
      { raw },
    );
    const schema = {
      knex: knexLike,
      tables: jest.fn().mockResolvedValue(tablesExist ? ['Customer'] : []),
      columnInfo: jest.fn(async () =>
        tablesExist
          ? [
              { name: 'id', data_type: 'uuid', is_nullable: false },
              { name: 'userId', data_type: 'uuid', is_nullable: true },
              { name: 'status', data_type: 'text', is_nullable: true },
            ]
          : [],
      ),
    };
    const generator = new MigrationGenerator(knexLike as never, models, parsedFunctions);
    (generator as unknown as { schema: unknown }).schema = schema;
    return generator;
  };

  // pg_get_triggerdef output for the trigger defined by createTriggerModels (default options).
  const dbTriggerDef =
    'CREATE TRIGGER "Customer_mirror_status_trigger" AFTER INSERT OR UPDATE ON public."Customer" FOR EACH ROW EXECUTE FUNCTION mirror_user_status()';

  it('creates a CREATE TRIGGER when none exists (existing table)', async () => {
    const generator = createTriggerGenerator(createTriggerModels(), [], true);
    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(
      'CREATE TRIGGER "Customer_mirror_status_trigger" AFTER INSERT OR UPDATE ON "Customer" FOR EACH ROW EXECUTE FUNCTION mirror_user_status()',
    );
    expect(migration).not.toContain('CREATE CONSTRAINT TRIGGER');
    expect(migration).not.toContain('DEFERRABLE');
    // down drops it
    expect(migration).toContain('DROP TRIGGER IF EXISTS "Customer_mirror_status_trigger" ON "Customer"');
  });

  it('does not detect changes when the trigger already matches (idempotent)', async () => {
    const generator = createTriggerGenerator(
      createTriggerModels(),
      [{ table_name: 'Customer', trigger_name: 'Customer_mirror_status_trigger', trigger_def: dbTriggerDef }],
      true,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('is idempotent regardless of event ordering in the existing def', async () => {
    const generator = createTriggerGenerator(
      createTriggerModels({ events: ['UPDATE', 'INSERT'] }),
      [{ table_name: 'Customer', trigger_name: 'Customer_mirror_status_trigger', trigger_def: dbTriggerDef }],
      true,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('detects a change to the trigger definition (drops + recreates)', async () => {
    const generator = createTriggerGenerator(
      // Model now also fires on DELETE -> differs from the stored def.
      createTriggerModels({ events: ['INSERT', 'UPDATE', 'DELETE'] }),
      [{ table_name: 'Customer', trigger_name: 'Customer_mirror_status_trigger', trigger_def: dbTriggerDef }],
      true,
    );

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain('DROP TRIGGER IF EXISTS "Customer_mirror_status_trigger" ON "Customer"');
    expect(migration).toContain(
      'CREATE TRIGGER "Customer_mirror_status_trigger" AFTER INSERT OR UPDATE OR DELETE ON "Customer" FOR EACH ROW EXECUTE FUNCTION mirror_user_status()',
    );
  });

  it('emits the trigger when the table itself is being created', async () => {
    const generator = createTriggerGenerator(createTriggerModels(), [], false);

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(
      'CREATE TRIGGER "Customer_mirror_status_trigger" AFTER INSERT OR UPDATE ON "Customer" FOR EACH ROW EXECUTE FUNCTION mirror_user_status()',
    );
  });

  it('throws when the referenced function is not defined', async () => {
    const generator = createTriggerGenerator(createTriggerModels(), [], true);
    (generator as unknown as { parsedFunctions: unknown }).parsedFunctions = [
      { name: 'other_fn', signature: '', body: '', fullDefinition: '', isAggregate: false },
    ];

    await expect(generator.generate()).rejects.toThrow(
      /Trigger "mirror_status" on model Customer references function "mirror_user_status" which is not defined in functions.ts/,
    );
  });
});

describe('MigrationGenerator unique constraints', () => {
  type UniqueIndexRow = { table_name: string; index_name: string; index_def: string };

  const createUniqueModels = (constraints: { kind: 'unique'; name: string; fields: readonly string[]; where?: string }[]) =>
    new Models([
      {
        kind: 'entity',
        name: 'Product',
        fields: [
          { name: 'deleted', type: 'Boolean' },
          { name: 'startDate', type: 'DateTime' },
          { name: 'endDate', type: 'DateTime' },
        ],
        constraints,
      },
    ]);

  // Route the setup queries in generate() by inspecting the SQL (order-independent, so it
  // stays correct as new reflection queries are added). The existing unique indexes come
  // from the query that selects `pg_get_indexdef` over `indisunique` indexes.
  const createUniqueGenerator = (uniqueRows: UniqueIndexRow[], models: Models) => {
    const raw = jest.fn((sql: string) => {
      if (typeof sql === 'string' && sql.includes('indisunique')) {
        return Promise.resolve({ rows: uniqueRows });
      }
      return Promise.resolve({ rows: [] });
    });
    const knexLike = Object.assign(
      jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }),
      }),
      { raw },
    );
    const generator = new MigrationGenerator({} as never, models);
    (generator as unknown as { schema: unknown }).schema = {
      knex: knexLike,
      tables: jest.fn().mockResolvedValue(['Product']),
      columnInfo: jest.fn(async (table: string) => baseColumnsByTable[table] ?? []),
    };

    return generator;
  };

  it('emits a partial CREATE UNIQUE INDEX when the index is missing', async () => {
    const models = createUniqueModels([
      { kind: 'unique', name: 'start_end', fields: ['startDate', 'endDate'], where: '"deleted" = false' },
    ]);
    const generator = createUniqueGenerator([], models);

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Product_start_end_unique" ON "Product" ("startDate", "endDate") WHERE "deleted" = false',
    );
    expect(migration).toContain('DROP INDEX IF EXISTS "Product_start_end_unique"');
  });

  it('emits a non-partial unique index when no where is given', async () => {
    const models = createUniqueModels([{ kind: 'unique', name: 'start_end', fields: ['startDate', 'endDate'] }]);
    const generator = createUniqueGenerator([], models);

    const migration = await generator.generate();

    expect(migration).toContain('CREATE UNIQUE INDEX "Product_start_end_unique" ON "Product" ("startDate", "endDate")');
    expect(migration).not.toContain('Product_start_end_unique" ON "Product" ("startDate", "endDate") WHERE');
  });

  it('detects no change when the existing partial index matches (pg_get_indexdef shape)', async () => {
    const models = createUniqueModels([
      { kind: 'unique', name: 'start_end', fields: ['startDate', 'endDate'], where: '"deleted" = false' },
    ]);
    const generator = createUniqueGenerator(
      [
        {
          table_name: 'Product',
          index_name: 'Product_start_end_unique',
          index_def:
            'CREATE UNIQUE INDEX "Product_start_end_unique" ON public."Product" USING btree ("startDate", "endDate") WHERE (deleted = false)',
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });

  it('detects a change when the column set differs', async () => {
    const models = createUniqueModels([
      { kind: 'unique', name: 'start_end', fields: ['startDate', 'endDate'], where: '"deleted" = false' },
    ]);
    const generator = createUniqueGenerator(
      [
        {
          table_name: 'Product',
          index_name: 'Product_start_end_unique',
          index_def:
            'CREATE UNIQUE INDEX "Product_start_end_unique" ON public."Product" USING btree ("startDate") WHERE (deleted = false)',
        },
      ],
      models,
    );

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain('DROP INDEX IF EXISTS "Product_start_end_unique"');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Product_start_end_unique" ON "Product" ("startDate", "endDate") WHERE "deleted" = false',
    );
  });

  it('detects a change when only the partial predicate differs', async () => {
    const models = createUniqueModels([
      { kind: 'unique', name: 'start_end', fields: ['startDate', 'endDate'], where: '"deleted" = false' },
    ]);
    const generator = createUniqueGenerator(
      [
        {
          table_name: 'Product',
          index_name: 'Product_start_end_unique',
          index_def:
            'CREATE UNIQUE INDEX "Product_start_end_unique" ON public."Product" USING btree ("startDate", "endDate")',
        },
      ],
      models,
    );

    await generator.generate();

    expect(generator.needsMigration).toBe(true);
  });

  it('throws when a unique constraint references a non-existent column', () => {
    expect(() => createUniqueModels([{ kind: 'unique', name: 'bad', fields: ['startDate', 'nope'] }])).toThrow(
      /Unique constraint "bad" references column "nope" which does not exist on model Product/,
    );
  });

  it('throws when a unique constraint references no columns', () => {
    expect(() => createUniqueModels([{ kind: 'unique', name: 'empty', fields: [] }])).toThrow(
      /Unique constraint "empty" on model Product must reference at least one column/,
    );
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
