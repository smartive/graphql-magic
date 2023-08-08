import { printSchemaFromModels } from '../src';
import { rawModels } from './utils/models';

describe('generate', () => {
  it('generates a schema', () => {
    expect(printSchemaFromModels(rawModels)).toMatchSnapshot();
  });
});
