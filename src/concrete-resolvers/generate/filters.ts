import CodeBlockWriter from 'code-block-writer';
import { EntityModel, Models } from '../../models/models';
import { isCustomField, isRelation } from '../../models/utils';
import { createWriter, getDbColumnName, getSearchableFields, toKebabCase, writeImports } from './utils';

const generateModelFilters = (writer: CodeBlockWriter, model: EntityModel) => {
  generateApplyFilters(writer, model);
  writer.blankLine();
  generateApplyWhere(writer, model);
  writer.blankLine();
  generateApplyOrderBy(writer, model);
  writer.blankLine();
  generateApplySearch(writer, model);
  writer.blankLine();
};

const generateApplyFilters = (writer: CodeBlockWriter, model: EntityModel) => {
  const modelName = model.name;
  const defaultOrderBy = model.defaultOrderBy;

  writer.write(`export const apply${modelName}Filters = async (`).newLine();
  writer.write(`  node: ConcreteFieldNode,`).newLine();
  writer.write(`  query: Knex.QueryBuilder,`).newLine();
  writer.write(`  joins: Joins,`).newLine();
  writer.write(`) => `).inlineBlock(() => {
    writer.writeLine(
      'const normalizedArguments = concreteNormalizeArguments(node.field, node.fieldDefinition, node.ctx.info.schema, node.ctx.info.variableValues);',
    );
    writer.blankLine();

    writer.write('if (!node.isAggregate) ').inlineBlock(() => {
      writer.write('if (!normalizedArguments.orderBy) ').inlineBlock(() => {
        if (defaultOrderBy) {
          writer.writeLine(`normalizedArguments.orderBy = ${JSON.stringify(defaultOrderBy)};`);
        } else if (model.creatable) {
          writer.writeLine("normalizedArguments.orderBy = [{ createdAt: 'DESC' }];");
        }
      });
    });
    writer.blankLine();

    writer.writeLine('const { limit, offset, orderBy, where, search } = normalizedArguments;');
    writer.blankLine();

    writer.writeLine(
      `await node.ctx.queryHook?.({ model: node.ctx.models.getModel('${modelName}', 'entity'), query, args: normalizedArguments, ctx: node.ctx });`,
    );
    writer.blankLine();

    writer.write('if (limit) ').inlineBlock(() => {
      writer.writeLine('query.limit(limit);');
    });
    writer.blankLine();

    writer.write('if (offset) ').inlineBlock(() => {
      writer.writeLine('query.offset(offset);');
    });
    writer.blankLine();

    writer.write('if (orderBy) ').inlineBlock(() => {
      writer.writeLine(`apply${modelName}OrderBy(node.ctx, node.rootTableAlias, node.tableAlias, orderBy, query, joins);`);
    });
    writer.blankLine();

    if (model.parent) {
      const tableRef = 'node.rootTableAlias';
      writer.writeLine(`void query.where({ [\`\${node.ctx.aliases.getShort(${tableRef})}.type\`]: '${modelName}' });`);
      writer.blankLine();
    }

    writer.writeLine('const ops: QueryBuilderOps = [];');
    writer.writeLine(`apply${modelName}Where(node.ctx, node.rootTableAlias, node.tableAlias, where, ops, joins);`);
    writer.writeLine('apply(query, ops);');
    writer.blankLine();

    writer.write('if (search) ').inlineBlock(() => {
      writer.writeLine(`apply${modelName}Search(node.ctx, node.rootTableAlias, node.tableAlias, search, query);`);
    });
  });
};

const generateApplyWhere = (writer: CodeBlockWriter, model: EntityModel) => {
  const modelName = model.name;
  const fields = model.fields.filter((f) => !isCustomField(f));
  const relations = model.relations;
  const reverseRelations = model.reverseRelations.filter((rr) => !rr.field.inherited);

  writer.write(`export const apply${modelName}Where = (`).newLine();
  writer.write(`  ctx: FullContext,`).newLine();
  writer.write(`  rootTableAlias: string,`).newLine();
  writer.write(`  tableAlias: string,`).newLine();
  writer.write(`  where: Record<string, any> | undefined,`).newLine();
  writer.write(`  ops: QueryBuilderOps,`).newLine();
  writer.write(`  joins: Joins,`).newLine();
  writer.write(`) => `).inlineBlock(() => {
    if (model.deletable) {
      writer.write('if (where === undefined || where === null) ').inlineBlock(() => {
        writer.writeLine('where = {};');
      });
      writer
        .write('if (where!.deleted && (!Array.isArray(where!.deleted) || where!.deleted.some((v: unknown) => v))) ')
        .inlineBlock(() => {
          writer.write(`if (!getPermissionStack(ctx, '${modelName}', 'DELETE')) `).inlineBlock(() => {
            writer.writeLine("throw new ForbiddenError('You cannot access deleted entries.');");
          });
        });
      writer.write('else ').inlineBlock(() => {
        writer.writeLine('where!.deleted = false;');
      });
      writer.blankLine();
    }

    writer.write('if (!where) ').inlineBlock(() => {
      writer.writeLine('return;');
    });
    writer.blankLine();

    writer.writeLine('const aliases = ctx.aliases;');
    writer.blankLine();

    writer.write('for (const key of Object.keys(where)) ').inlineBlock(() => {
      writer.writeLine('const value = where[key];');
      writer.blankLine();

      writer.write("if (key === 'NOT') ").inlineBlock(() => {
        writer.writeLine('const subOps: QueryBuilderOps = [];');
        writer.writeLine(`apply${modelName}Where(ctx, rootTableAlias, tableAlias, value, subOps, joins);`);
        writer.writeLine('ops.push((query) => query.whereNot((subQuery) => apply(subQuery, subOps)));');
        writer.writeLine('continue;');
      });
      writer.blankLine();

      writer.write("if (key === 'AND') ").inlineBlock(() => {
        writer.write('for (const subWhere of value) ').inlineBlock(() => {
          writer.writeLine(`apply${modelName}Where(ctx, rootTableAlias, tableAlias, subWhere, ops, joins);`);
        });
        writer.writeLine('continue;');
      });
      writer.blankLine();

      writer.write("if (key === 'OR') ").inlineBlock(() => {
        writer.writeLine('const allSubOps: QueryBuilderOps[] = [];');
        writer.write('for (const subWhere of value) ').inlineBlock(() => {
          writer.writeLine('const subOps: QueryBuilderOps = [];');
          writer.writeLine(`apply${modelName}Where(ctx, rootTableAlias, tableAlias, subWhere, subOps, joins);`);
          writer.writeLine('allSubOps.push(subOps);');
        });
        writer.writeLine(
          'ops.push((query) => ors(query, allSubOps.map((subOps) => (subQuery: any) => apply(subQuery, subOps))));',
        );
        writer.writeLine('continue;');
      });
      writer.blankLine();

      writer.writeLine('const specialFilter = key.match(/^(\\w+)_(\\w+)$/);');
      writer.write('if (specialFilter) ').inlineBlock(() => {
        writer.writeLine('const [, actualKey, filter] = specialFilter;');
        writer.blankLine();

        if (reverseRelations.length) {
          writer.write("if (filter === 'SOME' || filter === 'NONE') ").inlineBlock(() => {
            writer.write('switch (actualKey) ').inlineBlock(() => {
              for (const rr of reverseRelations) {
                writer.write(`case '${rr.name}': `).inlineBlock(() => {
                  writer.writeLine('const subRootAlias = `${tableAlias}__W__${key}`;');
                  if (rr.targetModel.name !== rr.targetModel.rootModel.name) {
                    writer.writeLine('const subAlias = `${tableAlias}__WS_${key}`;');
                  } else {
                    writer.writeLine('const subAlias = subRootAlias;');
                  }
                  writer.writeLine('const subOps: QueryBuilderOps = [];');
                  writer.writeLine('const subJoins: Joins = [];');
                  writer.writeLine(
                    `apply${rr.targetModel.name}Where(ctx, subRootAlias, subAlias, value, subOps, subJoins);`,
                  );
                  writer.writeLine(
                    "ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {",
                  );
                  writer.writeLine(
                    `  void subQuery.from(\`${rr.targetModel.rootModel.name} as \${aliases.getShort(subAlias)}\`)`,
                  );
                  writer.writeLine(
                    `    .whereRaw('?? = ??', [\`\${aliases.getShort(subAlias)}.${rr.field.foreignKey}\`, \`\${aliases.getShort(tableAlias)}.id\`]);`,
                  );
                  writer.writeLine('  void apply(subQuery, subOps);');
                  writer.writeLine('  applyJoins(aliases, subQuery, subJoins);');
                  writer.writeLine('}));');
                  writer.writeLine('break;');
                });
                writer.newLine();
              }
            });
            writer.writeLine('continue;');
          });
          writer.blankLine();
        }

        writer.write('if (SPECIAL_FILTERS[filter]) ').inlineBlock(() => {
          writer.write('switch (actualKey) ').inlineBlock(() => {
            for (const field of fields.filter((f) => !isRelation(f))) {
              const isExpr = field.generateAs?.type === 'expression';
              const inherited = !!field.inherited;
              const tableRef = inherited || !model.parent ? 'rootTableAlias' : 'tableAlias';
              if (isExpr) {
                writer.write(`case '${field.name}': `).inlineBlock(() => {
                  generateExpressionColumn(writer, field, model, 'rootTableAlias', 'tableAlias');
                  writer.writeLine(
                    "const operator = filter === 'GT' ? '>' : filter === 'GTE' ? '>=' : filter === 'LT' ? '<' : '<=';",
                  );
                  writer.writeLine('ops.push((query) => query.whereRaw(`${col} ${operator} ?`, [value as string]));');
                  writer.writeLine('break;');
                });
                writer.newLine();
              } else {
                writer.write(`case '${field.name}': `).inlineBlock(() => {
                  writer.writeLine(
                    `ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [\`\${aliases.getShort(${tableRef})}.${getDbColumnName(field)}\`, value as string]));`,
                  );
                  writer.writeLine('break;');
                });
                writer.newLine();
              }
            }
          });
          writer.writeLine('continue;');
        });
        writer.writeLine('continue;');
      });
      writer.blankLine();

      writer.write('switch (key) ').inlineBlock(() => {
        for (const field of fields) {
          if (isRelation(field)) {
            const relation = relations.find((r) => r.field.name === field.name);
            if (!relation) {
              continue;
            }
            const inherited = !!field.inherited;
            const tableRef = inherited || !model.parent ? 'rootTableAlias' : 'tableAlias';
            const fk = field.foreignKey || `${field.name}Id`;
            const isExpr = field.generateAs?.type === 'expression';

            writer.write(`case '${field.name}': `).inlineBlock(() => {
              writer.write('if (value === null) ').inlineBlock(() => {
                if (isExpr) {
                  generateExpressionColumn(writer, field, model, 'rootTableAlias', 'tableAlias');
                  writer.writeLine('ops.push((query) => query.whereRaw(`${col} IS NULL`));');
                } else {
                  writer.writeLine(`ops.push((query) => query.whereNull(\`\${aliases.getShort(${tableRef})}.${fk}\`));`);
                }
                writer.writeLine('continue;');
              });
              const targetRootName = relation.targetModel.rootModel.name;
              const targetName = relation.targetModel.name;
              writer.writeLine(`const subRootAlias = \`${model.name}__W__\${key}\`;`);
              if (targetName !== targetRootName) {
                writer.writeLine(`const subAlias = \`${model.name}__WS__\${key}\`;`);
              } else {
                writer.writeLine('const subAlias = subRootAlias;');
              }
              writer.writeLine(`addJoin(joins, tableAlias, '${targetRootName}', subAlias, '${fk}', 'id');`);
              writer.writeLine(`apply${targetName}Where(ctx, subRootAlias, subAlias, value, ops, joins);`);
              writer.writeLine('break;');
            });
            writer.newLine();
          } else {
            const inherited = !!field.inherited;
            const tableRef = inherited || !model.parent ? 'rootTableAlias' : 'tableAlias';
            const isExpr = field.generateAs?.type === 'expression';
            const colName = getDbColumnName(field);

            writer.write(`case '${field.name}': `).inlineBlock(() => {
              if (isExpr) {
                generateExpressionColumn(writer, field, model, 'rootTableAlias', 'tableAlias');
                generateWhereValueHandling(writer, true, !!field.list);
              } else {
                writer.writeLine(`const col = \`\${aliases.getShort(${tableRef})}.${colName}\`;`);
                generateWhereValueHandling(writer, false, !!field.list);
              }
              writer.writeLine('break;');
            });
            writer.newLine();
          }
        }
      });
    });
  });
};

const generateExpressionColumn = (
  writer: CodeBlockWriter,
  field: EntityModel['fields'][0],
  model: EntityModel,
  rootTableRef: string,
  tableRef: string,
) => {
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
    const referencedField = model.fields.find((f) => getDbColumnName(f) === columnName);
    if (referencedField) {
      parts.push(JSON.stringify(expr.substring(lastIndex, match.index)));
      const ref = referencedField.inherited || !model.parent ? rootTableRef : tableRef;
      parts.push(`'"' + aliases.getShort(${ref}) + '"."${columnName}"'`);
      lastIndex = match.index + match[0].length;
    }
  }
  if (lastIndex < expr.length) {
    parts.push(JSON.stringify(expr.substring(lastIndex)));
  }
  writer.writeLine(`const col = '(' + ${parts.length ? parts.join(' + ') : JSON.stringify(expr)} + ')';`);
};

const generateWhereValueHandling = (writer: CodeBlockWriter, isExpression: boolean, isList: boolean) => {
  writer.write('if (Array.isArray(value)) ').inlineBlock(() => {
    if (isList) {
      if (isExpression) {
        writer.writeLine(
          'ops.push((query) => ors(query, value.map((v: any) => (subQuery: any) => subQuery.whereRaw(`? = ANY(${col})`, [v]))));',
        );
      } else {
        writer.writeLine(
          "ops.push((query) => ors(query, value.map((v: any) => (subQuery: any) => subQuery.whereRaw('? = ANY(??)', [v, col] as string[]))));",
        );
      }
    } else {
      writer.write('if (value.some((v: any) => v === null)) ').inlineBlock(() => {
        writer.write('if (value.some((v: any) => v !== null)) ').inlineBlock(() => {
          if (isExpression) {
            writer.writeLine(
              "ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereRaw(`${col} IN (${value.filter((v: any) => v !== null).map(() => '?').join(',')})`, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereRaw(`${col} IS NULL`)]));",
            );
          } else {
            writer.writeLine(
              'ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));',
            );
          }
        });
        writer.write('else ').inlineBlock(() => {
          if (isExpression) {
            writer.writeLine('ops.push((query) => query.whereRaw(`${col} IS NULL`));');
          } else {
            writer.writeLine('ops.push((query) => query.whereNull(col));');
          }
        });
      });
      writer.write('else ').inlineBlock(() => {
        if (isExpression) {
          writer.writeLine("ops.push((query) => query.whereRaw(`${col} IN (${value.map(() => '?').join(',')})`, value));");
        } else {
          writer.writeLine('ops.push((query) => query.whereIn(col, value));');
        }
      });
    }
  });
  writer.write('else if (value === null) ').inlineBlock(() => {
    if (isExpression) {
      writer.writeLine('ops.push((query) => query.whereRaw(`${col} IS NULL`));');
    } else {
      writer.writeLine('ops.push((query) => query.whereNull(col));');
    }
  });
  writer.write('else ').inlineBlock(() => {
    if (isExpression) {
      writer.writeLine('ops.push((query) => query.whereRaw(`${col} = ?`, [value]));');
    } else {
      writer.writeLine('ops.push((query) => query.where({ [col]: value }));');
    }
  });
};

const generateApplyOrderBy = (writer: CodeBlockWriter, model: EntityModel) => {
  const modelName = model.name;
  const fields = model.fields.filter((f) => !isCustomField(f));
  const relations = model.relations;

  writer.write(`export const apply${modelName}OrderBy = (`).newLine();
  writer.write(`  ctx: FullContext,`).newLine();
  writer.write(`  rootTableAlias: string,`).newLine();
  writer.write(`  tableAlias: string,`).newLine();
  writer.write(`  orderBy: any | any[],`).newLine();
  writer.write(`  query: Knex.QueryBuilder,`).newLine();
  writer.write(`  joins: Joins,`).newLine();
  writer.write(`) => `).inlineBlock(() => {
    writer.writeLine('const aliases = ctx.aliases;');
    writer.write('for (const vals of Array.isArray(orderBy) ? orderBy : [orderBy]) ').inlineBlock(() => {
      writer.writeLine('const keys = Object.keys(vals);');
      writer.write('if (keys.length !== 1) ').inlineBlock(() => {
        writer.writeLine(
          "throw new UserInputError('You need to specify exactly 1 value to order by for each orderBy entry.');",
        );
      });
      writer.writeLine('const key = keys[0];');
      writer.writeLine('const value = vals[key];');
      writer.blankLine();

      writer.write('switch (key) ').inlineBlock(() => {
        for (const field of fields) {
          if (isRelation(field)) {
            const relation = relations.find((r) => r.field.name === field.name);
            if (!relation) {
              continue;
            }
            const fk = field.foreignKey || `${field.name}Id`;
            const targetRootName = relation.targetModel.rootModel.name;
            const targetName = relation.targetModel.name;
            writer.write(`case '${field.name}': `).inlineBlock(() => {
              writer.writeLine(`const subRootAlias = \`${modelName}__O__\${key}\`;`);
              if (targetName !== targetRootName) {
                writer.writeLine(`const subAlias = \`${modelName}__OS__\${key}\`;`);
              } else {
                writer.writeLine('const subAlias = subRootAlias;');
              }
              writer.writeLine(`addJoin(joins, tableAlias, '${targetRootName}', subAlias, '${fk}', 'id');`);
              writer.writeLine(`apply${targetName}OrderBy(ctx, subRootAlias, subAlias, value, query, joins);`);
              writer.writeLine('break;');
            });
            writer.newLine();
          } else {
            const inherited = !!field.inherited;
            const tableRef = inherited || !model.parent ? 'rootTableAlias' : 'tableAlias';
            const isExpr = field.generateAs?.type === 'expression';
            const colName = getDbColumnName(field);

            writer.write(`case '${field.name}': `).inlineBlock(() => {
              if (isExpr) {
                generateExpressionColumn(writer, field, model, 'rootTableAlias', 'tableAlias');
                writer.writeLine('void query.orderByRaw(`${col} ${value}`);');
              } else {
                writer.writeLine(`void query.orderBy(\`\${aliases.getShort(${tableRef})}.${colName}\`, value);`);
              }
              writer.writeLine('break;');
            });
            writer.newLine();
          }
        }
      });
    });
  });
};

const generateApplySearch = (writer: CodeBlockWriter, model: EntityModel) => {
  const modelName = model.name;
  const searchableFields = getSearchableFields(model);

  writer.write(`export const apply${modelName}Search = (`).newLine();
  writer.write(`  ctx: FullContext,`).newLine();
  writer.write(`  rootTableAlias: string,`).newLine();
  writer.write(`  tableAlias: string,`).newLine();
  writer.write(`  search: string,`).newLine();
  writer.write(`  query: Knex.QueryBuilder,`).newLine();
  writer.write(`) => `).inlineBlock(() => {
    if (!searchableFields.length) {
      writer.writeLine('void search;');
      writer.writeLine('void query;');
      return;
    }

    writer.writeLine('const aliases = ctx.aliases;');
    writer.writeLine('ors(query, [');
    for (const field of searchableFields) {
      const tableRef = field.inherited || !model.parent ? 'rootTableAlias' : 'tableAlias';
      if (field.isExpression) {
        writer.writeLine(
          `  (q: any) => q.whereRaw(\`\${aliases.getShort(${tableRef})}.${field.name}::text ILIKE ?\`, [\`%\${search}%\`]),`,
        );
      } else {
        writer.writeLine(
          `  (q: any) => q.whereRaw('??::text ILIKE ?', [\`\${aliases.getShort(${tableRef})}.${field.name}\`, \`%\${search}%\`]),`,
        );
      }
    }
    writer.writeLine(']);');
  });
};

const getCrossModelFilterImports = (model: EntityModel): Map<string, string[]> => {
  const imports = new Map<string, string[]>();
  const addImport = (modelName: string, fn: string) => {
    if (modelName === model.name) return;
    if (!imports.has(modelName)) imports.set(modelName, []);
    const fns = imports.get(modelName)!;
    if (!fns.includes(fn)) fns.push(fn);
  };

  const fields = model.fields.filter((f) => !isCustomField(f));
  const relations = model.relations;
  const reverseRelations = model.reverseRelations.filter((rr) => !rr.field.inherited);

  for (const rr of reverseRelations) {
    addImport(rr.targetModel.name, `apply${rr.targetModel.name}Where`);
  }

  for (const field of fields) {
    if (isRelation(field)) {
      const relation = relations.find((r) => r.field.name === field.name);
      if (relation) {
        addImport(relation.targetModel.name, `apply${relation.targetModel.name}Where`);
        addImport(relation.targetModel.name, `apply${relation.targetModel.name}OrderBy`);
      }
    }
  }

  return imports;
};

export const generateModelFiltersFile = (model: EntityModel, allModels: Models, gqmModule: string) => {
  const writer = createWriter();

  writer.writeLine("import { Knex } from 'knex';");
  writeImports(writer, gqmModule, [
    'FullContext',
    'ForbiddenError',
    'UserInputError',
    'getPermissionStack',
    'addJoin',
    'applyJoins',
    'ors',
    'apply',
    'SPECIAL_FILTERS',
    'concreteNormalizeArguments',
  ]);
  writer.writeLine(`import type { Joins, QueryBuilderOps } from '${gqmModule}';`);
  writer.writeLine(`import type { ConcreteFieldNode } from '${gqmModule}';`);

  const crossImports = getCrossModelFilterImports(model);
  for (const [otherModel, fns] of crossImports) {
    writer.writeLine(`import { ${fns.join(', ')} } from '../${toKebabCase(otherModel)}/filters';`);
  }
  writer.blankLine();

  generateModelFilters(writer, model);

  void allModels;
  return writer.toString();
};
