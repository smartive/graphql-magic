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
    const fields = model.fields.some((field) => field.kind === 'relation' && field.foreignKey === 'id')
      ? model.fields.filter((field) => field.name !== 'id')
      : model.fields;

    writer
      .write(`export type ${model.name} = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          writer.write(`'${getFieldName(field)}': ${getFieldType(field)}${field.nonNull ? '' : ' | null'},`).newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Initializer = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          writer
            .write(
              `'${getFieldName(field)}'${field.nonNull && field.defaultValue === undefined ? '' : '?'}: ${getFieldType(
                field
              )}${field.list ? ' | string' : ''}${field.nonNull ? '' : ' | null'},`
            )
            .newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Mutator = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isRaw))) {
          writer
            .write(
              `'${getFieldName(field)}'?: ${getFieldType(field)}${field.list ? ' | string' : ''}${
                field.nonNull ? '' : ' | null'
              },`
            )
            .newLine();
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
                field.nonNull && field.defaultValue === undefined && !OPTIONAL_SEED_FIELDS.includes(fieldName) ? '' : '?'
              }: ${field.kind === 'enum' ? (field.list ? 'string[]' : 'string') : getFieldType(field)}${
                field.list ? ' | string' : ''
              }${field.nonNull ? '' : ' | null'},`
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

const getFieldName = (field: ModelField) => (field.kind === 'relation' ? field.foreignKey || `${field.name}Id` : field.name);

const getFieldType = (field: ModelField) => {
  const kind = field.kind;
  switch (kind) {
    case 'json':
      // JSON data is stored as string
      return 'string';
    case 'relation':
      // Relations are stored as ids
      return 'string';
    case 'enum':
      return field.type + (field.list ? '[]' : '');
    case 'raw':
      throw new Error(`Raw fields are not in the db.`);
    case 'primitive':
    case undefined:
      return get(PRIMITIVE_TYPES, field.type) + (field.list ? '[]' : '');
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(exhaustiveCheck);
    }
  }
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
