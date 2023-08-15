import { getEditEntityRelationsQuery, summonByName } from "../../src";
import { models } from "../utils/models";

describe('queries', () => {
  describe('getEntityRelationsQuery', () => {
    it('applies filters', () => {
      expect(getEditEntityRelationsQuery(models, summonByName(models, 'SomeObject'), 'update')).toMatchSnapshot()
    });
  })
})
