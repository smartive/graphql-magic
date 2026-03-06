import { ModelDefinitions, Models } from '../../src/models';
import {
  extractColumnReferencesFromCheckExpression,
  validateCheckConstraint,
  validateExcludeConstraint,
} from '../../src/models/utils';

describe('constraints', () => {
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

  describe('validateExcludeConstraint', () => {
    it('does not throw when column elements reference valid columns', () => {
      expect(() =>
        validateExcludeConstraint(productModel, {
          name: 'valid',
          elements: [
            { column: 'score', operator: '=' },
            { expression: 'tsrange("startDate", "endDate")', operator: '&&' },
          ],
        }),
      ).not.toThrow();
    });

    it('does not throw when only expression elements', () => {
      expect(() =>
        validateExcludeConstraint(productModel, {
          name: 'valid',
          elements: [{ expression: 'tsrange(now(), now())', operator: '&&' }],
        }),
      ).not.toThrow();
    });

    it('uses relation column name when validating', () => {
      expect(() =>
        validateExcludeConstraint(productModel, {
          name: 'valid',
          elements: [{ column: 'parentId', operator: '=' }],
        }),
      ).not.toThrow();
    });

    it('throws when column element references missing column', () => {
      expect(() =>
        validateExcludeConstraint(productModel, {
          name: 'bad',
          elements: [{ column: 'unknown_column', operator: '=' }],
        }),
      ).toThrow(
        /Exclude constraint "bad" references column "unknown_column" which does not exist on model Product/,
      );
    });
  });

  describe('exclude and constraint_trigger constraints', () => {
    const allocationDefinitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'PortfolioAllocation',
        fields: [
          { name: 'portfolio', kind: 'relation', type: 'Portfolio', reverse: 'allocations' },
          { name: 'startDate', type: 'DateTime' },
          { name: 'endDate', type: 'DateTime' },
          { name: 'deleted', type: 'Boolean', nonNull: true, defaultValue: false },
        ],
        constraints: [
          {
            kind: 'exclude',
            name: 'no_overlap_per_portfolio',
            using: 'gist',
            elements: [
              { column: 'portfolioId', operator: '=' },
              {
                expression: 'tsrange("startDate", COALESCE("endDate", \'infinity\'::timestamptz))',
                operator: '&&',
              },
            ],
            where: '"deleted" = false',
            deferrable: 'INITIALLY DEFERRED',
          },
          {
            kind: 'constraint_trigger',
            name: 'contiguous_periods',
            when: 'AFTER',
            events: ['INSERT', 'UPDATE'],
            forEach: 'ROW',
            deferrable: 'INITIALLY DEFERRED',
            function: { name: 'contiguous_periods_check' },
          },
        ],
      },
      {
        kind: 'entity',
        name: 'Portfolio',
        fields: [{ name: 'name', type: 'String' }],
      },
    ];

    it('constructs models with exclude and constraint_trigger without throwing', () => {
      expect(() => new Models(allocationDefinitions)).not.toThrow();
    });
  });
});
