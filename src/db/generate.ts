import CodeBlockWriter from 'code-block-writer';
import { ModelField, RawModels, get, getModels, isEnumModel, isRaw, not } from '..';

const PRIMITIVE_TYPES = {
  ID: 'string',
  Boolean: 'boolean',
  Upload: 'string',
  Int: 'number',
  Float: 'number',
  String: 'string',
  DateTime: 'DateTime | string',
};

const OPTIONAL_SEED_FIELDS = ['createdAt', 'createdById', 'updatedAt', 'updatedById', 'deletedAt', 'deletedById'];

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
    // TODO: deprecate allowing to define foreignKey
    const fields = model.fields.some((field) => field.type === 'relation' && field.foreignKey === 'id')
      ? model.fields.filter((field) => field.name !== 'id')
      : model.fields;

    writer
      .write(`export type ${model.name} = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          writer.write(`'${getFieldName(field)}': ${getFieldOutputType(field)}${field.nonNull ? '' : ' | null'},`).newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Initializer = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          writer
            .write(
              `'${getFieldName(field)}'${field.nonNull && field.default === undefined ? '' : '?'}: ${getFieldInputType(
                field
              )}${field.nonNull ? '' : ' | null'},`
            )
            .newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Mutator = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          writer.write(`'${getFieldName(field)}'?: ${getFieldInputType(field)}${field.nonNull ? '' : ' | null'},`).newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Seed = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          const fieldName = getFieldName(field);
          writer
            .write(
              `'${getFieldName(field)}'${
                field.nonNull && field.default === undefined && !OPTIONAL_SEED_FIELDS.includes(fieldName) ? '' : '?'
              }: ${getFieldInputType(
                field,
                rawModels.filter(isEnumModel).map(({ name }) => name)
              )}${field.list ? ' | string' : ''}${field.nonNull ? '' : ' | null'},`
            )
            .newLine();
        }
      })
      .blankLine();
  }

  writer.write(`export type SeedData = `).inlineBlock(() => {
    for (const model of models) {
      writer.write(`${model.name}: ${model.name}Seed[],`).newLine();
    }
  });

  return writer.toString();
};

const getFieldName = (field: ModelField) => (field.type === 'relation' ? field.foreignKey || `${field.name}Id` : field.name);

const getFieldOutputType = (field: ModelField) => {
  switch (field.type) {
    case 'json':
      // JSON data is stored as string
      return 'string';
    case 'relation':
      // Relations are stored as ids
      return 'string';
    case 'enum':
      return field.typeName + (field.list ? '[]' : '');
    case 'raw':
      throw new Error(`Raw fields are not in the db.`);
    default:
      return get(PRIMITIVE_TYPES, field.type) + (field.list ? '[]' : '');
  }
};

const getFieldInputType = (field: ModelField, stringTypes: string[] = []) => {
  let outputType = getFieldOutputType(field);

  if (field.list || stringTypes.includes(field.type)) {
    outputType += ' | string';
    if (field.list && stringTypes.includes(field.type)) {
      outputType += ' | string[]';
    }
  }

  return outputType;
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
