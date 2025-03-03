import { gql } from '../../src';
import { ANOTHER_ID, SOME_ID, SOME_ID_2 } from '../utils/database/seed';
import { withServer } from '../utils/server';

describe('query', () => {
  it('can be executed', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query SomeQuery {
            manyObjects(where: { another: { id: "${ANOTHER_ID}" } }, orderBy: [{ xyz: DESC }]) {
              id
              field
              xyz
              another {
                id
                manyObjects(where: { id: "${SOME_ID}" }) {
                  id
                  field
                }
              }
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('processes reverseFilters correctly', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query ReverseFiltersQuery {
            all: anotherObjects {
              id
              manyObjects {
                float
              }
            }
            withFloat0: anotherObjects(where: { manyObjects_SOME: { float: 0 } }) {
              id
              manyObjects {
                float
              }
            }
            withFloat0_5: anotherObjects(where: { manyObjects_SOME: { float: 0.5 } }) {
              id
              manyObjects {
                float
              }
            }
            noneFloat0: anotherObjects(where: { manyObjects_NONE: { float: 0 } }) {
              id
              manyObjects {
                float
              }
            }
            noneFloat0_5: anotherObjects(where: { manyObjects_NONE: { float: 0.5 } }) {
              id
              manyObjects {
                float
              }
            }
            noneFloat2: anotherObjects(where: { manyObjects_NONE: { float: 2 } }) {
              id
              manyObjects {
                float
              }
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('NOT works', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query NotQuery {
            manyObjects(where: { NOT: { id: "${SOME_ID}" } }, orderBy: [{ xyz: DESC }]) {
              id
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('AND works', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query AndQuery {
            manyObjects(where: { xyz: 2, AND: [{ id: "${SOME_ID_2}" }] }, orderBy: [{ xyz: DESC }]) {
              id
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('OR works', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query OrQuery {
            manyObjects(where: { OR: [{ id: "${SOME_ID}" }, { id: "${SOME_ID_2}"}] }, orderBy: [{ xyz: DESC }]) {
              id
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('filters by null values correctly', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query NullFilterQuery {
            all: manyObjects {
              id
              field
            }
            withNullField: manyObjects(where: { field: null }) {
              id
              field
            }
            withNotNullField: manyObjects(where: { NOT: { field: null } }) {
              id
              field
            }
            withSpecificField: manyObjects(where: { field: "Some value" }) {
              id
              field
            }
            withComplexFilter: manyObjects(where: { OR: [{ field: null }, { field: "Some value" }] }) {
              id
              field
            }
            withNestedFilter: manyObjects(where: { another: { manyObjects_SOME: { field: null } } }) {
              id
              field
              another {
                manyObjects {
                  id
                  field
                }
              }
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('filters by null relation correctly', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query NullRelationFilterQuery {
            all: manyObjects {
              id
              another {
                id
              }
            }
            withNullAnother: manyObjects(where: { another: null }) {
              id
              another {
                id
              }
            }
            withNotNullAnother: manyObjects(where: { NOT: { another: null } }) {
              id
              another {
                id
              }
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });
});
