import { getEditEntityRelationsQuery } from '../../src';
import { models } from '../utils/models';

describe('queries', () => {
  describe('getEntityRelationsQuery', () => {
    it('applies filters', () => {
      expect(getEditEntityRelationsQuery(models, models.getModel('SomeObject', 'entity'), 'update')).toMatchSnapshot();
    });
  });
});
