import { getEditEntityRelationsQuery } from '../../src';
import { models } from '../utils/models';

describe('queries', () => {
  describe('getEntityRelationsQuery', () => {
    it('applies filters', () => {
      expect(getEditEntityRelationsQuery(models.getModel('SomeObject', 'entity'), 'update')).toMatchSnapshot();
    });
  });
});
