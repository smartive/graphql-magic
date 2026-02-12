import { Models } from '../../models/models';
import { generateModelFiltersFile } from './filters';
import { generateModelResolverFile } from './resolver';
import { generateResolversFile } from './resolvers';
import { generateModelSelectsFile } from './selects';
import { toKebabCase } from './utils';

export const generateConcreteResolvers = (models: Models, gqmModule: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const modelGqmModule = gqmModule.startsWith('.') ? `../${gqmModule}` : gqmModule;

  for (const model of models.entities) {
    const folder = toKebabCase(model.name);
    result[`${folder}/selects.ts`] = generateModelSelectsFile(model, models, modelGqmModule);
    result[`${folder}/filters.ts`] = generateModelFiltersFile(model, models, modelGqmModule);
    result[`${folder}/resolver.ts`] = generateModelResolverFile(model, models, modelGqmModule);
  }

  result['resolvers.ts'] = generateResolversFile(models, gqmModule);

  return result;
};
