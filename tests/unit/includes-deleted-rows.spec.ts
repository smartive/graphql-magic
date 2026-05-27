import { includesDeletedRows } from '../../src/resolvers/filters';

describe('includesDeletedRows', () => {
  it('is false for the default non-deleted query', () => {
    expect(includesDeletedRows(undefined)).toBe(false);
    expect(includesDeletedRows(false)).toBe(false);
  });

  it('is true when the query opts into deleted rows', () => {
    expect(includesDeletedRows(true)).toBe(true);
    expect(includesDeletedRows(null)).toBe(true);
  });
});
