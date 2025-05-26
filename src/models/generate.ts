import { pluralize, singularize } from 'inflection';
import { camelCase, kebabCase, mapValues, upperFirst } from 'lodash';
import { IndentationText, Project, SourceFile } from 'ts-morph';
import { EntityModelDefinition, getLabel, isRelation, ModelDefinition, ModelDefinitions, typeToField } from '..';
import { constantCase } from '../client/utils';
const PRIMITIVE_TYPES = {
  ID: 'string',
  Boolean: 'boolean',
  String: 'string',
  DateTime: 'Date',
  Int: 'number',
  Float: 'number',
};

const FIELD_KINDS = ['primitive', 'enum', 'custom', 'json', 'relation'] as const;
const KINDS = ['scalar', 'enum', 'raw-enum', 'interface', 'object', 'entity'] as const;

const getPlural = (definition: ModelDefinition) => {
  if (definition.plural) {
    return definition.plural;
  }

  return pluralize(definition.name);
};

const getStringOrUndefined = (value: string | undefined) => (value ? `'${value}'` : 'undefined');

const getBoolean = (value: boolean | undefined) => (value ? 'true' : 'false');

export const generateModelsFiles = (definitions: ModelDefinitions) => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const files: Record<string, SourceFile> = {};

  const indexFile = (files['index.ts'] = project.createSourceFile('index.ts', '', { overwrite: true }));

  for (const modelDefinition of definitions) {
    indexFile.addStatements((writer) =>
      writer.write(`import { ${modelDefinition.name}Model }`).write(` from './${kebabCase(modelDefinition.name)}';`),
    );
  }

  indexFile.addStatements(
    `export const ENTITY_MODEL_NAMES = [${definitions
      .filter((definition) => definition.kind === 'entity')
      .map((model) => `'${model.name}'`)
      .join(', ')}] as const;`,
  );
  indexFile.addStatements(`export type EntityModelName = (typeof ENTITY_MODEL_NAMES)[number];`);

  for (const [name, type] of Object.entries(PRIMITIVE_TYPES)) {
    indexFile.addStatements(`export type ${name} = ${type};`);
  }

  for (const enumModel of definitions.filter((definition) => definition.kind === 'enum' || definition.kind === 'raw-enum')) {
    indexFile.addStatements(
      `export const ${constantCase(getPlural(enumModel))} = [${enumModel.values.map((value) => `'${value}'`).join(', ')}] as const;`,
    );
    indexFile.addStatements(`export type ${enumModel.name} = typeof ${constantCase(getPlural(enumModel))}[number];`);
  }

  indexFile.addStatements(`export const FIELD_KINDS = [${FIELD_KINDS.map((kind) => `'${kind}'`).join(', ')}] as const;`);
  indexFile.addStatements(`export type FieldKind = (typeof FIELD_KINDS)[number];`);
  indexFile.addStatements(`export const KINDS = [${KINDS.map((kind) => `'${kind}'`).join(', ')}] as const;`);
  indexFile.addStatements(`export type Kind = (typeof KINDS)[number];`);

  for (const modelDefinition of definitions) {
    const modelFile = (files[`${kebabCase(modelDefinition.name)}.ts`] = project.createSourceFile(
      `${kebabCase(modelDefinition.name)}.ts`,
      '',
      {
        overwrite: true,
      },
    ));

    if ('fields' in modelDefinition) {
      for (const field of modelDefinition.fields) {
        modelFile.addStatements((writer) =>
          writer
            .write(`export const ${modelDefinition.name}${upperFirst(field.name)}Field = `)
            .inlineBlock(() => {
              writer.writeLine(`kind: '${field.kind || 'primitive'}',`);
              writer.writeLine(`name: '${field.name}',`);
              writer.writeLine(`type: '${field.type}',`);
              writer.writeLine(`description: ${getStringOrUndefined(field.description)},`);
              writer.writeLine(`list: ${getBoolean(field.list)},`);
              writer.writeLine(`nonNull: ${getBoolean(field.nonNull)},`);
              writer.writeLine(`defaultValue: ${JSON.stringify(field.defaultValue)},`);
              writer.writeLine(`args: [${JSON.stringify(field.args)}],`);
              writer.writeLine(`directives: [${JSON.stringify(field.directives)}],`);

              if (field.kind === 'relation') {
                writer
                  .write(
                    `targetModel: ${field.type === modelDefinition.name ? `() => ${field.type}Model` : `async () => (await import('./${kebabCase(field.type)}')).${field.type}Model`},`,
                  )
                  .newLine();
                writer.write(`asRelation: () => ${modelDefinition.name}${upperFirst(field.name)}Relation,`).newLine();
              }
            })
            .write(` satisfies EntityFieldDefinition;`),
        );

        if (isRelation(field) && modelDefinition.kind === 'entity') {
          const targetModel = definitions.find((definition) => definition.name === field.type) as EntityModelDefinition;
          modelFile.addStatements((writer) =>
            writer
              .write(`export const ${modelDefinition.name}${upperFirst(field.name)}Relation = `)
              .inlineBlock(() => {
                writer.write(`name: '${field.name}',`).newLine();
                writer.write(`field: ${modelDefinition.name}${upperFirst(field.name)}Field,`).newLine();
                writer.write(`sourceModel: () => ${modelDefinition.name}Model,`).newLine();
                writer
                  .write(
                    `targetModel: ${field.type === modelDefinition.name ? `() => ${field.type}Model` : `async () => (await import('./${kebabCase(field.type)}')).${field.type}Model`},`,
                  )
                  .newLine();
                writer
                  .write(
                    `searchable: ${targetModel.fields.find((f) => f.name === targetModel.displayField || 'id')?.searchable},`,
                  )
                  .newLine();
                writer.write(`label: '${getLabel(field.name)}',`).newLine();
                writer.write(`reverse: () => ${modelDefinition.name}${upperFirst(field.name)}ReverseRelation,`).newLine();
              })
              .write(` as const;`),
          );

          modelFile.addStatements((writer) =>
            writer
              .write(`export const ${modelDefinition.name}${upperFirst(field.name)}ReverseRelation = `)
              .inlineBlock(() => {
                const name =
                  field.reverse ||
                  (field.toOne ? typeToField(modelDefinition.name) : typeToField(getPlural(modelDefinition)));
                writer.write(`name: '${name}',`).newLine();
                writer.write(`field: ${modelDefinition.name}${upperFirst(field.name)}Field,`).newLine();
                writer
                  .write(
                    `sourceModel: ${field.type === modelDefinition.name ? `() => ${field.type}Model` : `async () => (await import('./${kebabCase(field.type)}')).${field.type}Model`},`,
                  )
                  .newLine();
                writer.write(`targetModel: () => ${modelDefinition.name}Model,`).newLine();
                writer
                  .write(
                    `searchable: ${modelDefinition.fields.find((f) => f.name === modelDefinition.displayField || 'id')?.searchable},`,
                  )
                  .newLine();
                writer.write(`label: '${getLabel(field.name)}',`).newLine();
                writer.write(`reverse: () => ${modelDefinition.name}${upperFirst(field.name)}Relation,`).newLine();
                const singularName = singularize(name);
                writer.write(`singularName: '${singularName}',`).newLine();
                writer.write(`singularLabel: '${getLabel(singularName)}',`).newLine();
              })
              .write(` as const;`),
          );
        }
      }
    }

    modelFile.addStatements((writer) =>
      writer
        .write(`export const ${modelDefinition.name}Model = `)
        .inlineBlock(() => {
          writer.write(`kind: '${modelDefinition.kind}',`).newLine();
          writer.write(`name: '${modelDefinition.name}',`).newLine();
          const plural = getPlural(modelDefinition);
          writer.write(`plural: '${plural}',`).newLine();
          writer
            .write(`description: ${modelDefinition.description ? `'${modelDefinition.description}'` : 'undefined'},`)
            .newLine();
          if (modelDefinition.kind === 'enum') {
            writer.write(`deleted: ${modelDefinition.deleted ? 'true' : 'false'},`).newLine();
          }

          if (modelDefinition.kind === 'entity') {
            writer.write(`root: ${modelDefinition.root ? 'true' : 'false'},`).newLine();
            writer.write(`parent: ${modelDefinition.parent ? `'${modelDefinition.parent}'` : 'undefined'},`).newLine();
            writer
              .write(
                `interfaces: [${modelDefinition.interfaces ? modelDefinition.interfaces.map((interfaceName) => `'${interfaceName}'`).join(', ') : 'undefined'}],`,
              )
              .newLine();
            writer.write(`queriable: ${modelDefinition.queriable ? 'true' : 'false'},`).newLine();
            writer.write(`listQueriable: ${modelDefinition.listQueriable ? 'true' : 'false'},`).newLine();
            writer.write(`creatable: ${modelDefinition.creatable ? 'true' : 'false'},`).newLine();
            writer.write(`updatable: ${modelDefinition.updatable ? 'true' : 'false'},`).newLine();
            writer.write(`deletable: ${modelDefinition.deletable ? 'true' : 'false'},`).newLine();
            writer
              .write(`displayField: ${modelDefinition.displayField ? `'${modelDefinition.displayField}'` : 'undefined'},`)
              .newLine();
            writer
              .write(
                `defaultOrderBy: ${modelDefinition.defaultOrderBy ? `'${modelDefinition.defaultOrderBy}'` : 'undefined'},`,
              )
              .newLine();
            writer.write(`deleted: ${modelDefinition.deleted ? 'true' : 'false'},`).newLine();
            writer.write(`oldName: ${modelDefinition.oldName ? `'${modelDefinition.oldName}'` : 'undefined'},`).newLine();
            writer.write(`pluralField: '${typeToField(plural)}',`).newLine();
            writer.write(`slug: '${kebabCase(plural)}',`).newLine();
            writer.write(`labelPlural: '${getLabel(plural)}',`).newLine();
            writer.write(`label: '${getLabel(modelDefinition.name)}',`).newLine();
          }

          if ('fields' in modelDefinition) {
            writer
              .write(
                `fields: [${modelDefinition.fields.map((field) => `${modelDefinition.name}${upperFirst(field.name)}Field`).join(', ')}],`,
              )
              .newLine();

            writer
              .write(`fieldsByName: `)
              .inlineBlock(() => {
                for (const field of modelDefinition.fields) {
                  writer.write(`${field.name}: ${modelDefinition.name}${upperFirst(field.name)}Field,`).newLine();
                }
              })
              .write(`,`)
              .newLine();
          }

          if (modelDefinition.kind === 'entity') {
            writer
              .write(
                `relations: [${modelDefinition.fields
                  .filter(isRelation)
                  .map((relation) => `${modelDefinition.name}${upperFirst(relation.name)}Relation`)
                  .join(', ')}],`,
              )
              .newLine();
            writer
              .write(`relationsByName: `)
              .block(() => {
                for (const relation of modelDefinition.fields.filter(isRelation)) {
                  writer.write(`${relation.name}: ${modelDefinition.name}${upperFirst(relation.name)}Relation,`).newLine();
                }
              })
              .write(`,`)
              .newLine();

            // reverse relations
            // many to many relations
            // get parent model
            // get root model
          }
        })
        .write(` as const;`)
        .newLine(),
    );
  }

  for (const kind of KINDS) {
    indexFile.addStatements(
      `export const ${constantCase(pluralize(kind))} = [${definitions
        .filter((definition) => definition.kind === kind)
        .map((definition) => `${definition.name}Model`)
        .join(', ')}] as const;`,
    );

    indexFile.addStatements(
      `export type ${upperFirst(camelCase(kind))}Model = (typeof ${constantCase(pluralize(kind))})[number];`,
    );
  }
  indexFile.addStatements(
    `export const MODELS = [${definitions.map((definition) => `${definition.name}Model`).join(', ')}] as const;`,
  );
  indexFile.addStatements(`export type Model = (typeof MODELS)[number];`);

  return mapValues(files, (file) => file.getFullText());
};
