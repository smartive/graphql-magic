import CodeBlockWriter from 'code-block-writer';
import { isRootModel, Models, not, typeToField } from '..';

export const generateResolvers = (models: Models, gqmModule = '@smartive/graphql-magic') => {
  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  writer.writeLine(`import { queryResolver, mutationResolver } from '${gqmModule}';`);
  writer.blankLine();

  writer
    .write(`export const resolvers = `)
    .inlineBlock(() => {
      writer
        .write('Query: ')
        .inlineBlock(() => {
          writer.writeLine('me: queryResolver,');
          for (const model of models.entities.filter(({ queriable }) => queriable)) {
            writer.writeLine(`${typeToField(model.name)}: queryResolver,`);
          }
          for (const model of models.entities.filter(({ listQueriable }) => listQueriable)) {
            writer.writeLine(`${model.pluralField}: queryResolver,`);
          }
        })
        .write(',')
        .newLine();

      const mutations = [
        ...models.entities
          .filter(not(isRootModel))
          .filter(({ creatable }) => creatable)
          .map((model) => () => {
            writer.writeLine(`create${model.name}: mutationResolver,`);
          }),
        ...models.entities
          .filter(not(isRootModel))
          .filter(({ updatable }) => updatable)
          .map((model) => () => {
            writer.writeLine(`update${model.name}: mutationResolver,`);
          }),
        ...models.entities
          .filter(not(isRootModel))
          .filter(({ deletable }) => deletable)
          .flatMap((model) => () => {
            writer.writeLine(`delete${model.name}: mutationResolver,`);
            writer.writeLine(`restore${model.name}: mutationResolver,`);
          }),
      ];

      if (mutations) {
        writer
          .write('Mutation: ')
          .inlineBlock(() => {
            for (const mutation of mutations) {
              mutation();
            }
          })
          .write(',')
          .newLine();
      }

      for (const model of models.entities.filter(isRootModel)) {
        writer
          .write(`${model.name}: `)
          .inlineBlock(() => {
            writer.writeLine('resolveType: ({ TYPE }) => TYPE,');
          })
          .write(',')
          .newLine();
      }
    })
    .write(';')
    .newLine()
    .blankLine();

  return writer.toString();
};
