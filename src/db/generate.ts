import CodeBlockWriter from 'code-block-writer';
import { RawModels, getModels, isEnumModel } from '..';

const PRIMITIVE_TYPES = {
  ID: 'string',
  Boolean: 'boolean',
  Upload: 'string',
  Int: 'number',
  Float: 'number',
  String: 'string',
};

export const generateDBModels = (rawModels: RawModels) => {
  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  writer.write(`import { DateTime } from 'luxon';`).blankLine();

  for (const enm of rawModels.filter(isEnumModel)) {
    writer.write(`export type ${enm.name} = ${enm.values.map((v) => `'${v}'`).join(' | ')};`).blankLine();
  }

  const models = getModels(rawModels);

  for (const model of models) {
    writer
      .write(`export type ${model.name} = `)
      .inlineBlock(() => {
        for (const { name, type, nonNull, relation } of model.fields.filter(({ raw }) => !raw)) {
          writer
            .write(
              `'${name}${relation ? 'Id' : ''}': ${relation ? 'string' : PRIMITIVE_TYPES[type] || type}${
                nonNull ? '' : ' | null'
              },`
            )
            .newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Initializer = `)
      .inlineBlock(() => {
        for (const { name, type, nonNull, default: def, relation } of model.fields.filter(({ raw }) => !raw)) {
          writer
            .write(
              `'${name}${relation ? 'Id' : ''}'${nonNull && def === undefined ? '' : '?'}: ${
                relation ? 'string' : PRIMITIVE_TYPES[type] || type
              }${nonNull ? '' : ' | null'},`
            )
            .newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Mutator = `)
      .inlineBlock(() => {
        for (const { name, type, nonNull, relation } of model.fields.filter(({ raw }) => !raw)) {
          writer
            .write(
              `'${name}${relation ? 'Id' : ''}'?: ${relation ? 'string' : PRIMITIVE_TYPES[type] || type}${
                nonNull ? '' : ' | null'
              },`
            )
            .newLine();
        }
      })
      .blankLine();
  }

  return writer.toString();
};

export const generateKnexTables = (rawModels: RawModels) => {
  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  const models = getModels(rawModels);

  writer.write(`import { Knex } from 'knex';`).newLine();
  writer
    .write(
      `import { ${models
        .map((model) => `${model.name}, ${model.name}Initializer, ${model.name}Mutator`)
        .join(', ')} } from '.';`
    )
    .blankLine();

  writer.write(`declare module 'knex/types/tables' `).inlineBlock(() => {
    writer.write(`interface Tables `).inlineBlock(() => {
      for (const model of models) {
        writer
          .write(`'${model.name}': Knex.CompositeTableType<${model.name}, ${model.name}Initializer, ${model.name}Mutator>,`)
          .newLine();
      }
    });
  });

  return writer.toString();
};
