import { ModelDefinitions, Models } from '../../src/models';
import { collectMandatoryFilterAliases } from '../../src/resolvers/filters';

describe('collectMandatoryFilterAliases', () => {
  // A small graph that mirrors the wealth-platform shape that drove this
  // feature: Portfolio.goal (nonNull-filterable), Goal.relation
  // (nonNull-filterable), an optional sibling relation to compare the
  // gated path with, and a few scalar fields that vary `filterable` so we
  // can exercise "every leaf must be schema-mandatory" vs. the opt-in
  // case where any non-mandatory leaf drops the whole position.
  const modelDefinitions: ModelDefinitions = [
    {
      kind: 'enum',
      name: 'Status',
      values: ['ACTIVE', 'INACTIVE'],
    },
    {
      kind: 'entity',
      name: 'Relation',
      fields: [
        { name: 'name', type: 'String', filterable: true },
        { name: 'status', type: 'Status', kind: 'enum', filterable: { nonNull: true } },
      ],
    },
    {
      kind: 'entity',
      name: 'Goal',
      fields: [
        { name: 'name', type: 'String', filterable: true },
        { name: 'status', type: 'Status', kind: 'enum', filterable: { nonNull: true } },
        {
          name: 'relation',
          kind: 'relation',
          type: 'Relation',
          toOne: true,
          reverse: 'goals',
          filterable: { nonNull: true },
        },
      ],
    },
    {
      kind: 'entity',
      name: 'Portfolio',
      fields: [
        { name: 'status', type: 'Status', kind: 'enum', filterable: { nonNull: true } },
        {
          name: 'goal',
          kind: 'relation',
          type: 'Goal',
          toOne: true,
          reverse: 'portfolios',
          filterable: { nonNull: true },
        },
        {
          // optional traversal: same target type, but filterable: true (boolean) — opt-in.
          name: 'secondaryGoal',
          kind: 'relation',
          type: 'Goal',
          toOne: true,
          reverse: 'secondaryPortfolios',
          filterable: true,
        },
      ],
    },
  ];
  const models = new Models(modelDefinitions);
  const portfolio = models.entities.find((e) => e.name === 'Portfolio')!;

  it('returns empty when there is no WHERE', () => {
    expect(collectMandatoryFilterAliases(portfolio, undefined)).toEqual(new Set());
    expect(collectMandatoryFilterAliases(portfolio, {})).toEqual(new Set());
  });

  it('marks the join when both the cascade and contents are schema-mandatory', () => {
    expect(
      collectMandatoryFilterAliases(portfolio, {
        goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } },
      }),
    ).toEqual(new Set(['Portfolio__W__goal', 'Goal__W__relation']));
  });

  it('marks just the inner join when only the inner cascade is minimal', () => {
    expect(
      collectMandatoryFilterAliases(portfolio, {
        // Goal.name is filterable:true (opt-in) — drops the outer Portfolio__W__goal.
        // The relation traversal inside is still minimal, so Goal__W__relation stays.
        goal: { name: 'x', status: ['ACTIVE'], relation: { status: ['ACTIVE'] } },
      }),
    ).toEqual(new Set(['Goal__W__relation']));
  });

  it('does NOT mark a join through an opt-in (filterable:true) relation', () => {
    // secondaryGoal is filterable:true, not nonNull. User opted in.
    expect(
      collectMandatoryFilterAliases(portfolio, {
        secondaryGoal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } },
      }),
    ).toEqual(new Set());
  });

  it('does NOT mark a deeper join when the chain passes through an opt-in relation', () => {
    // The inner contents look minimal in isolation, but the outer
    // relation is opt-in so the whole subtree is permission-gated.
    expect(
      collectMandatoryFilterAliases(portfolio, {
        secondaryGoal: { relation: { status: ['ACTIVE'] } },
      }),
    ).toEqual(new Set());
  });

  it('treats `_<OP>` and `_SOME`/`_NONE` suffixes as opt-in', () => {
    expect(
      collectMandatoryFilterAliases(portfolio, {
        goal: { status_IN: ['ACTIVE'] },
      }),
    ).toEqual(new Set());
  });

  it('distributes over AND and keeps the position minimal when every branch is minimal', () => {
    expect(
      collectMandatoryFilterAliases(portfolio, {
        goal: {
          AND: [{ status: ['ACTIVE'] }, { relation: { status: ['ACTIVE'] } }],
        },
      }),
    ).toEqual(new Set(['Portfolio__W__goal', 'Goal__W__relation']));
  });

  it('distributes over OR and drops minimality when any branch has a non-mandatory leaf', () => {
    expect(
      collectMandatoryFilterAliases(portfolio, {
        goal: {
          status: ['ACTIVE'],
          relation: { status: ['ACTIVE'] },
          OR: [{ name: 'a' }, { name: 'b' }],
        },
      }),
    ).toEqual(new Set(['Goal__W__relation']));
  });

  it('respects NOT (a non-mandatory leaf inside NOT still drops minimality)', () => {
    expect(
      collectMandatoryFilterAliases(portfolio, {
        goal: { status: ['ACTIVE'], NOT: { name: 'x' } },
      }),
    ).toEqual(new Set());
  });
});
