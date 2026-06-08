import { type ModelDefinitions, Models } from '../../src/models';
import { collectCoveredLeafPaths, collectLeafPaths } from '../../src/permissions/check';
import { generatePermissions, type PermissionStack, type PermissionsConfig } from '../../src/permissions/generate';
import { collectUserLeavesByAlias } from '../../src/resolvers/filters';

const modelDefinitions: ModelDefinitions = [
  { name: 'Role', kind: 'enum', values: ['ADMIN', 'PROVIDER_ADMIN'] },
  { name: 'Status', kind: 'enum', values: ['ACTIVE', 'INACTIVE'] },
  { name: 'PublicationStatus', kind: 'enum', values: ['DRAFT', 'PUBLISHED'] },
  {
    kind: 'entity',
    name: 'User',
    fields: [{ name: 'role', kind: 'enum', type: 'Role', nonNull: true }],
  },
  {
    kind: 'entity',
    name: 'Relation',
    fields: [
      { name: 'status', kind: 'enum', type: 'Status', nonNull: true },
      { name: 'demo', type: 'Boolean', nonNull: true, defaultValue: false },
    ],
  },
  {
    kind: 'entity',
    name: 'Goal',
    fields: [
      { name: 'status', kind: 'enum', type: 'Status', nonNull: true },
      { name: 'demo', type: 'Boolean', nonNull: true, defaultValue: false },
      { name: 'relation', kind: 'relation', type: 'Relation', nonNull: true, toOne: true, reverse: 'goals' },
    ],
  },
  {
    kind: 'entity',
    name: 'Portfolio',
    fields: [
      { name: 'status', kind: 'enum', type: 'PublicationStatus', nonNull: true },
      { name: 'goal', kind: 'relation', type: 'Goal', nonNull: true, toOne: true, reverse: 'portfolios' },
    ],
  },
];

const models = new Models(modelDefinitions);
const portfolioModel = models.getModel('Portfolio', 'entity');

describe('collectLeafPaths', () => {
  it('records every leaf at root-relative dotted paths', () => {
    expect(collectLeafPaths({ goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } } }).sort()).toEqual([
      'goal.relation.status',
      'goal.status',
    ]);
  });

  it('walks AND / OR / NOT transparently', () => {
    expect(
      collectLeafPaths({
        AND: [{ goal: { status: ['ACTIVE'] } }, { OR: [{ status: 'PUBLISHED' }, { NOT: { status: 'DRAFT' } }] }],
      }).sort(),
    ).toEqual(['goal.status', 'status', 'status']);
  });

  it('strips a trailing _<OP> filter suffix', () => {
    expect(collectLeafPaths({ goal: { status_IN: ['ACTIVE'], demo_NE: false } }).sort()).toEqual([
      'goal.demo',
      'goal.status',
    ]);
  });

  it('returns an empty array for empty / nullish input', () => {
    expect(collectLeafPaths(undefined)).toEqual([]);
    expect(collectLeafPaths(null)).toEqual([]);
    expect(collectLeafPaths({})).toEqual([]);
  });
});

describe('collectCoveredLeafPaths', () => {
  const config: PermissionsConfig = {
    PROVIDER_ADMIN: {
      Portfolio: {
        WHERE: { goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } } },
      },
      Goal: { WHERE: { demo: true } },
      Relation: { WHERE: { demo: true } },
    },
  };

  it('unions leaf paths across every chain in the stack', () => {
    const role = generatePermissions(models, config).PROVIDER_ADMIN;
    expect(role).not.toBe(true);
    expect(role).toBeDefined();
    if (role === true || role === undefined) return;
    const stack = role.Portfolio?.READ as PermissionStack;
    expect(collectCoveredLeafPaths(stack)).toEqual(new Set(['goal.status', 'goal.relation.status']));
  });

  it('returns an empty set when no chain has a WHERE', () => {
    const stack: PermissionStack = [[{ type: 'Portfolio' }]];
    expect(collectCoveredLeafPaths(stack)).toEqual(new Set());
  });
});

describe('collectUserLeavesByAlias', () => {
  it("anchors leaves at the join's table alias and propagates them up the tree", () => {
    const leaves = collectUserLeavesByAlias(portfolioModel, {
      goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } },
    });
    expect(leaves.get('Portfolio__W__goal')).toEqual(new Set(['goal.status', 'goal.relation.status']));
    expect(leaves.get('Goal__W__relation')).toEqual(new Set(['goal.relation.status']));
  });

  it('separates covered and uncovered leaves so the coverage check can fall back per-alias', () => {
    const leaves = collectUserLeavesByAlias(portfolioModel, {
      goal: { status: ['ACTIVE'], demo: false },
    });
    expect(leaves.get('Portfolio__W__goal')).toEqual(new Set(['goal.status', 'goal.demo']));
  });

  it('walks AND / OR / NOT and collapses _<OP> suffixes', () => {
    const leaves = collectUserLeavesByAlias(portfolioModel, {
      OR: [{ goal: { status_IN: ['ACTIVE'] } }, { goal: { NOT: { status: 'INACTIVE' } } }],
    });
    expect(leaves.get('Portfolio__W__goal')).toEqual(new Set(['goal.status']));
  });

  it('returns an empty map for empty / nullish input', () => {
    expect(collectUserLeavesByAlias(portfolioModel, undefined).size).toEqual(0);
    expect(collectUserLeavesByAlias(portfolioModel, {}).size).toEqual(0);
  });
});

describe('coverage decision (integration of the two collectors)', () => {
  const config: PermissionsConfig = {
    PROVIDER_ADMIN: {
      Portfolio: { WHERE: { goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } } } },
      Goal: { WHERE: { demo: true } },
      Relation: { WHERE: { demo: true } },
    },
  };
  const role = generatePermissions(models, config).PROVIDER_ADMIN;
  if (role === true || role === undefined) throw new Error('expected per-type permissions');
  const covered = collectCoveredLeafPaths(role.Portfolio!.READ as PermissionStack);

  const isCovered = (alias: string, leaves: Set<string>) => {
    return leaves.size > 0 && [...leaves].every((p) => covered.has(p));
  };

  it('skips filter-joined Goal + Relation when the user filters by exactly the covered paths', () => {
    const userLeaves = collectUserLeavesByAlias(portfolioModel, {
      goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } },
    });
    expect(isCovered('Portfolio__W__goal', userLeaves.get('Portfolio__W__goal')!)).toBe(true);
    expect(isCovered('Goal__W__relation', userLeaves.get('Goal__W__relation')!)).toBe(true);
  });

  it('does NOT skip when the user filters by a field outside the covered set', () => {
    const userLeaves = collectUserLeavesByAlias(portfolioModel, {
      goal: { status: ['ACTIVE'], demo: false },
    });
    expect(isCovered('Portfolio__W__goal', userLeaves.get('Portfolio__W__goal')!)).toBe(false);
  });

  it('does NOT skip a join that only carries an uncovered leaf', () => {
    const userLeaves = collectUserLeavesByAlias(portfolioModel, { goal: { demo: false } });
    expect(isCovered('Portfolio__W__goal', userLeaves.get('Portfolio__W__goal')!)).toBe(false);
  });

  it('still skips the upstream join when all user leaves at or below are covered', () => {
    const userLeaves = collectUserLeavesByAlias(portfolioModel, { goal: { relation: { status: ['ACTIVE'] } } });
    expect(isCovered('Portfolio__W__goal', userLeaves.get('Portfolio__W__goal')!)).toBe(true);
    expect(isCovered('Goal__W__relation', userLeaves.get('Goal__W__relation')!)).toBe(true);
  });
});
