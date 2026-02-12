import CodeBlockWriter from 'code-block-writer';
import { EntityField, EntityModel } from '../../models/models';
import { isCustomField, isRelation } from '../../models/utils';

// eslint-disable-next-line @typescript-eslint/dot-notation
export const createWriter = (): CodeBlockWriter =>
  new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

export const getDbColumnName = (field: EntityField) =>
  field.kind === 'relation' ? field.foreignKey || `${field.name}Id` : field.name;

export const getSimpleFieldNames = (model: EntityModel) =>
  model.fields.filter((f) => !isRelation(f) && !isCustomField(f) && f.name !== 'id').map((f) => f.name);

export const getJsonFieldNames = (model: EntityModel) => model.fields.filter((f) => f.kind === 'json').map((f) => f.name);

export const getToOneRelations = (model: EntityModel) =>
  model.relations.map((r) => ({
    fieldName: r.field.name,
    foreignKey: r.field.foreignKey || `${r.field.name}Id`,
    targetModelName: r.targetModel.name,
    targetRootModelName: r.targetModel.rootModel.name,
    inherited: !!r.field.inherited,
  }));

export const getToManyRelations = (model: EntityModel) =>
  model.reverseRelations
    .filter((rr) => !rr.field.inherited)
    .map((rr) => ({
      fieldName: rr.name,
      foreignKey: rr.field.foreignKey || `${rr.field.name}Id`,
      targetModelName: rr.targetModel.name,
      targetRootModelName: rr.targetModel.rootModel.name,
      sourceModelName: rr.sourceModel.name,
    }));

export const getSearchableFields = (model: EntityModel) =>
  model.fields
    .filter(({ searchable }) => searchable)
    .map((f) => ({
      name: f.name,
      isExpression: f.generateAs?.type === 'expression',
      inherited: !!f.inherited,
    }));

export const getFilterableFields = (model: EntityModel) =>
  model.fields
    .filter((f) => !isCustomField(f))
    .map((f) => ({
      name: f.name,
      kind: f.kind,
      type: f.kind === 'relation' ? f.type : undefined,
      foreignKey: isRelation(f) ? f.foreignKey || `${f.name}Id` : undefined,
      list: !!f.list,
      inherited: !!f.inherited,
      isExpression: f.generateAs?.type === 'expression',
      expressionSql: f.generateAs?.type === 'expression' ? f.generateAs.expression : undefined,
    }));

export const getFieldInfo = (model: EntityModel) =>
  model.fields
    .filter((f) => !isCustomField(f))
    .map((f) => ({
      name: f.name,
      columnName: getDbColumnName(f),
      kind: f.kind,
      inherited: !!f.inherited,
      isExpression: f.generateAs?.type === 'expression',
      expressionSql: f.generateAs?.type === 'expression' ? f.generateAs.expression : undefined,
      queriable: f.queriable,
    }));

export const writeImports = (writer: CodeBlockWriter, gqmModule: string, imports: string[]) => {
  if (imports.length) {
    writer.writeLine(`import { ${imports.join(', ')} } from '${gqmModule}';`);
  }
};

export const escapeString = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`');

export const toKebabCase = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
