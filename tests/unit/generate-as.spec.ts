import { Kind } from 'graphql';
import { generateDBModels } from '../../src/db/generate';
import {
  isGenerateAsField,
  isStoredInDatabase,
} from '../../src/models/utils';
import { ModelDefinitions, Models } from '../../src/models';
import type { EntityField } from '../../src/models/models';
import { generateDefinitions } from '../../src/schema/generate';

jest.mock('ode-block-writer', () => {
  const Writer = class {
    private _out = '';

    write(s: string) {
      this._out += s;
      return this;
    }

    blankLine() {
      this._out += '\n';
      return this;
    }

    newLine() {
      this._out += '\n';
      return this;
    }

    inlineBlock(fn: () => void) {
      this._out += ' {\n';
      fn();
      this._out += '}';
      return this;
    }

    toString() {
      return this._out;
    }
  };
  return { __esModule: true, default: { default: Writer } };
});

describe('generateAs helpers', () => {
  describe('isGenerateAsField', () => {
    it('returns false when field.generateAs is undefined', () => {
      const field: EntityField = { name: 'price', type: 'Float' };
      expect(isGenerateAsField(field)).toBe(false);
    });

    it('returns true when field has generateAs with type expression', () => {
      const field: EntityField = {
        name: 'total',
        type: 'Float',
        generateAs: { expression: 'price * quantity', type: 'expression' },
      };
      expect(isGenerateAsField(field)).toBe(true);
    });

    it('returns true when field has generateAs with type stored', () => {
      const field: EntityField = {
        name: 'total',
        type: 'Float',
        generateAs: { expression: 'price * quantity', type: 'stored' },
      };
      expect(isGenerateAsField(field)).toBe(true);
    });

    it('returns true when field has generateAs with type virtual', () => {
      const field: EntityField = {
        name: 'total',
        type: 'Float',
        generateAs: { expression: 'price * quantity', type: 'virtual' },
      };
      expect(isGenerateAsField(field)).toBe(true);
    });
  });

  describe('isStoredInDatabase', () => {
    it('returns true when field has no generateAs (normal column)', () => {
      const field: EntityField = { name: 'price', type: 'Float' };
      expect(isStoredInDatabase(field)).toBe(true);
    });

    it('returns false when field has generateAs.type expression', () => {
      const field: EntityField = {
        name: 'total',
        type: 'Float',
        generateAs: { expression: 'price * quantity', type: 'expression' },
      };
      expect(isStoredInDatabase(field)).toBe(false);
    });

    it('returns true when field has generateAs.type stored', () => {
      const field: EntityField = {
        name: 'total',
        type: 'Float',
        generateAs: { expression: 'price * quantity', type: 'stored' },
      };
      expect(isStoredInDatabase(field)).toBe(true);
    });

    it('returns true when field has generateAs.type virtual', () => {
      const field: EntityField = {
        name: 'total',
        type: 'Float',
        generateAs: { expression: 'price * quantity', type: 'virtual' },
      };
      expect(isStoredInDatabase(field)).toBe(true);
    });
  });
});

describe('generateDBModels', () => {
  const productModelDefinitions: ModelDefinitions = [
    {
      kind: 'entity',
      name: 'Product',
      fields: [
        { name: 'price', type: 'Float' },
        { name: 'quantity', type: 'Int' },
        {
          name: 'totalExpression',
          type: 'Float',
          generateAs: { expression: 'price * quantity', type: 'expression' },
        },
        {
          name: 'totalStored',
          type: 'Float',
          generateAs: { expression: 'price * quantity', type: 'stored' },
        },
      ],
    },
  ];

  it('entity type includes normal and stored columns but not expression-only fields', () => {
    const models = new Models(productModelDefinitions);
    const output = generateDBModels(models, 'luxon');

    expect(output).toContain("'price'");
    expect(output).toContain("'quantity'");
    expect(output).toContain("'totalStored'");
    expect(output).not.toContain("'totalExpression'");
  });

  it('Initializer includes only user-settable fields (excludes all generateAs)', () => {
    const models = new Models(productModelDefinitions);
    const output = generateDBModels(models, 'luxon');

    const start = output.indexOf('export type ProductInitializer');
    const end = output.indexOf('export type', start + 1);
    const block = end === -1 ? output.slice(start) : output.slice(start, end);
    expect(block).toContain("'price'");
    expect(block).toContain("'quantity'");
    expect(block).not.toContain("'totalExpression'");
    expect(block).not.toContain("'totalStored'");
  });

  it('Mutator includes only user-settable fields (excludes all generateAs)', () => {
    const models = new Models(productModelDefinitions);
    const output = generateDBModels(models, 'luxon');

    const start = output.indexOf('export type ProductMutator');
    const end = output.indexOf('export type', start + 1);
    const block = end === -1 ? output.slice(start) : output.slice(start, end);
    expect(block).toContain("'price'");
    expect(block).toContain("'quantity'");
    expect(block).not.toContain("'totalExpression'");
    expect(block).not.toContain("'totalStored'");
  });

  it('Seed type excludes all generateAs fields', () => {
    const models = new Models(productModelDefinitions);
    const output = generateDBModels(models, 'luxon');

    const start = output.indexOf('export type ProductSeed');
    const end = output.indexOf('export type', start + 1);
    const block = end === -1 ? output.slice(start) : output.slice(start, end);
    expect(block).toContain("'price'");
    expect(block).toContain("'quantity'");
    expect(block).not.toContain("'totalExpression'");
    expect(block).not.toContain("'totalStored'");
  });
});

describe('generateDefinitions Create/Update inputs', () => {
  const itemModelDefinitions: ModelDefinitions = [
    { kind: 'entity', name: 'User', fields: [{ name: 'id', type: 'ID' }] },
    {
      kind: 'entity',
      name: 'Item',
      creatable: true,
      updatable: true,
      fields: [
        { name: 'name', type: 'String', creatable: true, updatable: true },
        {
          name: 'computed',
          type: 'Int',
          creatable: true,
          updatable: true,
          generateAs: { expression: '1', type: 'expression' },
        },
      ],
    },
  ];

  it('Create input does not include generateAs fields', () => {
    const models = new Models(itemModelDefinitions);
    const definitions = generateDefinitions(models);

    const createInput = definitions.find(
      (d) => d.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION && d.name?.value === 'CreateItem',
    );
    expect(createInput).toBeDefined();
    expect(createInput!.kind).toBe(Kind.INPUT_OBJECT_TYPE_DEFINITION);

    const fields = (createInput as { fields?: readonly { name: { value: string } }[] }).fields ?? [];
    const fieldNames = fields.map((f) => f.name.value);
    expect(fieldNames).toContain('name');
    expect(fieldNames).not.toContain('computed');
  });

  it('Update input does not include generateAs fields', () => {
    const models = new Models(itemModelDefinitions);
    const definitions = generateDefinitions(models);

    const updateInput = definitions.find(
      (d) => d.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION && d.name?.value === 'UpdateItem',
    );
    expect(updateInput).toBeDefined();
    expect(updateInput!.kind).toBe(Kind.INPUT_OBJECT_TYPE_DEFINITION);

    const fields = (updateInput as { fields?: readonly { name: { value: string } }[] }).fields ?? [];
    const fieldNames = fields.map((f) => f.name.value);
    expect(fieldNames).toContain('name');
    expect(fieldNames).not.toContain('computed');
  });
});
