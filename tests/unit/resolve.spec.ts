import { getResolvers } from '../../src/resolvers';
import { models } from '../utils/models';

describe('resolvers', () => {
  it('are generated correctly', () => {
    expect(getResolvers(models)).toMatchSnapshot();
  });
});
