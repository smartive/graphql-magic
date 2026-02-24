import CodeBlockWriter from 'code-block-writer';
import {
  EntityField,
  get,
  getColumnName,
  isCustomField,
  isGenerateAsField,
  isInTable,
  isRootModel,
  isStoredInDatabase,
  not,
} from '..';
import { Models } from '../models/models';
import { DATE_CLASS, DATE_CLASS_IMPORT, DateLibrary } from '../utils/dates';

export const PRIMITIVE_TYPES = {
  ID: 'string',
  Boolean: 'boolean',
  Upload: 'string',
  Int: 'number',
  Float: 'number',
  String: 'string',
};

const OPTIONAL_SEED_FIELDS = ['createdAt', 'createdById', 'updatedAt', 'updatedById', 'deletedAt', 'deletedById'];

export const generateDBModels = (models: Models, dateLibrary: DateLibrary) => {
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  writer.write(DATE_CLASS_IMPORT[dateLibrary]).blankLine();

  for (const [key, value] of Object.entries(PRIMITIVE_TYPES)) {
    writer.write(`export type ${key} = ${value};`).blankLine();
  }

  for (const enm of models.enums) {
    writer.write(`export type ${enm.name} = ${enm.values.map((v) => `'${v}'`).join(' | ')};`).blankLine();
  }
  for (const enm of models.rawEnums) {
    writer.write(`export type ${enm.name} = ${enm.values.map((v) => `'${v}'`).join(' | ')};`).blankLine();
  }

  for (const model of models.unions) {
    writer.write(`export type ${model.name} = ${model.types.join(' | ')};`).blankLine();
  }

  for (const model of models.objects) {
    writer
      .write(`export type ${model.name} = `)
      .inlineBlock(() => {
        for (const field of model.fields) {
          writer
            .write(`'${getColumnName(field)}': ${getFieldType(field, dateLibrary)}${field.nonNull ? '' : ' | null'};`)
            .newLine();
        }
      })
      .blankLine();
  }

  for (const model of models.entities) {
    // TODO: deprecate allowing to define foreignKey
    const fields = model.relations.some((relation) => relation.field.foreignKey === 'id')
      ? model.fields.filter((field) => field.name !== 'id')
      : model.fields;

    writer
      .write(`export type ${model.name} = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isCustomField)).filter(isStoredInDatabase)) {
          writer
            .write(`'${getColumnName(field)}': ${getFieldType(field, dateLibrary)}${field.nonNull ? '' : ' | null'};`)
            .newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Initializer = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isCustomField)).filter(isInTable).filter(not(isGenerateAsField))) {
          writer
            .write(
              `'${getColumnName(field)}'${field.nonNull && field.defaultValue === undefined ? '' : '?'}: ${getFieldType(
                field,
                dateLibrary,
                true,
              )}${field.list ? ' | string' : ''}${field.nonNull ? '' : ' | null'};`,
            )
            .newLine();
        }
      })
      .blankLine();

    writer
      .write(`export type ${model.name}Mutator = `)
      .inlineBlock(() => {
        for (const field of fields.filter(not(isCustomField)).filter(isInTable).filter(not(isGenerateAsField))) {
          writer
            .write(
              `'${getColumnName(field)}'?: ${getFieldType(field, dateLibrary, true)}${field.list ? ' | string' : ''}${
                field.nonNull ? '' : ' | null'
              };`,
            )
            .newLine();
        }
      })
      .blankLine();

    if (!isRootModel(model)) {
      writer
        .write(`export type ${model.name}Seed = `)
        .inlineBlock(() => {
          for (const field of fields.filter(not(isCustomField)).filter(not(isGenerateAsField))) {
            if (model.parent && field.name === 'type') {
              continue;
            }
            const fieldName = getColumnName(field);
            writer
              .write(
                `'${getColumnName(field)}'${
                  field.nonNull && field.defaultValue === undefined && !OPTIONAL_SEED_FIELDS.includes(fieldName) ? '' : '?'
                }: ${field.kind === 'enum' ? (field.list ? 'string[]' : 'string') : getFieldType(field, dateLibrary, true)}${
                  field.list ? ' | string' : ''
                }${field.nonNull ? '' : ' | null'};`,
              )
              .newLine();
          }
        })
        .blankLine();
    }
  }

  writer.write(`export type SeedData = `).inlineBlock(() => {
    for (const model of models.entities.filter(not(isRootModel))) {
      writer.write(`${model.name}: ${model.name}Seed[];`).newLine();
    }
  });

  return writer.toString();
};

const getFieldType = (field: EntityField, dateLibrary: DateLibrary, input?: boolean) => {
  const kind = field.kind;
  switch (kind) {
    case 'json':
      return field.type + (field.list ? '[]' : '');
    case 'relation':
      // Relations are stored as ids
      return 'string';
    case 'enum':
      return field.type + (field.list ? '[]' : '');
    case 'custom':
      return field.type + (field.list ? '[]' : '');
    case 'primitive':
    case undefined:
      if (field.type === 'DateTime') {
        return (input ? `(${DATE_CLASS[dateLibrary]} | string)` : DATE_CLASS[dateLibrary]) + (field.list ? '[]' : '');
      }

      return get(PRIMITIVE_TYPES, field.type) + (field.list ? '[]' : '');
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(exhaustiveCheck);
    }
  }
};

export const generateKnexTables = (models: Models) => {
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  writer.write(`import { Knex } from 'knex';`).newLine();
  writer
    .write(
      `import { ${models.entities
        .map((model) => `${model.name}, ${model.name}Initializer, ${model.name}Mutator`)
        .join(', ')} } from '.';`,
    )
    .blankLine();

  writer.write(`declare module 'knex/types/tables' `).inlineBlock(() => {
    writer.write(`interface Tables `).inlineBlock(() => {
      for (const model of models.entities) {
        writer
          .write(`'${model.name}': Knex.CompositeTableType<${model.name}, ${model.name}Initializer, ${model.name}Mutator>,`)
          .newLine();
      }
    });
  });

  return writer.toString();
};
