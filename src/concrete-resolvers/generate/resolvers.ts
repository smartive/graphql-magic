import { Models } from '../../models/models';
import { isRootModel, typeToField } from '../../models/utils';
import { createWriter, toKebabCase } from './utils';

export const generateResolversFile = (models: Models, _gqmModule: string) => {
  const writer = createWriter();

  const resolverImports = new Map<string, Set<string>>();
  const addImport = (modelName: string, fn: string) => {
    if (!resolverImports.has(modelName)) resolverImports.set(modelName, new Set());
    resolverImports.get(modelName)!.add(fn);
  };

  const userModel = models.entities.find((m) => m.name === 'User');
  if (userModel) {
    addImport('User', 'resolveUser');
  }

  for (const model of models.entities.filter(({ queriable }) => queriable)) {
    addImport(model.name, `resolve${model.name}`);
  }
  for (const model of models.entities.filter(({ listQueriable }) => listQueriable)) {
    addImport(model.name, `resolve${model.name}`);
  }
  for (const model of models.entities.filter(({ aggregatable }) => aggregatable)) {
    addImport(model.name, `resolve${model.name}`);
  }

  for (const [modelName, fns] of resolverImports) {
    writer.writeLine(`import { ${[...fns].join(', ')} } from './${toKebabCase(modelName)}/resolver';`);
  }
  writer.blankLine();

  writer.write('export const resolvers = ').inlineBlock(() => {
    writer.write('Query: ').inlineBlock(() => {
      writer.writeLine('me: resolveUser,');

      for (const model of models.entities.filter(({ queriable }) => queriable)) {
        writer.writeLine(`${typeToField(model.name)}: resolve${model.name},`);
      }

      for (const model of models.entities.filter(({ listQueriable }) => listQueriable)) {
        writer.writeLine(`${model.pluralField}: resolve${model.name},`);
      }

      for (const model of models.entities.filter(({ aggregatable }) => aggregatable)) {
        writer.writeLine(`${model.pluralField}_AGGREGATE: resolve${model.name},`);
      }
    });
    writer.write(',').newLine();

    for (const model of models.entities.filter(isRootModel)) {
      writer.write(`${model.name}: `).inlineBlock(() => {
        writer.writeLine('__resolveType: ({ TYPE }: { TYPE: string }) => TYPE,');
      });
      writer.write(',').newLine();
    }
  });
  writer.write(';').newLine();

  return writer.toString();
};
