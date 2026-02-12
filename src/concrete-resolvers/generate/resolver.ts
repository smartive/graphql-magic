import CodeBlockWriter from 'code-block-writer';
import { EntityModel, Models } from '../../models/models';
import { isRootModel } from '../../models/utils';
import { createWriter, getToManyRelations, getToOneRelations, toKebabCase, writeImports } from './utils';

const generateBuildQuery = (writer: CodeBlockWriter, model: EntityModel) => {
  const modelName = model.name;
  const rootModelName = model.rootModel.name;

  writer.write(`export const build${modelName}Query = async (`).newLine();
  writer.write(`  node: ConcreteFieldNode,`).newLine();
  writer.write(`  parentVerifiedPermissionStacks?: VerifiedPermissionStacks,`).newLine();
  writer
    .write(`): Promise<{ query: Knex.QueryBuilder; verifiedPermissionStacks: VerifiedPermissionStacks }> => `)
    .inlineBlock(() => {
      writer.writeLine(
        `const query = node.ctx.knex.fromRaw(\`"${rootModelName}" as "\${node.ctx.aliases.getShort(node.resultAlias)}"\`);`,
      );
      writer.blankLine();

      writer.writeLine('const joins: Joins = [];');
      writer.writeLine(`await apply${modelName}Filters(node, query, joins);`);
      writer.writeLine(`apply${modelName}Selects(node, query, joins);`);
      writer.writeLine('applyJoins(node.ctx.aliases, query, joins);');
      writer.blankLine();

      writer.writeLine('const tables: [string, string][] = [');
      writer.writeLine(`  ['${rootModelName}', node.rootTableAlias],`);
      writer.writeLine('  ...joins.map(({ table2Name, table2Alias }) => [table2Name, table2Alias] as [string, string]),');
      writer.writeLine('];');
      writer.blankLine();

      writer.writeLine('const verifiedPermissionStacks: VerifiedPermissionStacks = {};');
      writer.write('for (const [table, alias] of tables) ').inlineBlock(() => {
        writer.writeLine('const verifiedPermissionStack = applyPermissions(');
        writer.writeLine("  node.ctx, table, node.ctx.aliases.getShort(alias), query, 'READ',");
        writer.writeLine("  parentVerifiedPermissionStacks?.[alias.split('__').slice(0, -1).join('__')],");
        writer.writeLine(');');
        writer.write("if (typeof verifiedPermissionStack !== 'boolean') ").inlineBlock(() => {
          writer.writeLine('verifiedPermissionStacks[alias] = verifiedPermissionStack;');
        });
      });
      writer.blankLine();

      writer.writeLine('return { query, verifiedPermissionStacks };');
    });
  writer.blankLine();
};

const generateApplySubQueries = (writer: CodeBlockWriter, model: EntityModel, allModels: Models) => {
  const modelName = model.name;
  const toManyRelations = getToManyRelations(model);
  const toOneRelations = getToOneRelations(model);
  const isRoot = isRootModel(model);
  const subtypes = isRoot ? allModels.entities.filter((m) => m.parent === model.name) : [];

  writer.write(`export const apply${modelName}SubQueries = async (`).newLine();
  writer.write(`  node: ConcreteResolverNode,`).newLine();
  writer.write(`  entries: Entry[],`).newLine();
  writer.write(`  parentVerifiedPermissionStacks: VerifiedPermissionStacks,`).newLine();
  writer.write(`): Promise<void> => `).inlineBlock(() => {
    writer.write('if (node.isAggregate) ').inlineBlock(() => {
      writer.writeLine('return;');
    });
    writer.blankLine();
    writer.write('if (!entries.length) ').inlineBlock(() => {
      writer.writeLine('return;');
    });
    writer.blankLine();

    writer.writeLine('const entriesById: Record<string, Entry[]> = {};');
    writer.write('for (const entry of entries) ').inlineBlock(() => {
      writer.write('if (!entriesById[entry[ID_ALIAS]]) ').inlineBlock(() => {
        writer.writeLine('entriesById[entry[ID_ALIAS]] = [];');
      });
      writer.writeLine('entriesById[entry[ID_ALIAS]].push(entry);');
    });
    writer.writeLine('const ids = Object.keys(entriesById);');
    writer.blankLine();

    writer
      .write('for (const subField of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) ')
      .inlineBlock(() => {
        writer.writeLine('const fieldName = subField.name.value;');
        writer.writeLine('const fieldAlias = getNameOrAlias(subField);');
        writer.blankLine();

        if (toManyRelations.length) {
          writer.write('switch (fieldName) ').inlineBlock(() => {
            for (const rel of toManyRelations) {
              writer.write(`case '${rel.fieldName}': `).inlineBlock(() => {
                writer.writeLine('const isList = true;');
                writer.writeLine('entries.forEach((entry) => (entry[fieldAlias] = []));');
                writer.blankLine();

                const subTableAlias = `\`\${node.tableAlias}__\${fieldAlias}\``;
                writer.writeLine(`const subTableAlias = ${subTableAlias};`);
                writer.writeLine(
                  `const subFieldDef = summonByKey(node.ctx.info.schema.getType('${model.name}')?.astNode?.fields || [], 'name.value', fieldName);`,
                );
                writer.writeLine('const subNode: ConcreteFieldNode = {');
                writer.writeLine('  ctx: node.ctx,');
                writer.writeLine('  rootTableAlias: subTableAlias,');
                writer.writeLine('  tableAlias: subTableAlias,');
                writer.writeLine('  resultAlias: subTableAlias,');
                writer.writeLine('  selectionSet: subField.selectionSet!.selections,');
                writer.writeLine('  isAggregate: false,');
                writer.writeLine('  field: subField,');
                writer.writeLine('  fieldDefinition: subFieldDef,');
                writer.writeLine('  isList: true,');
                writer.writeLine('};');
                writer.blankLine();

                writer.writeLine(
                  `const { query: subQuery, verifiedPermissionStacks } = await build${rel.targetModelName}Query(subNode, parentVerifiedPermissionStacks);`,
                );
                writer.writeLine('const shortTableAlias = node.ctx.aliases.getShort(subTableAlias);');
                writer.writeLine('const shortResultAlias = node.ctx.aliases.getShort(subTableAlias);');
                writer.writeLine('const queries = ids.map((id) =>');
                writer.writeLine('  subQuery.clone()');
                writer.writeLine(
                  `    .select(\`\${shortTableAlias}.${rel.foreignKey} as \${shortResultAlias}__${rel.foreignKey}\`)`,
                );
                writer.writeLine(`    .where({ [\`\${shortTableAlias}.${rel.foreignKey}\`]: id }),`);
                writer.writeLine(');');
                writer.blankLine();

                writer.writeLine('const rawChildren = (await Promise.all(queries)).flat();');
                writer.writeLine(`const children = concreteHydrate(subTableAlias, node.ctx.aliases, false, rawChildren);`);
                writer.blankLine();

                writer.write('for (const child of children) ').inlineBlock(() => {
                  writer
                    .write(`for (const entry of entriesById[child['${rel.foreignKey}'] as string] || []) `)
                    .inlineBlock(() => {
                      writer.writeLine('const childClone = cloneDeep(child);');
                      writer.writeLine('childClone.PARENT = entry;');
                      writer.writeLine('(entry[fieldAlias] as Entry[]).push(childClone);');
                    });
                });
                writer.blankLine();

                writer.writeLine(`await apply${rel.targetModelName}SubQueries(`);
                writer.writeLine('  subNode,');
                writer.writeLine('  flatMap(entries.map((entry) => {');
                writer.writeLine('    const children = entry[fieldAlias];');
                writer.writeLine('    return (Array.isArray(children) ? children : children ? [children] : []) as Entry[];');
                writer.writeLine('  })),');
                writer.writeLine('  verifiedPermissionStacks,');
                writer.writeLine(');');
                writer.writeLine('break;');
              });
              writer.newLine();
            }
          });
        }
      });

    if (subtypes.length) {
      writer.blankLine();
      writer.write('for (const fragment of node.selectionSet.filter(isInlineFragmentNode)) ').inlineBlock(() => {
        writer.writeLine('const typeName = getFragmentTypeName(fragment);');
        writer.write('switch (typeName) ').inlineBlock(() => {
          for (const sub of subtypes) {
            writer.write(`case '${sub.name}': `).inlineBlock(() => {
              writer.writeLine(`await apply${sub.name}SubQueries({`);
              writer.writeLine('  ...node,');
              writer.writeLine(`  selectionSet: fragment.selectionSet!.selections,`);
              writer.writeLine('}, entries, parentVerifiedPermissionStacks);');
              writer.writeLine('break;');
            });
            writer.newLine();
          }
        });
      });
      writer.blankLine();
      writer.write('for (const fragment of node.selectionSet.filter(isFragmentSpreadNode)) ').inlineBlock(() => {
        writer.writeLine('const def = node.ctx.info.fragments[fragment.name.value];');
        writer.writeLine(`await apply${modelName}SubQueries({`);
        writer.writeLine('  ...node,');
        writer.writeLine('  selectionSet: def.selectionSet.selections,');
        writer.writeLine('}, entries, parentVerifiedPermissionStacks);');
      });
    }

    if (toOneRelations.length) {
      writer.blankLine();
      writer
        .write('for (const subField of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) ')
        .inlineBlock(() => {
          writer.writeLine('const fieldName = subField.name.value;');
          writer.writeLine('const fieldAlias = getNameOrAlias(subField);');
          writer.write('switch (fieldName) ').inlineBlock(() => {
            for (const rel of toOneRelations) {
              writer.write(`case '${rel.fieldName}': `).inlineBlock(() => {
                writer.writeLine(`await apply${rel.targetModelName}SubQueries(`);
                writer.writeLine('  {');
                writer.writeLine('    ...node,');
                writer.writeLine(`    rootTableAlias: \`\${node.tableAlias}__\${fieldAlias}\`,`);
                writer.writeLine(`    tableAlias: \`\${node.tableAlias}__\${fieldAlias}\`,`);
                writer.writeLine(`    resultAlias: \`\${node.tableAlias}__\${fieldAlias}\`,`);
                writer.writeLine('    selectionSet: subField.selectionSet!.selections,');
                writer.writeLine('    isAggregate: false,');
                writer.writeLine('  },');
                writer.writeLine('  entries.map((item) => item[fieldAlias] as Entry).filter(Boolean),');
                writer.writeLine('  parentVerifiedPermissionStacks,');
                writer.writeLine(');');
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

const generateResolveFunction = (writer: CodeBlockWriter, model: EntityModel) => {
  const modelName = model.name;
  const rootModelName = model.rootModel.name;

  writer.write(`export const resolve${modelName} = async (`).newLine();
  writer.write(`  _parent: any,`).newLine();
  writer.write(`  _args: any,`).newLine();
  writer.write(`  partialCtx: Context,`).newLine();
  writer.write(`  info: GraphQLResolveInfo,`).newLine();
  writer.write(`) => `).inlineBlock(() => {
    writer.writeLine('const ctx: FullContext = { ...partialCtx, info, aliases: new AliasGenerator() };');
    writer.writeLine("const fieldNode = summonByKey(ctx.info.fieldNodes, 'name.value', ctx.info.fieldName);");
    writer.writeLine('const baseTypeDefinition = get(');
    writer.writeLine(
      "  ctx.info.operation.operation === 'query' ? ctx.info.schema.getQueryType() : ctx.info.schema.getMutationType(),",
    );
    writer.writeLine("  'astNode',");
    writer.writeLine(');');
    writer.writeLine(
      "const fieldDefinition = summonByKey(baseTypeDefinition.fields || [], 'name.value', fieldNode.name.value);",
    );
    writer.blankLine();

    writer.writeLine('const typeName = getTypeName(fieldDefinition.type);');
    writer.writeLine("const isAggregate = typeName.endsWith('Aggregate');");
    writer.writeLine('const isList = isListType(fieldDefinition.type);');
    writer.blankLine();

    writer.writeLine('const node: ConcreteFieldNode = {');
    writer.writeLine('  ctx,');
    writer.writeLine(`  rootTableAlias: '${rootModelName}',`);
    writer.writeLine(`  tableAlias: '${model.name}',`);
    writer.writeLine(`  resultAlias: '${rootModelName}',`);
    writer.writeLine('  selectionSet: fieldNode.selectionSet?.selections || [],');
    writer.writeLine('  isAggregate,');
    writer.writeLine('  field: fieldNode,');
    writer.writeLine('  fieldDefinition,');
    writer.writeLine('  isList,');
    writer.writeLine('};');
    writer.blankLine();

    writer.writeLine(`const { query, verifiedPermissionStacks } = await build${modelName}Query(node);`);
    writer.blankLine();

    writer.write("if (ctx.info.fieldName === 'me') ").inlineBlock(() => {
      writer.write('if (!ctx.user?.id) ').inlineBlock(() => {
        writer.writeLine('return undefined;');
      });
      writer.writeLine(`void query.where({ [\`\${ctx.aliases.getShort('${rootModelName}')}.id\`]: ctx.user.id });`);
    });
    writer.blankLine();

    writer.write('if (!isList) ').inlineBlock(() => {
      writer.writeLine('void query.limit(1);');
    });
    writer.blankLine();

    writer.write("if (process.env.DEBUG_GRAPHQL_MAGIC === 'true') ").inlineBlock(() => {
      writer.writeLine("console.debug('QUERY', query.toString());");
    });
    writer.writeLine('const raw = await query;');
    writer.blankLine();

    writer.writeLine(`const res = concreteHydrate<Entry>(node.resultAlias, ctx.aliases, node.isAggregate, raw);`);
    writer.blankLine();

    writer.writeLine(`await apply${modelName}SubQueries(node, res, verifiedPermissionStacks);`);
    writer.blankLine();

    writer.write('if (isList) ').inlineBlock(() => {
      writer.writeLine('return res;');
    });
    writer.blankLine();

    writer.write('if (!res[0]) ').inlineBlock(() => {
      writer.writeLine(`throw new NotFoundError('${modelName} not found.');`);
    });
    writer.blankLine();

    writer.writeLine('return res[0];');
  });
  writer.blankLine();
};

const getCrossModelResolverImports = (model: EntityModel, allModels: Models): Map<string, string[]> => {
  const imports = new Map<string, string[]>();
  const addImport = (modelName: string, fn: string) => {
    if (modelName === model.name) return;
    if (!imports.has(modelName)) imports.set(modelName, []);
    const fns = imports.get(modelName)!;
    if (!fns.includes(fn)) fns.push(fn);
  };

  const toManyRelations = getToManyRelations(model);
  for (const rel of toManyRelations) {
    addImport(rel.targetModelName, `build${rel.targetModelName}Query`);
    addImport(rel.targetModelName, `apply${rel.targetModelName}SubQueries`);
  }

  const toOneRelations = getToOneRelations(model);
  for (const rel of toOneRelations) {
    addImport(rel.targetModelName, `apply${rel.targetModelName}SubQueries`);
  }

  if (isRootModel(model)) {
    const subtypes = allModels.entities.filter((m) => m.parent === model.name);
    for (const sub of subtypes) {
      addImport(sub.name, `apply${sub.name}SubQueries`);
    }
  }

  return imports;
};

export const generateModelResolverFile = (model: EntityModel, allModels: Models, gqmModule: string) => {
  const writer = createWriter();
  const modelName = model.name;

  writer.writeLine("import { GraphQLResolveInfo } from 'graphql';");
  writer.writeLine("import { Knex } from 'knex';");
  writer.writeLine("import cloneDeep from 'lodash/cloneDeep';");
  writer.writeLine("import flatMap from 'lodash/flatMap';");
  writeImports(writer, gqmModule, [
    'Context',
    'FullContext',
    'NotFoundError',
    'applyPermissions',
    'applyJoins',
    'summonByKey',
    'get',
    'getTypeName',
    'isListType',
    'isFieldNode',
    'isInlineFragmentNode',
    'isFragmentSpreadNode',
    'getNameOrAlias',
    'getFragmentTypeName',
    'AliasGenerator',
    'ID_ALIAS',
    'concreteHydrate',
  ]);
  writer.writeLine(`import type { Joins } from '${gqmModule}';`);
  writer.writeLine(
    `import type { ConcreteResolverNode, ConcreteFieldNode, Entry, VerifiedPermissionStacks } from '${gqmModule}';`,
  );

  writer.writeLine(`import { apply${modelName}Filters } from './filters';`);
  writer.writeLine(`import { apply${modelName}Selects } from './selects';`);

  const crossImports = getCrossModelResolverImports(model, allModels);
  for (const [otherModel, fns] of crossImports) {
    writer.writeLine(`import { ${fns.join(', ')} } from '../${toKebabCase(otherModel)}/resolver';`);
  }
  writer.blankLine();

  generateBuildQuery(writer, model);
  generateApplySubQueries(writer, model, allModels);
  generateResolveFunction(writer, model);

  return writer.toString();
};
