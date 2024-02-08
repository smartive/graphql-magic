import { getActionableRelations, getSelectEntityRelationsQuery } from '../../src';
import { models } from '../utils/models';

describe('queries', () => {
  describe('getEntityRelationsQuery', () => {
    it('applies filters', () => {
      const model = models.getModel('SomeObject', 'entity');
      expect(getSelectEntityRelationsQuery(model, getActionableRelations(model, 'update'))).toMatchSnapshot();
    });
  });
});
