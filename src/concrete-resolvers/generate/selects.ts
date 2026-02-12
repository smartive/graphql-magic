import CodeBlockWriter from 'code-block-writer';
import { EntityModel, Models } from '../../models/models';
import { isCustomField, isRelation } from '../../models/utils';
import { createWriter, getJsonFieldNames, getToOneRelations, toKebabCase, writeImports } from './utils';

const generateModelSelects = (writer: CodeBlockWriter, model: EntityModel, allModels: Models) => {
  const modelName = model.name;
  const jsonFields = getJsonFieldNames(model);
  const toOneRelations = getToOneRelations(model);

  writer.write(`export const apply${modelName}Selects = (`).newLine();
  writer.write(`  node: ConcreteResolverNode,`).newLine();
  writer.write(`  query: Knex.QueryBuilder,`).newLine();
  writer.write(`  joins: Joins,`).newLine();
  writer.write(`) => `).inlineBlock(() => {
    writer.writeLine('const aliases = node.ctx.aliases;');
    writer.blankLine();

    writer.write('if (node.isAggregate) ').inlineBlock(() => {
      writer.writeLine('void query.select(');
      writer.writeLine('  node.selectionSet');
      writer.writeLine('    .filter(isFieldNode)');
      writer.writeLine('    .map((field) =>');
      writer.writeLine(
        "      node.ctx.knex.raw('COUNT(*) as ??', [`${aliases.getShort(node.resultAlias)}__${getNameOrAlias(field)}`]),",
      );
      writer.writeLine('    ),');
      writer.writeLine(');');
      writer.writeLine('return;');
    });
    writer.blankLine();

    writer.writeLine('const resultShort = aliases.getShort(node.resultAlias);');
    writer.writeLine('const rootShort = aliases.getShort(node.rootTableAlias);');
    if (model.parent) {
      writer.writeLine('const tableShort = aliases.getShort(node.tableAlias);');
    }
    writer.blankLine();

    writer.writeLine('void query.select(`${rootShort}.id as ${resultShort}__${ID_ALIAS}`);');
    if (model.root) {
      writer.writeLine('void query.select(`${rootShort}.type as ${resultShort}__${TYPE_ALIAS}`);');
    }
    writer.blankLine();

    writer.write('for (const fieldNode of node.selectionSet.filter(isFieldNode)) ').inlineBlock(() => {
      writer.writeLine('const fieldName = fieldNode.name.value;');
      writer.writeLine('const fieldAlias = getNameOrAlias(fieldNode);');
      writer.blankLine();

      if (jsonFields.length) {
        writer.write('if (fieldNode.selectionSet) ').inlineBlock(() => {
          writer.write(`if (![${jsonFields.map((f) => `'${f}'`).join(', ')}].includes(fieldName)) `).inlineBlock(() => {
            writer.writeLine('continue;');
          });
        });
      } else {
        writer.write('if (fieldNode.selectionSet) ').inlineBlock(() => {
          writer.writeLine('continue;');
        });
      }
      writer.blankLine();

      writer.write('if ([ID_ALIAS, TYPE_ALIAS].includes(fieldAlias)) ').inlineBlock(() => {
        writer.writeLine('throw new UserInputError(`Keyword ${fieldAlias} is reserved by graphql-magic.`);');
      });
      writer.blankLine();

      const simpleFields = model.fields.filter((f) => !isRelation(f) && !isCustomField(f) && f.name !== 'id');
      if (simpleFields.length) {
        writer.write('switch (fieldName) ').inlineBlock(() => {
          writer.writeLine("case 'id':");
          writer.writeLine('  break;');

          for (const field of simpleFields) {
            const isExpr = field.generateAs?.type === 'expression';
            const isInherited = !!field.inherited;
            const tableRef = isInherited || !model.parent ? 'rootShort' : 'tableShort';

            if (isExpr) {
              writer.write(`case '${field.name}': `).inlineBlock(() => {
                writer.writeLine('const role = getRole(node.ctx);');
                if (typeof field.queriable === 'object') {
                  const roles = field.queriable.roles;
                  if (roles) {
                    writer.write(`if (!${JSON.stringify(roles)}.includes(role)) `).inlineBlock(() => {
                      writer.writeLine(
                        `throw new PermissionError(role, 'READ', '${modelName}\\'s field "${field.name}"', 'field permission not available');`,
                      );
                    });
                  }
                }
                generateExpressionSelect(writer, field, model);
                writer.writeLine('break;');
              });
              writer.newLine();
            } else {
              writer.write(`case '${field.name}': `).inlineBlock(() => {
                if (typeof field.queriable === 'object') {
                  writer.writeLine('const role = getRole(node.ctx);');
                  const roles = field.queriable.roles;
                  if (roles) {
                    writer.write(`if (!${JSON.stringify(roles)}.includes(role)) `).inlineBlock(() => {
                      writer.writeLine(
                        `throw new PermissionError(role, 'READ', '${modelName}\\'s field "${field.name}"', 'field permission not available');`,
                      );
                    });
                  }
                }
                if (!isInherited && model.parent) {
                  writer.writeLine(`addJoin(joins, node.rootTableAlias, '${model.name}', node.tableAlias, 'id', 'id');`);
                }
                writer.writeLine(`void query.select(\`\${${tableRef}}.${field.name} as \${resultShort}__\${fieldAlias}\`);`);
                writer.writeLine('break;');
              });
              writer.newLine();
            }
          }
        });
      }
    });

    writer.blankLine();

    if (model.root) {
      const subtypes = allModels.entities.filter((m) => m.parent === model.name);
      if (subtypes.length) {
        writer.write('for (const fragment of node.selectionSet.filter(isInlineFragmentNode)) ').inlineBlock(() => {
          writer.writeLine('const typeName = getFragmentTypeName(fragment);');
          writer.write('switch (typeName) ').inlineBlock(() => {
            for (const sub of subtypes) {
              writer.write(`case '${sub.name}': `).inlineBlock(() => {
                writer.writeLine(`apply${sub.name}Selects({`);
                writer.writeLine('  ...node,');
                writer.writeLine(`  tableAlias: node.tableAlias + '__${sub.name}',`);
                writer.writeLine(`  selectionSet: fragment.selectionSet!.selections,`);
                writer.writeLine('}, query, joins);');
                writer.writeLine('break;');
              });
              writer.newLine();
            }
          });
        });
        writer.blankLine();
      }
    }

    writer.write('for (const fragment of node.selectionSet.filter(isFragmentSpreadNode)) ').inlineBlock(() => {
      writer.writeLine('const def = node.ctx.info.fragments[fragment.name.value];');
      writer.writeLine(`apply${modelName}Selects({`);
      writer.writeLine('  ...node,');
      writer.writeLine('  selectionSet: def.selectionSet.selections,');
      writer.writeLine('}, query, joins);');
    });

    writer.blankLine();

    if (toOneRelations.length) {
      writer
        .write('for (const fieldNode of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) ')
        .inlineBlock(() => {
          writer.writeLine('const fieldName = fieldNode.name.value;');
          writer.writeLine('const fieldAlias = getNameOrAlias(fieldNode);');
          writer.write('switch (fieldName) ').inlineBlock(() => {
            for (const rel of toOneRelations) {
              writer.write(`case '${rel.fieldName}': `).inlineBlock(() => {
                writer.writeLine('const subTableAlias = `${node.tableAlias}__${fieldAlias}`;');
                const fromTable = rel.inherited ? 'node.rootTableAlias' : 'node.tableAlias';
                writer.writeLine(
                  `addJoin(joins, ${fromTable}, '${rel.targetRootModelName}', subTableAlias, '${rel.foreignKey}', 'id');`,
                );
                writer.writeLine(`apply${rel.targetModelName}Selects({`);
                writer.writeLine('  ...node,');
                writer.writeLine('  rootTableAlias: subTableAlias,');
                writer.writeLine(`  tableAlias: subTableAlias,`);
                writer.writeLine('  resultAlias: subTableAlias,');
                writer.writeLine('  selectionSet: fieldNode.selectionSet!.selections,');
                writer.writeLine('  isAggregate: false,');
                writer.writeLine('}, query, joins);');
                writer.writeLine('break;');
              });
              writer.newLine();
            }
          });
        });
    }
  });
  writer.blankLine();
};

const generateExpressionSelect = (writer: CodeBlockWriter, field: EntityModel['fields'][0], model: EntityModel) => {
  if (field.generateAs?.type !== 'expression') {
    return;
  }

  const expr = field.generateAs.expression;
  const parts: string[] = [];
  let lastIndex = 0;
  const regex = /"(\w+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(expr)) !== null) {
    const columnName = match[1];
    const referencedField = model.fields.find((f) => {
      const cn = f.kind === 'relation' ? f.foreignKey || `${f.name}Id` : f.name;
      return cn === columnName;
    });
    if (referencedField) {
      parts.push(JSON.stringify(expr.substring(lastIndex, match.index)));
      const tableRef = referencedField.inherited || !model.parent ? 'rootShort' : 'tableShort';
      parts.push(`'"' + ${tableRef} + '"."${columnName}"'`);
      lastIndex = match.index + match[0].length;
    }
  }
  if (lastIndex < expr.length) {
    parts.push(JSON.stringify(expr.substring(lastIndex)));
  }

  if (parts.length) {
    writer.writeLine(`const expr = ${parts.join(' + ')};`);
  } else {
    writer.writeLine(`const expr = ${JSON.stringify(expr)};`);
  }
  writer.writeLine('void query.select(node.ctx.knex.raw(`(${expr}) as ??`, [`${resultShort}__${fieldAlias}`]));');
};

const getCrossModelSelectImports = (model: EntityModel, allModels: Models): Map<string, string[]> => {
  const imports = new Map<string, string[]>();
  const addImport = (modelName: string, fn: string) => {
    if (modelName === model.name) return;
    if (!imports.has(modelName)) imports.set(modelName, []);
    const fns = imports.get(modelName)!;
    if (!fns.includes(fn)) fns.push(fn);
  };

  const toOneRelations = getToOneRelations(model);
  for (const rel of toOneRelations) {
    addImport(rel.targetModelName, `apply${rel.targetModelName}Selects`);
  }

  if (model.root) {
    const subtypes = allModels.entities.filter((m) => m.parent === model.name);
    for (const sub of subtypes) {
      addImport(sub.name, `apply${sub.name}Selects`);
    }
  }

  return imports;
};

export const generateModelSelectsFile = (model: EntityModel, allModels: Models, gqmModule: string) => {
  const writer = createWriter();

  writer.writeLine("import { Knex } from 'knex';");
  writeImports(writer, gqmModule, [
    'ID_ALIAS',
    'TYPE_ALIAS',
    'isFieldNode',
    'isInlineFragmentNode',
    'isFragmentSpreadNode',
    'getNameOrAlias',
    'getFragmentTypeName',
    'addJoin',
    'UserInputError',
    'PermissionError',
    'getRole',
  ]);
  writer.writeLine(`import type { Joins } from '${gqmModule}';`);
  writer.writeLine(`import type { ConcreteResolverNode } from '${gqmModule}';`);

  const crossImports = getCrossModelSelectImports(model, allModels);
  for (const [otherModel, fns] of crossImports) {
    writer.writeLine(`import { ${fns.join(', ')} } from '../${toKebabCase(otherModel)}/selects';`);
  }
  writer.blankLine();

  generateModelSelects(writer, model, allModels);

  return writer.toString();
};
