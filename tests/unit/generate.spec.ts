import { printSchemaFromModels } from '../../src/generate';
import { rawModels } from './utils';

describe('generate', () => {
  it('generates a schema', () => {
    expect(printSchemaFromModels(rawModels)).toMatchSnapshot();
  });
});
