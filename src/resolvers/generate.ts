import CodeBlockWriter from 'code-block-writer';
import { DATE_CLASS, DATE_CLASS_IMPORT, isRootModel, Models, not } from '..';
import { EntityField } from '../models/models';
import { isPrimitive } from '../models/utils';

export const isEndOfDay = (field?: EntityField) =>
  isPrimitive(field) && field.type === 'DateTime' && field?.endOfDay === true && field?.dateTimeType === 'date';

export const generateResolvers = (
  models: Models,
  { dateLibrary, gqmModule }: { dateLibrary: string; gqmModule: string }
) => {
  const importWriter: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });
  const imported = new Set<string>();
  const writeImport = (string: string) => {
    if (!imported.has(string)) {
      imported.add(string);
      importWriter.writeLine(string);
    }
  };

  importWriter.write(`
    import { GraphQLResolveInfo } from 'graphql';
    import { IncomingMessage } from 'http';
    import { v4 as uuid } from 'uuid';
    import { Knex } from 'knex';
    import * as db from '../db';
    import * as api from '../api';
  `);
  importWriter.writeLine(DATE_CLASS_IMPORT[dateLibrary]);
  importWriter.writeLine(
    `import { Models, Permissions, AliasGenerator, applyPermissions, queryResolver, getEntityToMutate, resolve, checkCanWrite, GraphQLError, ForbiddenError, anyDateToLuxon, EntityModel, get } from '${gqmModule}';`
  );

  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  writer.write(`
    export type Entity = Record<string, unknown>;

    export type Action = 'create' | 'update' | 'delete' | 'restore';

    export type MutationHook = (
      model: EntityModel,
      action: Action,
      when: 'before' | 'after',
      data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity },
      ctx: Context
    ) => Promise<void>;

    export type User = { id: string; role: string };

    export type Context = {
      req: IncomingMessage;
      now: ${DATE_CLASS[dateLibrary]};
      timeZone?: string;
      knex: Knex;
      locale: string;
      locales: string[];
      user?: User;
      models: Models;
      permissions: Permissions;
      mutationHook?: MutationHook;
    };

    export type FullContext = Context & {
      info: GraphQLResolveInfo;
      aliases: AliasGenerator;
    };

    type Callbacks = (() => Promise<void>)[];

    type DeleteContext = {
      model: EntityModel;
      toDelete: { [type: string]: { [id: string]: string } };
      toUnlink: {
        [type: string]: {
          [id: string]: {
            display: string;
            fields: string[];
          };
        };
      };
      dryRun: boolean;
      beforeHooks: Callbacks;
      mutations: Callbacks;
      afterHooks: Callbacks;
    };

    type RestoreContext = {
      entity: any;
      model: EntityModel;
      beforeHooks: Callbacks;
      mutations: Callbacks;
      afterHooks: Callbacks;
    };
  `);

  importWriter.blankLine();

  writer
    .write(`export const resolvers = `)
    .inlineBlock(() => {
      writer
        .write('Query: ')
        .inlineBlock(() => {
          writer.writeLine('me: queryResolver,');
          for (const model of models.entities.filter(({ queriable }) => queriable)) {
            writer.writeLine(`${model.asField}: queryResolver,`);
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
            writer
              .writeLine(
                `create${model.name}: async (_parent: unknown, { data: input }: api.MutationCreate${model.name}Args, partialCtx: Context, info: GraphQLResolveInfo) => `
              )
              .inlineBlock(() => {
                writer
                  .write(`return await partialCtx.knex.transaction(async (knex) => `)
                  .inlineBlock(() => {
                    writer.writeLine(
                      `const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };`
                    );
                    writer.writeLine(`const model = ctx.models.getModel('${model.name}', 'entity');`);
                    writer.writeLine(
                      `const normalizedInput: Partial<${
                        model.rootModel
                          ? `db.${model.rootModel.name}Initializer & db.${model.name}Initializer`
                          : `db.${model.name}Initializer`
                      }> = { ...input };`
                    );
                    writer.writeLine(`normalizedInput.id = uuid();`);
                    writer.writeLine(`normalizedInput.createdAt = ctx.now;`);
                    writer.writeLine(`normalizedInput.createdById = ctx.user?.id;`);
                    if (model.parent) {
                      writer.writeLine(`normalizedInput.type = '${model.name}';`);
                    }
                    if (model.updatable) {
                      writer.writeLine(`normalizedInput.updatedAt = ctx.now;`);
                      writer.writeLine(`normalizedInput.updatedById = ctx.user?.id;`);
                    }

                    for (const field of model.fields.filter((field) => field.creatable)) {
                      if (isEndOfDay(field)) {
                        writer
                          .write(`if (normalizedInput.${field.name}) `)
                          .inlineBlock(() => {
                            writer.writeLine(
                              `normalizedInput.${field.name} = anyDateToLuxon(normalizedInput.${field.name}, ctx.timeZone).endOf('day');`
                            );
                          })
                          .blankLine();
                      }

                      if (field.list && field.kind === 'enum') {
                        writer
                          .write(`if (Array.isArray(normalizedInput.${field.name})) `)
                          .inlineBlock(() => {
                            writer.writeLine(
                              `normalizedInput.${field.name} = \`{\${(normalizedInput.${field.name} as string[]).join(',')}}\`;`
                            );
                          })
                          .blankLine();
                        continue;
                      }
                    }

                    writer.writeLine(`await checkCanWrite(ctx, model, normalizedInput, 'CREATE');`);

                    writer.writeLine(`const data = { prev: {}, input, normalizedInput, next: normalizedInput }`);
                    writer.writeLine(`await ctx.mutationHook?.(model, 'create', 'before', data, ctx);`);
                    if (model.parent) {
                      writeImport(`import { pick } from 'lodash';`);

                      writer.writeLine(
                        `const rootInput: Partial<db.${
                          model.rootModel.name
                        }Initializer> = pick(normalizedInput, ${model.fields
                          .filter((field) => field.inherited)
                          .map((field) => `'${field.kind === 'relation' ? `${field.name}Id` : field.name}'`)
                          .join(', ')});`
                      );
                      writer.writeLine(
                        `const childInput: Partial<db.${model.name}Initializer> = pick(normalizedInput, 'id', ${model.fields
                          .filter((field) => !field.inherited)
                          .map((field) => `'${field.kind === 'relation' ? `${field.name}Id` : field.name}'`)
                          .join(', ')});`
                      );
                      writer.writeLine(`await knex(model.parent).insert(rootInput);`);
                      writer.writeLine(`await knex(model.name).insert(childInput);`);
                    } else {
                      writer.writeLine(`await knex(model.name).insert(normalizedInput);`);
                    }
                    writer.writeLine(`await create${model.name}Revision(normalizedInput as db.Full${model.name}, ctx);`);
                    writer.writeLine(`await ctx.mutationHook?.(model, 'create', 'after', data, ctx);`);

                    writer.writeLine(`return await resolve(ctx, normalizedInput.id);`);
                  })
                  .write(');')
                  .newLine();
              })
              .write(',')
              .blankLine();
          }),
        ...models.entities
          .filter(not(isRootModel))
          .filter(({ updatable }) => updatable)
          .map((model) => () => {
            writer
              .writeLine(
                `update${model.name}: async (_parent: unknown, { where, data: input }: api.MutationUpdate${model.name}Args, partialCtx: Context, info: GraphQLResolveInfo) => `
              )
              .inlineBlock(() => {
                writer
                  .write(`return await partialCtx.knex.transaction(async (knex) => `)
                  .inlineBlock(() => {
                    writer.writeLine(
                      `const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };`
                    );
                    writer.writeLine(`const model = ctx.models.getModel('${model.name}', 'entity');`);
                    writer.write(`if (Object.keys(where).length === 0) `).inlineBlock(() => {
                      writer.writeLine(`throw new Error(\`No ${model.name} specified.\`);`);
                    });

                    writer.writeLine(
                      `const normalizedInput: Partial<${
                        model.rootModel
                          ? `db.${model.rootModel.name}Mutator & db.${model.name}Mutator`
                          : `db.${model.name}Mutator`
                      }> = { ...input };`
                    );
                    if (model.updatable) {
                      writer.writeLine(`normalizedInput.updatedAt = ctx.now;`);
                      writer.writeLine(`normalizedInput.updatedById = ctx.user?.id;`);
                    }

                    for (const field of model.fields.filter((field) => field.updatable)) {
                      if (isEndOfDay(field)) {
                        writer
                          .write(`if (normalizedInput.${field.name}) `)
                          .inlineBlock(() => {
                            writer.writeLine(
                              `normalizedInput.${field.name} = anyDateToLuxon(normalizedInput.${field.name}, ctx.timeZone).endOf('day');`
                            );
                          })
                          .blankLine();
                      }

                      if (field.list && field.kind === 'enum') {
                        writer
                          .write(`if (Array.isArray(normalizedInput.${field.name})) `)
                          .inlineBlock(() => {
                            writer.writeLine(
                              `normalizedInput.${field.name} = \`{\${(normalizedInput.${field.name} as string[]).join(',')}}\`;`
                            );
                          })
                          .blankLine();
                        continue;
                      }
                    }

                    writer.writeLine(`const prev = await getEntityToMutate(ctx, model, where, 'UPDATE');`);

                    // Remove data that wouldn't mutate given that it's irrelevant for permissions
                    writer
                      .write(`for (const key of Object.keys(normalizedInput)) `)
                      .inlineBlock(() => {
                        writer.write(`if (normalizedInput[key] === prev[key]) `).inlineBlock(() => {
                          writer.writeLine(`delete normalizedInput[key];`);
                        });
                      })
                      .blankLine();

                    writer
                      .write(`if (Object.keys(normalizedInput).length > 0) `)
                      .inlineBlock(() => {
                        writer.writeLine(`await checkCanWrite(ctx, model, normalizedInput, 'UPDATE');`);

                        writer.writeLine(`const next = { ...prev, ...normalizedInput };`);
                        writer.writeLine(`const data = { prev, input, normalizedInput, next };`);
                        writer.writeLine(`await ctx.mutationHook?.(model, 'update', 'before', data, ctx);`);

                        if (model.parent) {
                          writer.writeLine(
                            `const rootInput: Partial<db.${
                              model.rootModel.name
                            }Initializer> = pick(normalizedInput, ${model.fields
                              .filter((field) => field.inherited)
                              .map((field) => `'${field.kind === 'relation' ? `${field.name}Id` : field.name}'`)
                              .join(', ')});`
                          );
                          writer.writeLine(
                            `const childInput: Partial<db.${
                              model.name
                            }Initializer> = pick(normalizedInput, 'id', ${model.fields
                              .filter((field) => !field.inherited)
                              .map((field) => `'${field.kind === 'relation' ? `${field.name}Id` : field.name}'`)
                              .join(', ')});`
                          );

                          writer
                            .write(`if (Object.keys(rootInput).length) `)
                            .inlineBlock(() => {
                              writer.write(`await ctx.knex(model.parent).where({ id: prev.id }).update(rootInput);`);
                            })
                            .blankLine();

                          writer
                            .write(`if (Object.keys(childInput).length) `)
                            .inlineBlock(() => {
                              writer.writeLine(`await ctx.knex(model.name).where({ id: prev.id }).update(childInput);`);
                            })
                            .blankLine();
                        } else {
                          writer.writeLine(`await ctx.knex(model.name).where({ id: prev.id }).update(normalizedInput);`);
                        }

                        writer.writeLine(`await create${model.name}Revision(next as db.Full${model.name}, ctx);`);
                        writer.writeLine(`await ctx.mutationHook?.(model, 'update', 'after', data, ctx);`);
                      })
                      .blankLine();

                    writer.writeLine(`return await resolve(ctx);`);
                  })
                  .write(');')
                  .newLine();
              })
              .write(',')
              .blankLine();
          }),
        ...models.entities
          .filter(not(isRootModel))
          .filter(({ deletable }) => deletable)
          .flatMap((model) => () => {
            writer
              .writeLine(
                `delete${model.name}: async (_parent: unknown, { where, dryRun }: api.MutationDelete${model.name}Args, partialCtx: Context, info: GraphQLResolveInfo) => `
              )
              .inlineBlock(() => {
                writer
                  .write(`return await partialCtx.knex.transaction(async (knex) => `)
                  .inlineBlock(() => {
                    writer.writeLine(
                      `const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };`
                    );
                    writer.writeLine(`const model = ctx.models.getModel('${model.name}', 'entity');`);

                    writer
                      .write(`if (Object.keys(where).length === 0) `)
                      .inlineBlock(() => {
                        writer.writeLine(`throw new Error(\`No ${model.name} specified.\`);`);
                      })
                      .blankLine();

                    const rootModel = model.rootModel;
                    writer.writeLine(`const rootModel = model.rootModel;`);
                    writer.writeLine(`const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');`);

                    writer
                      .write(`if (entity.deleted) `)
                      .inlineBlock(() => {
                        writer.writeLine(`throw new ForbiddenError('Entity is already deleted.');`);
                      })
                      .blankLine();

                    writer.write(`const deleteContext: DeleteContext = `).inlineBlock(() => {
                      writer.writeLine(`model,`);
                      writer.writeLine(`dryRun: !!dryRun,`);
                      writer.writeLine(`toDelete: {},`);
                      writer.writeLine(`toUnlink: {},`);
                      writer.writeLine(`beforeHooks: [],`);
                      writer.writeLine(`mutations: [],`);
                      writer.writeLine(`afterHooks: [],`);
                    });

                    writer.writeLine(`await delete${rootModel.name}Cascade(entity, ctx, deleteContext);`);

                    writer
                      .write(
                        `for (const callback of [...deleteContext.beforeHooks, ...deleteContext.mutations, ...deleteContext.afterHooks]) `
                      )
                      .inlineBlock(() => {
                        writer.writeLine(`await callback();`);
                      })
                      .blankLine();

                    writer
                      .write(`if (dryRun) `)
                      .inlineBlock(() => {
                        writer.write(`throw new GraphQLError(\`Delete dry run:\`, {
                        code: 'DELETE_DRY_RUN',
                        toDelete: deleteContext.toDelete,
                        toUnlink: deleteContext.toUnlink,
                      });`);
                      })
                      .blankLine();

                    writer.writeLine(`return entity.id;`);
                  })
                  .write(');');
              })
              .write(',')
              .blankLine();
            writer
              .writeLine(
                `restore${model.name}:async (_parent: unknown, { where }: api.MutationRestore${model.name}Args, partialCtx: Context, info: GraphQLResolveInfo) => `
              )
              .inlineBlock(() => {
                writer
                  .write(`return await partialCtx.knex.transaction(async (knex) => `)
                  .inlineBlock(() => {
                    writer.writeLine(
                      `const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };`
                    );
                    writer.writeLine(`const model = ctx.models.getModel('${model.name}', 'entity');`);

                    writer
                      .write(`if (Object.keys(where).length === 0) `)
                      .inlineBlock(() => {
                        writer.writeLine(`throw new Error(\`No ${model.name} specified.\`);`);
                      })
                      .blankLine();

                    const rootModel = model.rootModel;
                    writer.writeLine(`const rootModel = model.rootModel;`);
                    writer.writeLine(`const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');`);

                    writer
                      .write(`if (!entity.deleted) `)
                      .inlineBlock(() => {
                        writer.writeLine(`throw new ForbiddenError('Entity is not deleted.');`);
                      })
                      .blankLine();

                    writer.write(`const restoreContext: RestoreContext = `).inlineBlock(() => {
                      writer.writeLine(`entity,`);
                      writer.writeLine(`model,`);
                      writer.writeLine(`beforeHooks: [],`);
                      writer.writeLine(`mutations: [],`);
                      writer.writeLine(`afterHooks: [],`);
                    });

                    writer.writeLine(`await restore${rootModel.name}Cascade(entity, ctx, restoreContext);`);

                    writer
                      .write(
                        `for (const callback of [...restoreContext.beforeHooks, ...restoreContext.mutations, ...restoreContext.afterHooks]) `
                      )
                      .inlineBlock(() => {
                        writer.writeLine(`await callback();`);
                      })
                      .blankLine();

                    writer.writeLine(`return entity.id;`);
                  })
                  .write(');');
              })
              .write(',')
              .blankLine();
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
            writer.writeLine('__resolveType: ({ TYPE }) => TYPE,');
          })
          .write(',')
          .newLine();
      }
    })
    .write(';')
    .newLine()
    .blankLine();

  for (const model of models.entities.filter((model) => model.rootModel === model).filter((model) => model.deletable)) {
    writer
      .write(
        `const delete${model.name}Cascade = async (entity: db.Full${model.name}, ctx: FullContext, deleteCtx: DeleteContext) => `
      )
      .inlineBlock(() => {
        writer.writeLine(`
          const currentModel = ctx.models.getModel('${model.name}', 'entity');
          if (entity.deleted) {
            return;
          }
          if (!('${model.name}' in deleteCtx.toDelete)) {
            deleteCtx.toDelete['${model.name}'] = {};
          }
          if ((entity.id as string) in deleteCtx.toDelete['${model.name}']) {
            return;
          }

          deleteCtx.toDelete['${model.name}'][entity.id as string] = (${
          model.displayField ? `entity.${model.displayField} || entity.id` : 'entity.id'
        }) as unknown as string;
          
          if (!deleteCtx.dryRun) {
            const normalizedInput = { deleted: true, deletedAt: ctx.now, deletedById: ctx.user?.id };
            const data = { prev: entity, input: {}, normalizedInput, next: { ...entity, ...normalizedInput } };
            if (ctx.mutationHook) {
              deleteCtx.beforeHooks.push(async () => {
                await ctx.mutationHook?.(currentModel, 'delete', 'before', data, ctx);
              });
            }
            deleteCtx.mutations.push(async () => {
              await ctx.knex('${model.name}').where({ id: entity.id }).update(normalizedInput);
              await create${model.name}Revision({ ...entity, deleted: true }, ctx);
            });
            if (ctx.mutationHook) {
              deleteCtx.afterHooks.push(async () => {
                await ctx.mutationHook?.(currentModel, 'delete', 'after', data, ctx);
              });
            }
          }
        `);

        for (const { targetModel: descendantModel, field } of model.reverseRelations.filter(
          (reverseRelation) => !reverseRelation.field.inherited
        )) {
          writer.block(() => {
            writer.writeLine(
              `const query = ctx.knex('${descendantModel.name}').where({ ['${field.foreignKey}']: entity.id });`
            );
            switch (field.onDelete) {
              case 'set-null': {
                writer.write(`
                  const descendants = await query;
                  for (const descendant of descendants) {
                    if (deleteCtx.dryRun) {
                      if (!deleteCtx.toUnlink['${descendantModel.name}']) {
                        deleteCtx.toUnlink['${descendantModel.name}'] = {};
                      }
                      if (!deleteCtx.toUnlink['${descendantModel.name}'][descendant.id]) {
                        deleteCtx.toUnlink['${descendantModel.name}'][descendant.id] = {
                          display: descendant['${descendantModel.displayField || 'id'}'] || entity.id,
                          fields: [],
                        };
                      }
                      get(deleteCtx.toUnlink['${descendantModel.name}'], descendant.id).fields.push('${field.name}');
                    } else {
                      deleteCtx.mutations.push(async () => {
                        await ctx
                          .knex('${descendantModel.name}')
                          .where({ id: descendant.id })
                          .update({
                            [\`${field.name}Id\`]: null,
                          });
                      });
                    }
                  }
                `);
                break;
              }
              case 'cascade':
              default: {
                writer.write(`
                  applyPermissions(ctx, '${descendantModel.name}', '${descendantModel.name}', query, 'DELETE');
                  const descendants = await query;
                `);
                if (!descendantModel.deletable) {
                  writer.write(` 
                    if (descendants.length && !descendantModel.deletable) {
                      throw new ForbiddenError(\`This ${model.name} depends on a ${descendantModel.name} which cannot be deleted.\`);
                    }
                  `);
                }
                writer.write(`
                  for (const descendant of descendants) {
                    await delete${descendantModel.name}Cascade(descendant, ctx, deleteCtx);
                  }
                `);
                break;
              }
            }
          });
        }
      })
      .write(';')
      .blankLine();

    writer
      .write(
        `export const restore${model.name}Cascade = async (
          relatedEntity: db.${model.name},
          ctx: FullContext,
          restoreCtx: RestoreContext
        ) => `
      )
      .inlineBlock(() => {
        writer.writeLine(`
            const currentModel = ctx.models.getModel('${model.name}', 'entity');
            if (
              !relatedEntity.deleted ||
              !relatedEntity.deletedAt ||
              !anyDateToLuxon(relatedEntity.deletedAt, ctx.timeZone)!.equals(anyDateToLuxon(restoreCtx.entity.deletedAt, ctx.timeZone)!)
            ) {
              return;
            }
    
            const normalizedInput: Partial<db.${model.name}Mutator> = { deleted: false, deletedAt: null, deletedById: null };
            const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
            if (ctx.mutationHook) {
              restoreCtx.beforeHooks.push(async () => {
                await ctx.mutationHook?.(currentModel, 'restore', 'before', data, ctx);
              });
            }
            restoreCtx.mutations.push(async () => {
              await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
              await create${model.name}Revision({ ...relatedEntity, deleted: false }, ctx);
            });
            if (ctx.mutationHook) {
              restoreCtx.afterHooks.push(async () => {
                await ctx.mutationHook?.(currentModel, 'restore', 'after', data, ctx);
              });
            }
          `);

        for (const { targetModel: descendantModel, field } of model.reverseRelations
          .filter((reverseRelation) => !reverseRelation.field.inherited)
          .filter(({ targetModel: { deletable } }) => deletable)) {
          writer
            .block(() => {
              writer.write(`
                    const query = ctx.knex('${descendantModel.name}').where({ ['${field.foreignKey}']: relatedEntity.id });
                    applyPermissions(ctx, '${descendantModel.name}', '${descendantModel.name}', query, 'RESTORE');
                    const descendants = await query;
                    for (const descendant of descendants) {
                      await restore${descendantModel.name}Cascade(descendant, ctx, restoreCtx);
                    }
                  `);
            })
            .blankLine();
        }
      })
      .write(';')
      .blankLine();
  }

  for (const model of models.entities.filter((model) => model.updatable || model.deletable)) {
    writer
      .write(
        `export const create${model.name}Revision = async (data: db.Full${model.name}, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => `
      )
      .inlineBlock(() => {
        if (!model.updatable) {
          writer.writeLine(`// TODO: revisions for models that are deletable but not updatable...`);
          return;
        }

        writer.writeLine(`
          const revisionId = uuid();
          const rootRevisionData: Entity = {
            id: revisionId,
            ['${`${model.parent ? model.parentModel.asField : model.asField}Id`}']: data.id,
            createdAt: ctx.now,
            createdById: ctx.user?.id,
          };
          `);

        if (model.deletable) {
          writer.writeLine(`rootRevisionData.deleted = data.deleted || false;`);
        }

        if (model.parent) {
          writer.writeLine(`
            const childRevisionData = { id: revisionId };
          `);
        }

        for (const field of model.fields.filter(({ updatable }) => updatable)) {
          writer.block(() => {
            const col = field.kind === 'relation' ? `${field.name}Id` : field.name;
            if (field.nonNull) {
              if (col === undefined || col === null) {
                writer.writeLine(field.defaultValue ? `const value = ${field.defaultValue}` : 'throw new Error()');
              } else {
                writer.writeLine(`
                  let value;
                    if (!('${col}' in data)) {
                      ${field.defaultValue ? `value = '${field.defaultValue}'` : 'throw new Error()'};
                    } else {
                      value = data['${col}'];
                    }
                  `);
              }
            } else {
              writer.writeLine(`const value = data['${col}'];`);
            }
            if (!model.parent || field.inherited) {
              writer.writeLine(`rootRevisionData['${col}'] = value;`);
            } else {
              writer.writeLine(`childRevisionData['${col}'] = value;`);
            }
          });
        }

        if (model.parent) {
          writer.writeLine(`
              await ctx.knex('${model.parent}Revision').insert(rootRevisionData);
              await ctx.knex('${model.name}Revision').insert(childRevisionData);
            `);
        } else {
          writer.writeLine(`await ctx.knex('${model.name}Revision').insert(rootRevisionData);`);
        }
      })
      .write(`;`)
      .blankLine();
  }

  return importWriter.toString() + writer.toString();
};
