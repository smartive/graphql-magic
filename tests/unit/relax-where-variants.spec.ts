import { ModelDefinitions, Models } from '../../src/models';
import { printSchemaFromModels } from '../../src/schema/generate';

const userDefinition: ModelDefinitions = [{ kind: 'entity', name: 'User', fields: [] }];

const buildSchema = (extra: ModelDefinitions) => printSchemaFromModels(new Models([...userDefinition, ...extra]));

const blockOf = (schema: string, header: string): string => {
  const start = schema.indexOf(header);
  if (start === -1) throw new Error(`Header not found: ${header}.`);
  const end = schema.indexOf('}', start);
  if (end === -1) throw new Error(`Block end not found: ${header}.`);
  return schema.slice(start, end + 1);
};

describe('relaxed Where variants (From<F><X>Where)', () => {
  describe('scenario 1: single mandatory-filterable relation FK', () => {
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'B',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'A',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'parent',
            kind: 'relation',
            type: 'B',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'as',
          },
        ],
      },
    ];

    it('emits FromParentAWhere with the relation field relaxed and other shape preserved', () => {
      const schema = buildSchema(definitions);
      const variant = blockOf(schema, 'input FromParentAWhere');
      expect(variant).toContain('parent: BWhere');
      expect(variant).not.toContain('parent: BWhere!');
      expect(variant).toContain('id: [ID!]');
      expect(variant).toContain('NOT: ASubWhere');
      expect(variant).toContain('AND: [ASubWhere!]');
      expect(variant).toContain('OR: [ASubWhere!]');
    });

    it('reverse-relation arg B.as(where:) references FromParentAWhere and is optional when no mandatory fields remain', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/as\(where: FromParentAWhere(?!!),/);
    });

    it('BWhere._SOME and _NONE reference FromParentAWhere', () => {
      const schema = buildSchema(definitions);
      const bWhere = blockOf(schema, 'input BWhere');
      expect(bWhere).toContain('as_SOME: FromParentAWhere');
      expect(bWhere).toContain('as_NONE: FromParentAWhere');
    });

    it('BSubWhere._SOME and _NONE also reference FromParentAWhere (symmetric implicit constraint)', () => {
      const schema = buildSchema(definitions);
      const bSubWhere = blockOf(schema, 'input BSubWhere');
      expect(bSubWhere).toContain('as_SOME: FromParentAWhere');
      expect(bSubWhere).toContain('as_NONE: FromParentAWhere');
    });

    it('base AWhere keeps parent as nonNull', () => {
      const schema = buildSchema(definitions);
      const aWhere = blockOf(schema, 'input AWhere');
      expect(aWhere).toContain('parent: BWhere!');
    });

    it('root list Query.as(where: AWhere!) is unchanged (nonNull AWhere)', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/as\(where: AWhere!,/);
    });

    it('singular Query.a(where: AWhereLookup!) is unchanged', () => {
      const schema = buildSchema(definitions);
      expect(schema).toContain('a(where: AWhereLookup!):');
      const lookup = blockOf(schema, 'input AWhereLookup');
      expect(lookup).toContain('parent: BWhere!');
    });

    it('ASubWhere relaxes the relation FK to nullable (boolean composition; outer cascade already enforces it)', () => {
      const schema = buildSchema(definitions);
      const aSubWhere = blockOf(schema, 'input ASubWhere');
      expect(aSubWhere).toContain('parent: BWhere');
      expect(aSubWhere).not.toContain('parent: BWhere!');
    });
  });

  describe('regression: OR branches do not re-require the mandatory cascade', () => {
    // Reproduces the client-project case: outer XWhere requires `goal: GoalWhere!` (because
    // `goal` is filterable.nonNull on GoalsHistoryEntry), but each OR branch should NOT
    // also be forced to repeat `goal:` — the cascade is enforced once at the outer level.
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'Goal',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'GoalsHistoryEntry',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'goal',
            kind: 'relation',
            type: 'Goal',
            filterable: { nonNull: true },
          },
          {
            name: 'endDate',
            type: 'DateTime',
            filterable: true,
            comparable: true,
          },
        ],
      },
    ];

    it('GoalsHistoryEntrySubWhere has goal nullable so OR branches can omit it', () => {
      const schema = buildSchema(definitions);
      const subWhere = blockOf(schema, 'input GoalsHistoryEntrySubWhere');
      expect(subWhere).toContain('goal: GoalWhere');
      expect(subWhere).not.toContain('goal: GoalWhere!');
    });

    it('outer GoalsHistoryEntryWhere still requires goal (cascade enforced once)', () => {
      const schema = buildSchema(definitions);
      const where = blockOf(schema, 'input GoalsHistoryEntryWhere');
      expect(where).toContain('goal: GoalWhere!');
    });
  });

  describe('scenario 2: two forward-relation fields targeting the same model', () => {
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'B',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'A',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'b1',
            kind: 'relation',
            type: 'B',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'a1s',
          },
          {
            name: 'b2',
            kind: 'relation',
            type: 'B',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'a2s',
          },
        ],
      },
    ];

    it('emits two distinct variants FromB1AWhere and FromB2AWhere', () => {
      const schema = buildSchema(definitions);
      const fromB1 = blockOf(schema, 'input FromB1AWhere');
      const fromB2 = blockOf(schema, 'input FromB2AWhere');
      expect(fromB1).toContain('b1: BWhere');
      expect(fromB1).not.toContain('b1: BWhere!');
      expect(fromB1).toContain('b2: BWhere!');
      expect(fromB2).toContain('b1: BWhere!');
      expect(fromB2).toContain('b2: BWhere');
      expect(fromB2).not.toContain('b2: BWhere!');
    });

    it('B.a1s uses FromB1AWhere and B.a2s uses FromB2AWhere', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/a1s\(where: FromB1AWhere!/);
      expect(schema).toMatch(/a2s\(where: FromB2AWhere!/);
    });

    it('reverse-relation arg stays nonNull because each variant still has one mandatory field', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/a1s\(where: FromB1AWhere!/);
      expect(schema).toMatch(/a2s\(where: FromB2AWhere!/);
    });
  });

  describe('scenario 3: mandatory simple filter + mandatory relation FK', () => {
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'B',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'A',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'parent',
            kind: 'relation',
            type: 'B',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'as',
          },
          {
            name: 'status',
            type: 'String',
            filterable: { nonNull: true },
          },
        ],
      },
    ];

    it('FromParentAWhere keeps status mandatory and relaxes only parent', () => {
      const schema = buildSchema(definitions);
      const variant = blockOf(schema, 'input FromParentAWhere');
      expect(variant).toContain('parent: BWhere');
      expect(variant).not.toContain('parent: BWhere!');
      expect(variant).toContain('status: [String!]!');
    });

    it('reverse-relation arg pointing to A stays nonNull (status still mandatory)', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/as\(where: FromParentAWhere!/);
    });
  });

  describe('scenario 4: only mandatory filterable is a relation FK', () => {
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'B',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'A',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'parent',
            kind: 'relation',
            type: 'B',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'as',
          },
        ],
      },
    ];

    it('FromParentAWhere has no mandatory fields', () => {
      const schema = buildSchema(definitions);
      const variant = blockOf(schema, 'input FromParentAWhere');
      const lines = variant.split('\n').filter((line) => /\w+:.*!$/.test(line.trim()));
      expect(lines).toEqual([]);
    });

    it('reverse-relation arg pointing to A along that edge is optional', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/as\(where: FromParentAWhere(?!!),/);
    });
  });

  describe('scenario 5: model with no mandatory filterables', () => {
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'B',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'A',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'parent',
            kind: 'relation',
            type: 'B',
            filterable: true,
            reverseFilterable: true,
            reverse: 'as',
          },
        ],
      },
    ];

    it('emits no From<F>AWhere variant', () => {
      const schema = buildSchema(definitions);
      expect(schema).not.toContain('input FromParentAWhere');
      expect(schema).not.toMatch(/input From\w+AWhere/);
    });

    it('reverse-relation arg uses base AWhere (optional, because no mandatory fields)', () => {
      const schema = buildSchema(definitions);
      expect(schema).toMatch(/as\(where: AWhere(?!!),/);
    });

    it('_SOME / _NONE in BWhere reference base AWhere', () => {
      const schema = buildSchema(definitions);
      const bWhere = blockOf(schema, 'input BWhere');
      expect(bWhere).toContain('as_SOME: AWhere');
      expect(bWhere).toContain('as_NONE: AWhere');
    });
  });

  describe('scenario 6: many-to-many entity model with both sides mandatory', () => {
    // UG joins User and Group; both sides mandatory-filterable.
    // B.users (reverse of UG.group) should pick FromGroupUGWhere; B.groups parallel.
    const definitions: ModelDefinitions = [
      {
        kind: 'entity',
        name: 'AccountUser',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'AccountGroup',
        queriable: true,
        listQueriable: true,
        fields: [],
      },
      {
        kind: 'entity',
        name: 'UG',
        queriable: true,
        listQueriable: true,
        fields: [
          {
            name: 'user',
            kind: 'relation',
            type: 'AccountUser',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'ugs',
          },
          {
            name: 'group',
            kind: 'relation',
            type: 'AccountGroup',
            filterable: { nonNull: true },
            reverseFilterable: true,
            reverse: 'ugs',
          },
        ],
      },
    ];

    it('emits both FromUserUGWhere and FromGroupUGWhere', () => {
      const schema = buildSchema(definitions);
      const fromUser = blockOf(schema, 'input FromUserUGWhere');
      const fromGroup = blockOf(schema, 'input FromGroupUGWhere');
      expect(fromUser).toContain('user: AccountUserWhere');
      expect(fromUser).not.toContain('user: AccountUserWhere!');
      expect(fromUser).toContain('group: AccountGroupWhere!');
      expect(fromGroup).toContain('user: AccountUserWhere!');
      expect(fromGroup).toContain('group: AccountGroupWhere');
      expect(fromGroup).not.toContain('group: AccountGroupWhere!');
    });

    it('AccountUser.ugs uses FromUserUGWhere; AccountGroup.ugs uses FromGroupUGWhere', () => {
      const schema = buildSchema(definitions);
      const accountUser = blockOf(schema, 'type AccountUser');
      const accountGroup = blockOf(schema, 'type AccountGroup');
      expect(accountUser).toMatch(/ugs\(where: FromUserUGWhere!/);
      expect(accountGroup).toMatch(/ugs\(where: FromGroupUGWhere!/);
    });
  });
});
