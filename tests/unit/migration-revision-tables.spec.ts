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

type MockColumn = { name: string; data_type: string; is_nullable: boolean };

const uuid = (name: string, isNullable = false): MockColumn => ({ name, data_type: 'uuid', is_nullable: isNullable });

const USER: ModelDefinitions[number] = { kind: 'entity', name: 'User', fields: [{ name: 'name', type: 'String' }] };

const userColumns: MockColumn[] = [uuid('id'), { name: 'name', data_type: 'character varying', is_nullable: true }];

const createModels = (options: { authorNonNull: boolean; deletable: boolean }): Models =>
  new Models([
    USER,
    {
      kind: 'entity',
      name: 'Product',
      creatable: options.authorNonNull ? true : { createdBy: { nonNull: false } },
      updatable: options.authorNonNull ? true : { updatedBy: { nonNull: false } },
      deletable: options.deletable,
      fields: [{ name: 'title', type: 'String', creatable: true, updatable: true }],
    },
  ]);

const createGenerator = (models: Models, columnsByTable: Record<string, MockColumn[]>) => {
  const knexLike = Object.assign(
    jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }),
    }),
    { raw: jest.fn().mockResolvedValue({ rows: [] }) },
  );

  const generator = new MigrationGenerator({} as never, models);
  (generator as unknown as { schema: unknown }).schema = {
    knex: knexLike,
    tables: jest.fn().mockResolvedValue(Object.keys(columnsByTable)),
    columnInfo: jest.fn(async (table: string) => columnsByTable[table] ?? []),
  };

  return generator;
};

/** A `Product` table as the generator would have created it, so only the revision table is under test. */
const productColumns = ({ authorNonNull, deletable }: { authorNonNull: boolean; deletable: boolean }): MockColumn[] => [
  uuid('id'),
  { name: 'title', data_type: 'character varying', is_nullable: true },
  { name: 'createdAt', data_type: 'timestamp with time zone', is_nullable: false },
  uuid('createdById', !authorNonNull),
  { name: 'updatedAt', data_type: 'timestamp with time zone', is_nullable: false },
  uuid('updatedById', !authorNonNull),
  ...(deletable
    ? [
        { name: 'deleted', data_type: 'boolean', is_nullable: false },
        { name: 'deletedAt', data_type: 'timestamp with time zone', is_nullable: true },
        uuid('deletedById', true),
        { name: 'deleteRootType', data_type: 'character varying', is_nullable: true },
        uuid('deleteRootId', true),
      ]
    : []),
];

const revisionColumns = (overrides: { createdByIdNullable: boolean; deleteRoot: boolean }): MockColumn[] => [
  uuid('id'),
  uuid('productId'),
  uuid('createdById', overrides.createdByIdNullable),
  { name: 'createdAt', data_type: 'timestamp with time zone', is_nullable: false },
  { name: 'deleted', data_type: 'boolean', is_nullable: false },
  ...(overrides.deleteRoot
    ? [{ name: 'deleteRootType', data_type: 'character varying', is_nullable: true }, uuid('deleteRootId', true)]
    : []),
  { name: 'title', data_type: 'character varying', is_nullable: true },
];

describe('createRevisionTable', () => {
  it('makes the revision author non-null when the model does not opt out', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: true }), { User: [] });

    const migration = await generator.generate();

    expect(migration).toContain(`table.uuid('createdById').notNullable();`);
  });

  it('mirrors the model when it declares a nullable createdBy/updatedBy', async () => {
    const generator = createGenerator(createModels({ authorNonNull: false, deletable: true }), { User: [] });

    const migration = await generator.generate();

    expect(migration).toContain(`table.uuid('createdById').nullable();`);
    expect(migration).not.toContain(`table.uuid('createdById').notNullable();`);
  });

  it('keeps `deleted` but not the cascade root, which only ever lives on the entity', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: true }), { User: [] });

    const migration = await generator.generate();
    const revisionTable = migration.slice(migration.indexOf(`createTable('ProductRevision'`));

    expect(revisionTable).toContain(`table.boolean('deleted').notNullable();`);
    expect(revisionTable).not.toContain('deleteRoot');
    // The entity keeps them — this is only about the revision table.
    expect(migration).toContain(`table.string('deleteRootType', undefined)`);
  });
});

describe('syncRevisionPreamble', () => {
  it('relaxes a NOT NULL createdById that contradicts the model', async () => {
    const generator = createGenerator(createModels({ authorNonNull: false, deletable: true }), {
      User: userColumns,
      Product: productColumns({ authorNonNull: false, deletable: true }),
      ProductRevision: revisionColumns({ createdByIdNullable: false, deleteRoot: false }),
    });

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(`table.uuid('createdById').nullable().alter();`);
    expect(migration).toContain(`table.uuid('createdById').notNullable().alter();`);
  });

  it('tightens a nullable createdById when the model requires an author', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: true }), {
      User: userColumns,
      Product: productColumns({ authorNonNull: true, deletable: true }),
      ProductRevision: revisionColumns({ createdByIdNullable: true, deleteRoot: false }),
    });

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(`table.uuid('createdById').notNullable().alter();`);
  });

  it('drops deleteRootType/deleteRootId left behind by an older generator', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: true }), {
      User: userColumns,
      Product: productColumns({ authorNonNull: true, deletable: true }),
      ProductRevision: revisionColumns({ createdByIdNullable: false, deleteRoot: true }),
    });

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(`table.dropColumn('deleteRootType');`);
    expect(migration).toContain(`table.dropColumn('deleteRootId');`);
    expect(migration).toContain(`table.string('deleteRootType');`);
    expect(migration).toContain(`table.uuid('deleteRootId');`);
  });

  it('drops them for a model that is not deletable either', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: false }), {
      User: userColumns,
      Product: productColumns({ authorNonNull: true, deletable: false }),
      ProductRevision: [
        uuid('id'),
        uuid('productId'),
        uuid('createdById'),
        { name: 'createdAt', data_type: 'timestamp with time zone', is_nullable: false },
        { name: 'deleteRootType', data_type: 'character varying', is_nullable: true },
        uuid('deleteRootId', true),
        { name: 'title', data_type: 'character varying', is_nullable: true },
      ],
    });

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(`table.dropColumn('deleteRootType');`);
    expect(migration).toContain(`table.dropColumn('deleteRootId');`);
  });

  it('backfills `deleted` from the entity table instead of defaulting it', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: true }), {
      User: userColumns,
      Product: productColumns({ authorNonNull: true, deletable: true }),
      ProductRevision: [
        uuid('id'),
        uuid('productId'),
        uuid('createdById'),
        { name: 'createdAt', data_type: 'timestamp with time zone', is_nullable: false },
        { name: 'title', data_type: 'character varying', is_nullable: true },
      ],
    });

    const migration = await generator.generate();

    expect(generator.needsMigration).toBe(true);
    expect(migration).toContain(`table.boolean('deleted');`);
    expect(migration).toContain(
      `UPDATE "ProductRevision" SET "deleted" = coalesce((SELECT "deleted" FROM "Product" WHERE "Product"."id" = "ProductRevision"."productId"), false)`,
    );
    expect(migration).toContain(`table.boolean('deleted').notNullable().alter();`);
  });

  it('generates nothing for a revision table that already matches the model', async () => {
    const generator = createGenerator(createModels({ authorNonNull: true, deletable: true }), {
      User: userColumns,
      Product: productColumns({ authorNonNull: true, deletable: true }),
      ProductRevision: revisionColumns({ createdByIdNullable: false, deleteRoot: false }),
    });

    await generator.generate();

    expect(generator.needsMigration).toBe(false);
  });
});
