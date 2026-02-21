import { ModelDefinitions, Models } from '../../src/models';
import { extractColumnReferencesFromCheckExpression, validateCheckConstraint } from '../../src/models/utils';

describe('check constraints', () => {
  const modelDefinitions: ModelDefinitions = [
    {
      kind: 'entity',
      name: 'Product',
      fields: [
        { name: 'score', type: 'Int' },
        { name: 'status', type: 'String' },
        { name: 'parent', kind: 'relation', type: 'Product', toOne: true, reverse: 'children' },
      ],
    },
  ];
  const models = new Models(modelDefinitions);
  const productModel = models.entities.find((e) => e.name === 'Product')!;

  describe('extractColumnReferencesFromCheckExpression', () => {
    it('returns empty array when expression has no double-quoted identifiers', () => {
      expect(extractColumnReferencesFromCheckExpression('1 = 1')).toEqual([]);
      expect(extractColumnReferencesFromCheckExpression("status = 'active'")).toEqual([]);
    });

    it('extracts single double-quoted column name', () => {
      expect(extractColumnReferencesFromCheckExpression('"score" >= 0')).toEqual(['score']);
    });

    it('extracts multiple double-quoted column names and deduplicates', () => {
      expect(extractColumnReferencesFromCheckExpression('"score" >= 0 AND "status" = \'ok\' AND "score" < 100')).toEqual([
        'score',
        'status',
      ]);
    });

    it('normalizes whitespace before extracting', () => {
      expect(extractColumnReferencesFromCheckExpression('  "score"   >=   0  ')).toEqual(['score']);
    });
  });

  describe('validateCheckConstraint', () => {
    it('does not throw when expression has no column references', () => {
      expect(() => validateCheckConstraint(productModel, { name: 'dummy', expression: '1 = 1' })).not.toThrow();
    });

    it('does not throw when all referenced columns exist on the model', () => {
      expect(() => validateCheckConstraint(productModel, { name: 'valid', expression: '"score" >= 0' })).not.toThrow();
      expect(() =>
        validateCheckConstraint(productModel, {
          name: 'valid',
          expression: '"score" >= 0 AND "status" IS NOT NULL',
        }),
      ).not.toThrow();
    });

    it('uses relation column name (foreignKey) when validating', () => {
      expect(() =>
        validateCheckConstraint(productModel, {
          name: 'valid',
          expression: '"parentId" IS NOT NULL',
        }),
      ).not.toThrow();
    });

    it('throws when expression references a column that does not exist', () => {
      expect(() =>
        validateCheckConstraint(productModel, {
          name: 'bad',
          expression: '"unknown_column" >= 0',
        }),
      ).toThrow(/Constraint "bad" references column "unknown_column" which does not exist on model Product/);
    });

    it('error message includes valid column names', () => {
      expect(() =>
        validateCheckConstraint(productModel, {
          name: 'bad',
          expression: '"nope" = 1',
        }),
      ).toThrow(/Valid columns:.*\bscore\b.*\bstatus\b/);
    });
  });
});
