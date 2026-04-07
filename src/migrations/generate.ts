import CodeBlockWriter from 'code-block-writer';
import { Knex } from 'knex';
import { SchemaInspector } from 'knex-schema-inspector';
import { Column } from 'knex-schema-inspector/dist/types/column';
import { SchemaInspector as SchemaInspectorType } from 'knex-schema-inspector/dist/types/schema-inspector';
import lowerFirst from 'lodash/lowerFirst';
import { EntityField, EntityModel, EnumModel, Models } from '../models/models';
import {
  and,
  get,
  isCreatableModel,
  isInherited,
  isStoredInDatabase,
  isUpdatableField,
  isUpdatableModel,
  modelNeedsTable,
  not,
  summonByName,
  typeToField,
  validateCheckConstraint,
  validateExcludeConstraint,
} from '../models/utils';
import { Value } from '../values';
import { ParsedFunction } from './types';
import {
  DatabaseFunction,
  getDatabaseFunctions,
  normalizeAggregateDefinition,
  normalizeFunctionBody,
} from './update-functions';

type Callbacks = (() => void)[];

export class MigrationGenerator {
  // eslint-disable-next-line @typescript-eslint/dot-notation
  private writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });
  private schema: SchemaInspectorType;
  private columns: Record<string, Column[]> = {};
  /** table name -> constraint name -> { expression, notValid } */
  private existingCheckConstraints: Record<string, Map<string, { expression: string; notValid: boolean }>> = {};
  /** table name -> constraint name -> { normalized, raw } */
  private existingExcludeConstraints: Record<string, Map<string, { normalized: string; raw: string }>> = {};
  /** table name -> constraint name -> { normalized, raw } */
  private existingConstraintTriggers: Record<string, Map<string, { normalized: string; raw: string }>> = {};
  private uuidUsed?: boolean;
  private nowUsed?: boolean;
  public needsMigration = false;
  private knex: Knex;

  constructor(
    knex: Knex,
    private models: Models,
    private parsedFunctions?: ParsedFunction[],
  ) {
    this.knex = knex;
    this.schema = SchemaInspector(knex);
  }

  public async generate() {
    const { writer, schema, models } = this;
    const enums = (await schema.knex('pg_type').where({ typtype: 'e' }).select('typname')).map(({ typname }) => typname);
    const tables = await schema.tables();
    for (const table of tables) {
      this.columns[table] = await schema.columnInfo(table);
    }

    const checkResult = await schema.knex.raw(
      `SELECT t.relname as table_name, c.conname as constraint_name,
              pg_get_constraintdef(c.oid, true) as constraint_def, c.convalidated
       FROM pg_constraint c
       JOIN pg_namespace n ON c.connamespace = n.oid
       JOIN pg_class t ON c.conrelid = t.oid
       WHERE n.nspname = ? AND c.contype = ?`,
      ['public', 'c'],
    );
    type CheckConstraintRow = {
      table_name: string;
      constraint_name: string;
      constraint_def: string;
      convalidated: boolean;
    };
    const checkRows: CheckConstraintRow[] =
      'rows' in checkResult && Array.isArray((checkResult as { rows: unknown }).rows)
        ? (checkResult as { rows: CheckConstraintRow[] }).rows
        : [];
    for (const row of checkRows) {
      const tableName = row.table_name;
      if (!this.existingCheckConstraints[tableName]) {
        this.existingCheckConstraints[tableName] = new Map();
      }
      this.existingCheckConstraints[tableName].set(row.constraint_name, {
        expression: this.extractCheckExpressionFromDefinition(row.constraint_def),
        notValid: !row.convalidated,
      });
    }

    const excludeResult = await schema.knex.raw(
      `SELECT c.conrelid::regclass::text as table_name, c.conname as constraint_name, pg_get_constraintdef(c.oid) as constraint_def
       FROM pg_constraint c
       JOIN pg_namespace n ON c.connamespace = n.oid
       WHERE n.nspname = 'public' AND c.contype = 'x'`,
    );
    const excludeRows: { table_name: string; constraint_name: string; constraint_def: string }[] =
      'rows' in excludeResult && Array.isArray((excludeResult as { rows: unknown }).rows)
        ? (excludeResult as { rows: { table_name: string; constraint_name: string; constraint_def: string }[] }).rows
        : [];
    for (const row of excludeRows) {
      const tableName = row.table_name.split('.').pop()?.replace(/^"|"$/g, '') ?? row.table_name;
      if (!this.existingExcludeConstraints[tableName]) {
        this.existingExcludeConstraints[tableName] = new Map();
      }
      this.existingExcludeConstraints[tableName].set(row.constraint_name, {
        normalized: this.normalizeExcludeDef(row.constraint_def),
        raw: row.constraint_def,
      });
    }

    const triggerResult = await schema.knex.raw(
      `SELECT c.conrelid::regclass::text as table_name, c.conname as constraint_name, pg_get_triggerdef(t.oid) as trigger_def
       FROM pg_constraint c
       JOIN pg_trigger t ON t.tgconstraint = c.oid
       JOIN pg_namespace n ON c.connamespace = n.oid
       WHERE n.nspname = 'public' AND c.contype = 't'`,
    );
    const triggerRows: { table_name: string; constraint_name: string; trigger_def: string }[] =
      'rows' in triggerResult && Array.isArray((triggerResult as { rows: unknown }).rows)
        ? (triggerResult as { rows: { table_name: string; constraint_name: string; trigger_def: string }[] }).rows
        : [];
    for (const row of triggerRows) {
      const tableName = row.table_name.split('.').pop()?.replace(/^"|"$/g, '') ?? row.table_name;
      if (!this.existingConstraintTriggers[tableName]) {
        this.existingConstraintTriggers[tableName] = new Map();
      }
      this.existingConstraintTriggers[tableName].set(row.constraint_name, {
        normalized: this.normalizeTriggerDef(row.trigger_def),
        raw: row.trigger_def,
      });
    }

    const up: Callbacks = [];
    const down: Callbacks = [];

    const wantsBtreeGist = models.entities.some((model) =>
      model.constraints?.some((c) => c.kind === 'exclude' && c.elements.some((el) => 'column' in el && el.operator === '=')),
    );
    if (wantsBtreeGist) {
      const extResult = await schema.knex('pg_extension').where('extname', 'btree_gist').select('oid').first();
      const btreeGistInstalled = !!extResult;
      if (!btreeGistInstalled) {
        up.unshift(() => {
          this.writer.writeLine(`await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');`);
          this.writer.blankLine();
        });
      }
    }

    this.createEnums(
      this.models.enums.filter((enm) => !enums.includes(lowerFirst(enm.name))),
      up,
      down,
    );

    await this.handleFunctions(up, down);

    for (const model of models.entities) {
      if (model.deleted) {
        up.push(() => {
          this.dropTable(model.name);
        });

        down.push(() => {
          this.createTable(model.name, () => {
            for (const field of model.fields) {
              this.column(field);
            }
          });
        });

        // TODO: also add revision table if it's deletable
        if (isUpdatableModel(model)) {
          up.push(() => {
            this.dropTable(`${model.name}Revision`);
          });

          down.push(() => {
            this.createRevisionTable(model);
          });
        }
      }

      if (model.oldName) {
        // Rename table
        up.push(() => {
          this.renameTable(model.oldName!, model.name);
        });
        down.push(() => {
          this.renameTable(model.name, model.oldName!);
        });
        tables[tables.indexOf(model.oldName)] = model.name;
        this.columns[model.name] = this.columns[model.oldName];
        delete this.columns[model.oldName];

        if (isUpdatableModel(model)) {
          up.push(() => {
            this.renameTable(`${model.oldName}Revision`, `${model.name}Revision`);
            this.alterTable(`${model.name}Revision`, () => {
              this.renameColumn(`${typeToField(get(model, 'oldName'))}Id`, `${typeToField(model.name)}Id`);
            });
          });
          down.push(() => {
            this.renameTable(`${model.name}Revision`, `${model.oldName}Revision`);
            this.alterTable(`${model.oldName}Revision`, () => {
              this.renameColumn(`${typeToField(model.name)}Id`, `${typeToField(get(model, 'oldName'))}Id`);
            });
          });
          tables[tables.indexOf(`${model.oldName}Revision`)] = `${model.name}Revision`;
          this.columns[`${model.name}Revision`] = this.columns[`${model.oldName}Revision`];
          delete this.columns[`${model.oldName}Revision`];
        }
      }

      if (modelNeedsTable(model)) {
        if (!tables.includes(model.name)) {
          // Create missing table
          up.push(() => {
            this.createTable(model.name, () => {
              if (model.parent) {
                this.column({
                  ...model.fieldsByName.id,
                  kind: 'relation',
                  type: model.parent,
                  foreignKey: 'id',
                });
              }
              for (const field of model.fields
                .filter(not(isInherited))
                .filter((f) => !(f.generateAs?.type === 'expression'))) {
                this.column(field);
              }
            });
          });

          if (model.constraints?.length) {
            for (let i = 0; i < model.constraints.length; i++) {
              const entry = model.constraints[i];
              if (entry.kind === 'check') {
                validateCheckConstraint(model, entry);
                const table = model.name;
                const constraintName = this.getConstraintName(model, entry, i);
                up.push(() => {
                  this.addCheckConstraint(table, constraintName, entry.expression, entry.deferrable, entry.notValid);
                });
              } else if (entry.kind === 'exclude') {
                validateExcludeConstraint(model, entry);
                const table = model.name;
                const constraintName = this.getConstraintName(model, entry, i);
                up.push(() => {
                  this.addExcludeConstraint(table, constraintName, entry);
                });
              } else if (entry.kind === 'constraint_trigger') {
                this.validateConstraintTrigger(model, entry);
                const table = model.name;
                const constraintName = this.getConstraintName(model, entry, i);
                up.push(() => {
                  this.addConstraintTrigger(table, constraintName, entry);
                });
              }
            }
          }

          down.push(() => {
            this.dropTable(model.name);
          });
        } else {
          // Rename fields
          const fieldsToRename = model.fields.filter(not(isInherited)).filter(({ oldName }) => oldName);
          this.renameFields(model.name, fieldsToRename, up, down);

          // Add missing fields
          this.createFields(
            model,
            model.fields
              .filter(not(isInherited))
              .filter(
                ({ name, ...field }) =>
                  field.kind !== 'custom' &&
                  !(field.generateAs?.type === 'expression') &&
                  !this.getColumn(model.name, field.kind === 'relation' ? field.foreignKey || `${name}Id` : name),
              ),
            up,
            down,
          );

          // Update fields
          const rawExistingFields = model.fields.filter((field) => {
            if (!field.generateAs || field.generateAs.type === 'expression') {
              return false;
            }

            const col = this.getColumn(model.name, field.kind === 'relation' ? `${field.name}Id` : field.name);
            if (!col) {
              return false;
            }

            if (col.generation_expression !== field.generateAs.expression) {
              return true;
            }

            return this.hasChanged(model, field);
          });
          if (rawExistingFields.length) {
            this.updateFieldsRaw(model, rawExistingFields, up, down);
          }

          const existingFields = model.fields.filter(
            (field) => (!field.generateAs || field.generateAs.type === 'expression') && this.hasChanged(model, field),
          );
          this.updateFields(model, existingFields, up, down);

          if (model.constraints?.length) {
            const existingExcludeMap = this.existingExcludeConstraints[model.name];
            const existingTriggerMap = this.existingConstraintTriggers[model.name];
            for (let i = 0; i < model.constraints.length; i++) {
              const entry = model.constraints[i];
              const table = model.name;
              const constraintName = this.getConstraintName(model, entry, i);
              if (entry.kind === 'check') {
                validateCheckConstraint(model, entry);
                const existingConstraint = this.findExistingConstraint(table, entry, constraintName);
                if (!existingConstraint) {
                  up.push(() => {
                    this.addCheckConstraint(table, constraintName, entry.expression, entry.deferrable, entry.notValid);
                  });
                  down.push(() => {
                    this.dropCheckConstraint(table, constraintName);
                  });
                } else if (
                  !(await this.equalExpressions(
                    table,
                    existingConstraint.constraintName,
                    existingConstraint.expression,
                    entry.expression,
                  )) ||
                  existingConstraint.notValid !== (entry.notValid ?? false)
                ) {
                  up.push(() => {
                    this.dropCheckConstraint(table, existingConstraint.constraintName);
                    this.addCheckConstraint(table, constraintName, entry.expression, entry.deferrable, entry.notValid);
                  });
                  down.push(() => {
                    this.dropCheckConstraint(table, constraintName);
                    this.addCheckConstraint(
                      table,
                      existingConstraint.constraintName,
                      existingConstraint.expression,
                      undefined,
                      existingConstraint.notValid,
                    );
                  });
                }
              } else if (entry.kind === 'exclude') {
                validateExcludeConstraint(model, entry);
                const newDef = this.normalizeExcludeDef(this.buildExcludeDef(entry));
                const existing = existingExcludeMap?.get(constraintName);
                if (existing === undefined) {
                  up.push(() => {
                    this.addExcludeConstraint(table, constraintName, entry);
                  });
                  down.push(() => {
                    this.dropExcludeConstraint(table, constraintName);
                  });
                } else if (existing.normalized !== newDef) {
                  up.push(() => {
                    this.dropExcludeConstraint(table, constraintName);
                    this.addExcludeConstraint(table, constraintName, entry);
                  });
                  down.push(() => {
                    this.dropExcludeConstraint(table, constraintName);
                    const escaped = this.escapeExpressionForRaw(existing.raw);
                    this.writer.writeLine(
                      `await knex.raw(\`ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" ${escaped}\`);`,
                    );
                    this.writer.blankLine();
                  });
                }
              } else if (entry.kind === 'constraint_trigger') {
                this.validateConstraintTrigger(model, entry);
                const newDef = this.normalizeTriggerDef(this.buildConstraintTriggerDef(table, constraintName, entry));
                const existing = existingTriggerMap?.get(constraintName);
                if (existing === undefined) {
                  up.push(() => {
                    this.addConstraintTrigger(table, constraintName, entry);
                  });
                  down.push(() => {
                    this.dropConstraintTrigger(table, constraintName);
                  });
                } else if (existing.normalized !== newDef) {
                  up.push(() => {
                    this.dropConstraintTrigger(table, constraintName);
                    this.addConstraintTrigger(table, constraintName, entry);
                  });
                  down.push(() => {
                    this.dropConstraintTrigger(table, constraintName);
                    const escaped = existing.raw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
                    this.writer.writeLine(`await knex.raw(\`${escaped}\`);`);
                    this.writer.blankLine();
                  });
                }
              }
            }
          }
        }

        if (isUpdatableModel(model)) {
          if (!tables.includes(`${model.name}Revision`)) {
            up.push(() => {
              this.createRevisionTable(model);
            });

            if (tables.includes(model.name)) {
              up.push(() => {
                // Populate empty revisions tables
                writer
                  .block(() => {
                    writer.writeLine(`const data = await knex('${model.name}');`);

                    writer.write(`if (data.length)`).block(() => {
                      writer
                        .write(`await knex.batchInsert('${model.name}Revision', data.map((row) => (`)
                        .inlineBlock(() => {
                          writer.writeLine(`id: randomUUID(),`);
                          writer.writeLine(`${typeToField(model.name)}Id: row.id,`);
                          this.nowUsed = true;
                          writer.writeLine(`createdAt: row.updatedAt || row.createdAt || now,`);
                          writer.writeLine(`createdById: row.updatedById || row.createdById,`);
                          if (model.deletable) {
                            writer.writeLine(`deleted: row.deleted,`);
                            writer.writeLine(`deleteRootType: row.deleteRootType,`);
                            writer.writeLine(`deleteRootId: row.deleteRootId,`);
                          }

                          for (const { name, kind } of model.fields.filter(and(isUpdatableField, isStoredInDatabase))) {
                            const col = kind === 'relation' ? `${name}Id` : name;

                            writer.writeLine(`${col}: row.${col},`);
                          }
                        })
                        .write(')));')
                        .newLine();
                    });
                  })
                  .blankLine();
              });
            }

            down.push(() => {
              this.dropTable(`${model.name}Revision`);
            });
          } else {
            const revisionTable = `${model.name}Revision`;

            this.renameFields(
              revisionTable,
              model.fields
                .filter(isUpdatableField)
                .filter(not(isInherited))
                .filter(({ oldName }) => oldName),
              up,
              down,
            );

            const missingRevisionFields = model.fields
              .filter(and(isUpdatableField, isStoredInDatabase))
              .filter(
                ({ name, ...field }) =>
                  !this.getColumn(revisionTable, field.kind === 'relation' ? field.foreignKey || `${name}Id` : name),
              );

            this.createRevisionFields(model, missingRevisionFields, up, down);

            const revisionFieldsToRemove = model.fields.filter(
              ({ name, updatable, generated, ...field }) =>
                !generated &&
                field.kind !== 'custom' &&
                !updatable &&
                !(field.kind === 'relation' && field.foreignKey === 'id') &&
                this.getColumn(revisionTable, field.kind === 'relation' ? field.foreignKey || `${name}Id` : name),
            );
            this.createRevisionFields(model, revisionFieldsToRemove, down, up);
          }
        }
      }
    }

    for (const model of models.entities) {
      if (tables.includes(model.name)) {
        const fieldsToDelete = model.fields.filter(({ name, deleted }) => deleted && this.getColumn(model.name, name));

        if (!isCreatableModel(model)) {
          if (this.getColumn(model.name, 'createdAt')) {
            fieldsToDelete.push({ name: 'createdAt', type: 'DateTime', nonNull: true });
          }

          if (this.getColumn(model.name, 'createdBy')) {
            fieldsToDelete.push({ name: 'createdBy', kind: 'relation', type: 'User', nonNull: true });
          }
        }

        if (!isUpdatableModel(model)) {
          if (this.getColumn(model.name, 'updatedAt')) {
            fieldsToDelete.push({ name: 'updatedAt', type: 'DateTime', nonNull: true });
          }

          if (this.getColumn(model.name, 'updatedBy')) {
            fieldsToDelete.push({ name: 'updatedBy', kind: 'relation', type: 'User', nonNull: true });
          }
        }

        if (fieldsToDelete.length) {
          this.createFields(model, fieldsToDelete, down, up);
        }

        if (isUpdatableModel(model)) {
          this.createRevisionFields(
            model,
            model.fields.filter(isUpdatableField).filter(({ deleted }) => deleted),
            down,
            up,
          );
        }
      }
    }

    this.createEnums(
      this.models.enums.filter((enm) => enm.deleted),
      down,
      up,
    );

    writer.writeLine(`import { Knex } from 'knex';`);
    if (this.uuidUsed) {
      writer.writeLine(`import { randomUUID } from 'crypto';`);
    }
    if (this.nowUsed) {
      writer.writeLine(`import { date } from '../src/utils/dates';`);
    }
    writer.blankLine();

    if (this.nowUsed) {
      writer.writeLine(`const now = date();`).blankLine();
    }

    if (up.length || down.length) {
      this.needsMigration = true;
    }
    this.migration('up', up);
    this.migration('down', down.reverse());

    return writer.toString();
  }

  private renameFields(tableName: string, fields: EntityField[], up: Callbacks, down: Callbacks) {
    if (!fields.length) {
      return;
    }

    up.push(() => {
      for (const field of fields) {
        this.alterTable(tableName, () => {
          this.renameColumn(
            field.kind === 'relation' ? `${field.oldName}Id` : get(field, 'oldName'),
            field.kind === 'relation' ? `${field.name}Id` : field.name,
          );
        });
      }
    });

    down.push(() => {
      for (const field of fields) {
        this.alterTable(tableName, () => {
          this.renameColumn(
            field.kind === 'relation' ? `${field.name}Id` : field.name,
            field.kind === 'relation' ? `${field.oldName}Id` : get(field, 'oldName'),
          );
        });
      }
    });

    for (const field of fields) {
      summonByName(this.columns[tableName], field.kind === 'relation' ? `${field.oldName!}Id` : field.oldName!).name =
        field.kind === 'relation' ? `${field.name}Id` : field.name;
    }
  }

  private createFields(model: EntityModel, fields: EntityField[], up: Callbacks, down: Callbacks) {
    if (!fields.length) {
      return;
    }

    up.push(() => {
      const alter: Callbacks = [];
      const updates: Callbacks = [];
      const postAlter: Callbacks = [];
      for (const field of fields) {
        if (field.generateAs?.type === 'expression') {
          continue;
        }

        alter.push(() => this.column(field, { setNonNull: field.defaultValue !== undefined }));

        if (field.generateAs) {
          continue;
        }

        // If the field is not nullable but has no default, write placeholder code
        if (field.nonNull && field.defaultValue === undefined) {
          updates.push(() => this.writer.write(`${field.name}: 'TODO',`).newLine());
          postAlter.push(() => this.column(field, { alter: true, foreign: false }));
        }
      }
      if (alter.length) {
        this.alterTable(model.name, () => {
          alter.map((cb) => cb());
        });
      }
      if (updates.length) {
        this.writer
          .write(`await knex('${model.name}').update(`)
          .inlineBlock(() => {
            updates.map((cb) => cb());
          })
          .write(');')
          .newLine()
          .blankLine();
      }
      if (postAlter.length) {
        this.alterTable(model.name, () => {
          postAlter.map((cb) => cb());
        });
      }
    });

    down.push(() => {
      this.alterTable(model.name, () => {
        for (const { kind, name } of fields.toReversed()) {
          this.dropColumn(kind === 'relation' ? `${name}Id` : name);
        }
      });
    });
  }

  private updateFieldsRaw(model: EntityModel, fields: EntityField[], up: Callbacks, down: Callbacks) {
    if (!fields.length) {
      return;
    }

    up.push(() => {
      this.alterTableRaw(model.name, () => {
        for (const [index, field] of fields.entries()) {
          this.columnRaw(field, { alter: true }, index);
        }
      });
    });

    down.push(() => {
      this.alterTableRaw(model.name, () => {
        for (const [index, field] of fields.entries()) {
          this.columnRaw(field, { alter: true }, index);
        }
      });
    });

    if (isUpdatableModel(model)) {
      const updatableFields = fields.filter(and(isUpdatableField, isStoredInDatabase));
      const revisionFieldsNeedingAlter = updatableFields.filter((field) => this.revisionFieldNeedsSchemaAlter(model, field));
      if (!revisionFieldsNeedingAlter.length) {
        return;
      }

      up.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const [index, field] of revisionFieldsNeedingAlter.entries()) {
            this.columnRaw(field, { alter: true, setNonNull: false }, index);
          }
        });
      });

      down.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const [index, field] of revisionFieldsNeedingAlter.entries()) {
            this.columnRaw(
              field,
              { alter: true, setNonNull: false },
              index,
              summonByName(
                this.columns[`${model.name}Revision`],
                field.kind === 'relation' ? `${field.name}Id` : field.name,
              ),
            );
          }
        });
      });
    }
  }

  private updateFields(model: EntityModel, fields: EntityField[], up: Callbacks, down: Callbacks) {
    if (!fields.length) {
      return;
    }

    up.push(() => {
      this.alterTable(model.name, () => {
        for (const field of fields) {
          this.column(field, { alter: true });
        }
      });
    });

    down.push(() => {
      this.alterTable(model.name, () => {
        for (const field of fields) {
          this.column(
            field,
            { alter: true },
            summonByName(this.columns[model.name], field.kind === 'relation' ? `${field.name}Id` : field.name),
          );
        }
      });
    });

    if (isUpdatableModel(model)) {
      const updatableFields = fields.filter(and(isUpdatableField, isStoredInDatabase));
      const revisionFieldsNeedingAlter = updatableFields.filter((field) => this.revisionFieldNeedsSchemaAlter(model, field));
      if (!revisionFieldsNeedingAlter.length) {
        return;
      }

      up.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const field of revisionFieldsNeedingAlter) {
            this.column(field, { alter: true, setUnique: false, setNonNull: false, foreign: false });
          }
        });
      });

      down.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const field of revisionFieldsNeedingAlter) {
            this.column(
              field,
              { alter: true, setUnique: false, setNonNull: false, foreign: false },
              summonByName(
                this.columns[`${model.name}Revision`],
                field.kind === 'relation' ? `${field.name}Id` : field.name,
              ),
            );
          }
        });
      });
    }
  }

  private createRevisionTable(model: EntityModel) {
    const writer = this.writer;

    // Create missing revisions table
    this.createTable(`${model.name}Revision`, () => {
      writer.writeLine(`table.uuid('id').notNullable().primary();`);
      if (!model.parent) {
        writer.writeLine(`table.uuid('${typeToField(model.name)}Id').notNullable();`);
        writer.writeLine(`table.uuid('createdById').notNullable();`);
        writer.writeLine(`table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now(0));`);
        if (model.deletable) {
          writer.writeLine(`table.boolean('deleted').notNullable();`);
          writer.writeLine(`table.string('deleteRootType');`);
          writer.writeLine(`table.uuid('deleteRootId');`);
        }
      }

      for (const field of model.fields.filter(and(isUpdatableField, not(isInherited), isStoredInDatabase))) {
        this.column(field, { setUnique: false, setDefault: false, setNonNull: false, foreign: false });
      }
    });
  }

  private createRevisionFields(model: EntityModel, missingRevisionFields: EntityField[], up: Callbacks, down: Callbacks) {
    const revisionTable = `${model.name}Revision`;
    if (missingRevisionFields.length) {
      up.push(() => {
        // Create missing revision columns
        this.alterTable(revisionTable, () => {
          for (const field of missingRevisionFields) {
            this.column(field, { setUnique: false, setNonNull: false, setDefault: false, foreign: false });
          }
        });
      });

      down.push(() => {
        this.alterTable(revisionTable, () => {
          for (const field of missingRevisionFields) {
            this.dropColumn(field.kind === 'relation' ? `${field.name}Id` : field.name);
          }
        });
      });
    }
  }

  private createEnums(enums: EnumModel[], up: Callbacks, down: Callbacks) {
    for (const enm of enums) {
      const name = lowerFirst(enm.name);
      up.push(() =>
        this.writer
          .writeLine(
            `await knex.raw(\`CREATE TYPE "${name}" AS ENUM (${enm.values.map((value) => `'${value}'`).join(',')})\`);`,
          )
          .newLine(),
      );
      down.push(() => this.writer.writeLine(`await knex.raw('DROP TYPE "${name}"');`));
    }
  }

  private migration(name: 'up' | 'down', cbs: (() => void)[]) {
    return this.writer
      .write(`export const ${name} = async (knex: Knex) => `)
      .inlineBlock(() => {
        cbs.map((cb) => cb());
      })
      .write(';')
      .newLine()
      .blankLine();
  }

  private createTable(table: string, block: () => void) {
    return this.writer
      .write(`await knex.schema.createTable('${table}', (table) => `)
      .inlineBlock(block)
      .write(');')
      .newLine()
      .blankLine();
  }

  private alterTableRaw(table: string, block: () => void) {
    this.writer.write(`await knex.raw('ALTER TABLE "${table}"`);
    block();
    this.writer.write(`');`).newLine().blankLine();
  }

  private alterTable(table: string, block: () => void) {
    return this.writer
      .write(`await knex.schema.alterTable('${table}', (table) => `)
      .inlineBlock(block)
      .write(');')
      .newLine()
      .blankLine();
  }

  private dropColumn(col: string) {
    return this.writer.writeLine(`table.dropColumn('${col}');`);
  }

  private dropTable(table: string) {
    return this.writer.writeLine(`await knex.schema.dropTable('${table}');`).blankLine();
  }

  private renameTable(from: string, to: string) {
    return this.writer.writeLine(`await knex.schema.renameTable('${from}', '${to}');`).blankLine();
  }

  private renameColumn(from: string, to: string) {
    this.writer.writeLine(`table.renameColumn('${from}', '${to}');`);
  }

  private getConstraintName(model: EntityModel, entry: { kind: string; name: string }, index: number): string {
    return `${model.name}_${entry.name}_${entry.kind}_${index}`;
  }

  private static readonly SQL_KEYWORDS = new Set([
    'and',
    'or',
    'not',
    'in',
    'is',
    'null',
    'true',
    'false',
    'between',
    'like',
    'exists',
    'all',
    'any',
    'asc',
    'desc',
    'with',
    'using',
    'as',
    'on',
    'infinity',
    'extract',
    'current_date',
    'current_timestamp',
  ]);

  private static readonly LITERAL_PLACEHOLDER = '\uE000';

  private static readonly IDENT_PLACEHOLDER = '\uE001';

  private normalizeSqlIdentifiers(s: string): string {
    const literals: string[] = [];
    let result = s.replace(/'([^']|'')*'/g, (lit) => {
      literals.push(lit);

      return `${MigrationGenerator.LITERAL_PLACEHOLDER}${literals.length - 1}${MigrationGenerator.LITERAL_PLACEHOLDER}`;
    });
    const quotedIdents: string[] = [];
    result = result.replace(/"([^"]*)"/g, (_, ident) => {
      quotedIdents.push(`"${ident.toLowerCase()}"`);

      return `${MigrationGenerator.IDENT_PLACEHOLDER}${quotedIdents.length - 1}${MigrationGenerator.IDENT_PLACEHOLDER}`;
    });
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\()/g, (match) =>
      MigrationGenerator.SQL_KEYWORDS.has(match.toLowerCase()) ? match : `"${match.toLowerCase()}"`,
    );
    for (let i = 0; i < quotedIdents.length; i++) {
      result = result.replace(
        new RegExp(`${MigrationGenerator.IDENT_PLACEHOLDER}${i}${MigrationGenerator.IDENT_PLACEHOLDER}`, 'g'),
        quotedIdents[i],
      );
    }
    for (let i = 0; i < literals.length; i++) {
      result = result.replace(
        new RegExp(`${MigrationGenerator.LITERAL_PLACEHOLDER}${i}${MigrationGenerator.LITERAL_PLACEHOLDER}`, 'g'),
        literals[i],
      );
    }

    return result;
  }

  private normalizeExcludeDef(def: string): string {
    let s = def
      .replace(/\s+/g, ' ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .replace(/::\s*timestamp\s+with\s+time\s+zone\b/gi, '::timestamptz')
      .replace(/::\s*timestamp\s+without\s+time\s+zone\b/gi, '::timestamp')
      .trim();

    const whereMatch = s.match(/\bWHERE\s*\(/i);
    if (whereMatch) {
      const openParen = (whereMatch.index ?? 0) + whereMatch[0].length - 1;
      const closeParen = this.findMatchingParen(s, openParen);
      if (closeParen !== -1) {
        let cond = s.slice(openParen + 1, closeParen).trim();
        while (this.isWrappedByOuterParentheses(cond)) {
          cond = cond.slice(1, -1).trim();
        }
        s = s.slice(0, openParen + 1) + cond + s.slice(closeParen);
      }
    }

    return this.normalizeSqlIdentifiers(s);
  }

  private findMatchingParen(s: string, openIndex: number): number {
    let depth = 1;
    let inSingleQuote = false;
    for (let i = openIndex + 1; i < s.length; i++) {
      const char = s[i];
      const next = s[i + 1];

      if (char === "'") {
        if (inSingleQuote && next === "'") {
          i++;
          continue;
        }
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (inSingleQuote) {
        continue;
      }

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private static readonly TRIGGER_EVENT_ORDER: readonly ('INSERT' | 'UPDATE' | 'DELETE')[] = ['INSERT', 'UPDATE', 'DELETE'];

  private static sortTriggerEvents(events: readonly ('INSERT' | 'UPDATE' | 'DELETE')[]): ('INSERT' | 'UPDATE' | 'DELETE')[] {
    return [...events].sort(
      (a, b) => MigrationGenerator.TRIGGER_EVENT_ORDER.indexOf(a) - MigrationGenerator.TRIGGER_EVENT_ORDER.indexOf(b),
    );
  }

  private normalizeTriggerDef(def: string): string {
    let s = def
      .replace(/\s+/g, ' ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .replace(/\bON\s+[a-zA-Z_][a-zA-Z0-9_]*\./gi, 'ON ')
      .trim();

    const eventsMatch = s.match(
      /\b(AFTER|BEFORE)\s+((?:INSERT|UPDATE|DELETE)(?:\s+OR\s+(?:INSERT|UPDATE|DELETE))+)\s+ON\b/i,
    );
    if (eventsMatch) {
      const events = eventsMatch[2].split(/\s+OR\s+/).map((e) => e.toUpperCase());
      const sorted = [...events].sort(
        (a, b) =>
          MigrationGenerator.TRIGGER_EVENT_ORDER.indexOf(a as 'INSERT' | 'UPDATE' | 'DELETE') -
          MigrationGenerator.TRIGGER_EVENT_ORDER.indexOf(b as 'INSERT' | 'UPDATE' | 'DELETE'),
      );
      s = s.replace(eventsMatch[2], sorted.join(' OR '));
    }

    return this.normalizeSqlIdentifiers(s);
  }

  private normalizeCheckExpression(expr: string): string {
    let normalized = expr.replace(/\s+/g, ' ').trim();
    while (this.isWrappedByOuterParentheses(normalized)) {
      normalized = normalized.slice(1, -1).trim();
    }

    return normalized;
  }

  private isWrappedByOuterParentheses(expr: string): boolean {
    if (!expr.startsWith('(') || !expr.endsWith(')')) {
      return false;
    }

    let depth = 0;
    let inSingleQuote = false;
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      const next = expr[i + 1];

      if (char === "'") {
        if (inSingleQuote && next === "'") {
          i++;
          continue;
        }
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (inSingleQuote) {
        continue;
      }

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0 && i !== expr.length - 1) {
          return false;
        }
        if (depth < 0) {
          return false;
        }
      }
    }

    return depth === 0;
  }

  private findExistingConstraint(
    table: string,
    entry: { kind: 'check'; name: string; expression: string },
    preferredConstraintName: string,
  ): { constraintName: string; expression: string; notValid: boolean } | null {
    const existingMap = this.existingCheckConstraints[table];
    if (!existingMap) {
      return null;
    }

    const preferred = existingMap.get(preferredConstraintName);
    if (preferred !== undefined) {
      return {
        constraintName: preferredConstraintName,
        expression: preferred.expression,
        notValid: preferred.notValid,
      };
    }

    const normalizedNewExpression = this.normalizeCheckExpression(entry.expression);
    const constraintPrefix = `${table}_${entry.name}_${entry.kind}_`;

    for (const [constraintName, { expression, notValid }] of existingMap.entries()) {
      if (!constraintName.startsWith(constraintPrefix)) {
        continue;
      }
      if (this.normalizeCheckExpression(expression) !== normalizedNewExpression) {
        continue;
      }

      return { constraintName, expression, notValid };
    }

    return null;
  }

  private async equalExpressions(
    table: string,
    constraintName: string,
    existingExpression: string,
    newExpression: string,
  ): Promise<boolean> {
    try {
      const [canonicalExisting, canonicalNew] = await Promise.all([
        this.canonicalizeCheckExpressionWithPostgres(table, existingExpression),
        this.canonicalizeCheckExpressionWithPostgres(table, newExpression),
      ]);

      return canonicalExisting === canonicalNew;
    } catch (error) {
      console.warn(
        `Failed to canonicalize check constraint "${constraintName}" on table "${table}". Treating it as changed.`,
        error,
      );

      return false;
    }
  }

  private async canonicalizeCheckExpressionWithPostgres(table: string, expression: string): Promise<string> {
    const sourceTableIdentifier = table
      .split('.')
      .map((part) => this.quoteIdentifier(part))
      .join('.');

    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const tableSlug = table.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const tempTableName = `gqm_tmp_check_${tableSlug}_${uniqueSuffix}`;
    const tempTableIdentifier = this.quoteIdentifier(tempTableName);

    const constraintName = `gqm_tmp_check_${uniqueSuffix}`;
    const constraintIdentifier = this.quoteIdentifier(constraintName);

    const trx = await this.knex.transaction();

    try {
      await trx.raw(`CREATE TEMP TABLE ${tempTableIdentifier} (LIKE ${sourceTableIdentifier}) ON COMMIT DROP`);
      await trx.raw(`ALTER TABLE ${tempTableIdentifier} ADD CONSTRAINT ${constraintIdentifier} CHECK (${expression})`);
      const result = await trx.raw(
        `SELECT pg_get_constraintdef(c.oid, true) AS constraint_definition
         FROM pg_constraint c
         JOIN pg_class t
           ON t.oid = c.conrelid
         WHERE t.relname = ?
           AND c.conname = ?
         ORDER BY c.oid DESC
         LIMIT 1`,
        [tempTableName, constraintName],
      );

      const rows: { constraint_definition: string }[] =
        'rows' in result && Array.isArray((result as { rows: unknown }).rows)
          ? (result as { rows: { constraint_definition: string }[] }).rows
          : [];
      const definition = rows[0]?.constraint_definition;
      if (!definition) {
        throw new Error(`Could not read canonical check definition for expression: ${expression}`);
      }

      return this.normalizeCheckExpression(this.extractCheckExpressionFromDefinition(definition));
    } finally {
      try {
        await trx.rollback();
      } catch {
        // no-op: transaction may already be closed by driver after failure
      }
    }
  }

  private extractCheckExpressionFromDefinition(definition: string): string {
    const trimmed = definition.trim().replace(/\s+NOT\s+VALID\s*$/i, '');
    const match = trimmed.match(/^CHECK\s*\(([\s\S]*)\)$/i);
    if (!match) {
      return trimmed;
    }

    return match[1];
  }

  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private quoteQualifiedIdentifier(identifier: string): string {
    return identifier
      .split('.')
      .map((part) => this.quoteIdentifier(part))
      .join('.');
  }

  /** Escape expression for embedding inside a template literal in generated code */
  private escapeExpressionForRaw(expr: string): string {
    return expr.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  private addCheckConstraint(
    table: string,
    constraintName: string,
    expression: string,
    deferrable?: 'INITIALLY DEFERRED' | 'INITIALLY IMMEDIATE',
    notValid?: boolean,
  ) {
    const escaped = this.escapeExpressionForRaw(expression);
    const deferrableClause = deferrable ? ` DEFERRABLE ${deferrable}` : '';
    const notValidClause = notValid ? ` NOT VALID` : '';
    this.writer.writeLine(
      `await knex.raw(\`ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" CHECK (${escaped})${deferrableClause}${notValidClause}\`);`,
    );
    this.writer.blankLine();
  }

  private dropCheckConstraint(table: string, constraintName: string) {
    this.writer.writeLine(`await knex.raw('ALTER TABLE "${table}" DROP CONSTRAINT "${constraintName}"');`);
    this.writer.blankLine();
  }

  private buildExcludeDef(entry: {
    using: string;
    elements: readonly ({ column: string; operator: string } | { expression: string; operator: string })[];
    where?: string;
    deferrable?: 'INITIALLY DEFERRED' | 'INITIALLY IMMEDIATE';
    notValid?: boolean;
  }): string {
    const elementsStr = entry.elements
      .map((el) => ('column' in el ? `"${el.column}" WITH ${el.operator}` : `${el.expression} WITH ${el.operator}`))
      .join(', ');
    const whereClause = entry.where ? ` WHERE (${entry.where})` : '';
    const deferrableClause = entry.deferrable ? ` DEFERRABLE ${entry.deferrable}` : '';
    const notValidClause = entry.notValid ? ` NOT VALID` : '';

    return `EXCLUDE USING ${entry.using} (${elementsStr})${whereClause}${deferrableClause}${notValidClause}`;
  }

  private addExcludeConstraint(
    table: string,
    constraintName: string,
    entry: {
      using: string;
      elements: readonly ({ column: string; operator: string } | { expression: string; operator: string })[];
      where?: string;
      deferrable?: 'INITIALLY DEFERRED' | 'INITIALLY IMMEDIATE';
      notValid?: boolean;
    },
  ) {
    const def = this.buildExcludeDef(entry);
    const escaped = this.escapeExpressionForRaw(def);
    this.writer.writeLine(`await knex.raw(\`ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" ${escaped}\`);`);
    this.writer.blankLine();
  }

  private dropExcludeConstraint(table: string, constraintName: string) {
    this.writer.writeLine(`await knex.raw('ALTER TABLE "${table}" DROP CONSTRAINT "${constraintName}"');`);
    this.writer.blankLine();
  }

  private sortTriggerEvents(events: readonly ('INSERT' | 'UPDATE' | 'DELETE')[]): ('INSERT' | 'UPDATE' | 'DELETE')[] {
    return [...events].sort(
      (a, b) => MigrationGenerator.TRIGGER_EVENT_ORDER.indexOf(a) - MigrationGenerator.TRIGGER_EVENT_ORDER.indexOf(b),
    );
  }

  private buildConstraintTriggerDef(
    table: string,
    constraintName: string,
    entry: {
      when: 'AFTER' | 'BEFORE';
      events: readonly ('INSERT' | 'UPDATE' | 'DELETE')[];
      forEach: 'ROW' | 'STATEMENT';
      deferrable?: 'INITIALLY DEFERRED' | 'INITIALLY IMMEDIATE';
      function: { name: string; args?: readonly string[] };
    },
  ): string {
    const eventsStr = this.sortTriggerEvents(entry.events).join(' OR ');
    const deferrableClause = entry.deferrable ? ` DEFERRABLE ${entry.deferrable}` : '';
    const argsStr = entry.function.args?.length ? entry.function.args.map((a) => `"${a}"`).join(', ') : '';
    const executeClause = argsStr
      ? `EXECUTE FUNCTION ${entry.function.name}(${argsStr})`
      : `EXECUTE FUNCTION ${entry.function.name}()`;

    return `CREATE CONSTRAINT TRIGGER "${constraintName}" ${entry.when} ${eventsStr} ON "${table}"${deferrableClause} FOR EACH ${entry.forEach} ${executeClause}`;
  }

  private validateConstraintTrigger(
    model: EntityModel,
    entry: {
      name: string;
      function: { name: string; args?: readonly string[] };
    },
  ): void {
    const fnName = entry.function.name;
    if (!this.parsedFunctions || this.parsedFunctions.length === 0) {
      throw new Error(
        `Constraint trigger "${entry.name}" on model ${model.name} references function "${fnName}" which must be defined in functions.ts. Ensure functions.ts exists and defines the function.`,
      );
    }
    const defined = this.parsedFunctions.find((pf) => pf.name === fnName);
    if (!defined) {
      const validList = this.parsedFunctions
        .map((pf) => pf.name)
        .sort()
        .join(', ');
      throw new Error(
        `Constraint trigger "${entry.name}" on model ${model.name} references function "${fnName}" which is not defined in functions.ts. Defined functions: ${validList || '(none)'}.`,
      );
    }
  }

  private addConstraintTrigger(
    table: string,
    constraintName: string,
    entry: {
      when: 'AFTER' | 'BEFORE';
      events: readonly ('INSERT' | 'UPDATE' | 'DELETE')[];
      forEach: 'ROW' | 'STATEMENT';
      deferrable?: 'INITIALLY DEFERRED' | 'INITIALLY IMMEDIATE';
      function: { name: string; args?: readonly string[] };
    },
  ) {
    const eventsStr = this.sortTriggerEvents(entry.events).join(' OR ');
    const deferrableClause = entry.deferrable ? ` DEFERRABLE ${entry.deferrable}` : '';
    const argsStr = entry.function.args?.length ? entry.function.args.map((a) => `"${a}"`).join(', ') : '';
    const executeClause = argsStr
      ? `EXECUTE FUNCTION ${entry.function.name}(${argsStr})`
      : `EXECUTE FUNCTION ${entry.function.name}()`;
    this.writer.writeLine(
      `await knex.raw(\`CREATE CONSTRAINT TRIGGER "${constraintName}" ${entry.when} ${eventsStr} ON "${table}"${deferrableClause} FOR EACH ${entry.forEach} ${executeClause}\`);`,
    );
    this.writer.blankLine();
  }

  private dropConstraintTrigger(table: string, constraintName: string) {
    this.writer.writeLine(`await knex.raw('DROP TRIGGER IF EXISTS "${constraintName}" ON "${table}"');`);
    this.writer.blankLine();
  }

  private value(value: Value) {
    if (typeof value === 'string') {
      return `'${value}'`;
    }

    return value;
  }

  private columnRaw(
    { name, ...field }: EntityField,
    { setNonNull = true, alter = false } = {},
    index: number,
    toColumn?: Column,
  ) {
    const nonNull = () => {
      if (setNonNull) {
        if (toColumn) {
          if (toColumn.is_nullable) {
            return false;
          }

          return true;
        }
        if (field.nonNull) {
          return true;
        }

        return false;
      }
    };
    const kind = field.kind;
    if (field.generateAs) {
      if (field.generateAs.type === 'expression') {
        throw new Error(`Expression fields cannot be created in SQL schema.`);
      }

      let type = '';
      switch (kind) {
        case undefined:
        case 'primitive':
          switch (field.type) {
            case 'Float':
              type = `decimal(${field.precision ?? 'undefined'}, ${field.scale ?? 'undefined'})`;
              break;
            case 'Boolean':
              type = 'boolean';
              break;
            default:
              throw new Error(`Generated columns of kind ${kind} and type ${field.type} are not supported yet.`);
          }
          break;
        default:
          throw new Error(`Generated columns of kind ${kind} are not supported yet.`);
      }
      if (index) {
        this.writer.write(`,`);
      }
      if (alter) {
        this.writer.write(` ALTER COLUMN "${name}" TYPE ${type}`);
        if (setNonNull) {
          if (nonNull()) {
            this.writer.write(`, ALTER COLUMN "${name}" SET NOT NULL`);
          } else {
            this.writer.write(`, ALTER COLUMN "${name}" DROP NOT NULL`);
          }
        }
        this.writer.write(`, ALTER COLUMN "${name}" SET EXPRESSION AS (${field.generateAs.expression})`);
      } else {
        this.writer.write(
          `ADD COLUMN "${name}" ${type}${nonNull() ? ' not null' : ''} GENERATED ALWAYS AS (${field.generateAs.expression}) STORED`,
        );
      }

      return;
    }

    throw new Error(`Only generated columns can be created with columnRaw`);
  }

  private column(
    { name, primary, list, ...field }: EntityField,
    { setUnique = true, setNonNull = true, alter = false, foreign = true, setDefault = true } = {},
    toColumn?: Column,
  ) {
    const nonNull = () => {
      if (setNonNull) {
        if (toColumn) {
          if (toColumn.is_nullable) {
            return false;
          }

          return true;
        }
        if (field.nonNull) {
          return true;
        }

        return false;
      }
    };
    const kind = field.kind;
    if (field.generateAs) {
      if (field.generateAs.type === 'expression') {
        throw new Error(`Expression fields cannot be created in SQL schema.`);
      }

      let type = '';
      switch (kind) {
        case undefined:
        case 'primitive':
          switch (field.type) {
            case 'Float':
              type = `decimal(${field.precision ?? 'undefined'}, ${field.scale ?? 'undefined'})`;
              break;
            case 'Boolean':
              type = 'boolean';
              break;
            default:
              throw new Error(`Generated columns of kind ${kind} and type ${field.type} are not supported yet.`);
          }
          break;
        default:
          throw new Error(`Generated columns of kind ${kind} are not supported yet.`);
      }
      this.writer.write(
        `table.specificType('${name}', '${type}${nonNull() ? ' not null' : ''} GENERATED ALWAYS AS (${field.generateAs.expression}) ${field.generateAs.type === 'virtual' ? 'VIRTUAL' : 'STORED'}')`,
      );
      if (alter) {
        this.writer.write('.alter()');
      }
      this.writer.write(';').newLine();

      return;
    }

    const col = (what?: string) => {
      if (what) {
        this.writer.write(what);
      }
      if (setNonNull) {
        this.writer.write(nonNull() ? '.notNullable()' : '.nullable()');
      }
      if (setDefault && field.defaultValue !== undefined) {
        this.writer.write(`.defaultTo(${this.value(field.defaultValue)})`);
      }
      if (primary) {
        this.writer.write('.primary()');
      } else if (setUnique && field.unique) {
        this.writer.write('.unique()');
      }
      if (alter) {
        this.writer.write('.alter()');
      }
      this.writer.write(';').newLine();
    };
    switch (kind) {
      case undefined:
      case 'primitive':
        switch (field.type) {
          case 'Boolean':
            col(`table.boolean('${name}')`);
            break;
          case 'Int':
            col(`table.integer('${name}')`);
            break;
          case 'Float':
            if (field.double) {
              col(`table.double('${name}')`);
            } else {
              col(`table.decimal('${name}', ${field.precision ?? 'undefined'}, ${field.scale ?? 'undefined'})`);
            }
            break;
          case 'String':
            if (field.large) {
              col(`table.text('${name}')`);
            } else {
              col(`table.string('${name}', ${field.maxLength})`);
            }
            break;
          case 'DateTime':
            col(`table.timestamp('${name}')`);
            break;
          case 'Time':
            col(`table.specificType('${name}', 'time without time zone')`);
            break;
          case 'ID':
            col(`table.uuid('${name}')`);
            break;
          case 'Upload':
            break;
        }
        break;
      case 'relation':
        col(`table.uuid('${field.foreignKey}')`);
        if (foreign && !alter) {
          this.writer.writeLine(`table.index('${field.foreignKey}');`);
          this.writer.writeLine(
            `table.foreign('${field.foreignKey}').references('id').inTable('${field.type}').onDelete('${field.onDelete?.toUpperCase() ?? 'CASCADE'}');`,
          );
        }
        break;
      case 'enum':
        if (list) {
          this.writer.write(`table.specificType('${name}', '"${typeToField(field.type)}"[]')`);
        } else {
          this.writer
            .write(`table.enum('${name}', null, `)
            .inlineBlock(() => {
              this.writer.writeLine(`useNative: true,`);
              this.writer.writeLine(`existingType: true,`);
              this.writer.writeLine(`enumName: '${typeToField(field.type)}',`);
            })
            .write(')');
        }
        col();
        break;
      case 'json':
        col(`table.json('${typeToField(name)}')`);
        break;
      case 'custom':
        throw new Error(`Can't create a column for ${name} because it's a custom field`);
      default: {
        const exhaustiveCheck: never = kind;
        throw new Error(exhaustiveCheck);
      }
    }
  }

  private getColumn(tableName: string, columnName: string) {
    return this.columns[tableName].find((col) => col.name === columnName);
  }

  private hasChanged(model: EntityModel, field: EntityField) {
    return this.hasChangedOnTable(model.name, field, { respectNullability: true });
  }

  private hasChangedOnTable(tableName: string, field: EntityField, { respectNullability }: { respectNullability: boolean }) {
    if (field.generateAs?.type === 'expression') {
      return false;
    }

    const col = this.getColumn(tableName, field.kind === 'relation' ? `${field.name}Id` : field.name);
    if (!col) {
      return false;
    }

    if (field.generateAs) {
      if (col.generation_expression !== field.generateAs.expression) {
        if (respectNullability) {
          throw new Error(
            `Column ${col.name} has specific type ${col.generation_expression} but expected ${field.generateAs.expression}`,
          );
        }

        return true;
      }
    }

    if (respectNullability && ((!field.nonNull && !col.is_nullable) || (field.nonNull && col.is_nullable))) {
      return true;
    }

    if (!field.kind || field.kind === 'primitive') {
      if (field.type === 'Int') {
        if (col.data_type !== 'integer') {
          return true;
        }
      }
      if (field.type === 'Float') {
        if (field.double) {
          if (col.data_type !== 'double precision') {
            return true;
          }
        } else if (col.data_type !== 'numeric') {
          return true;
        }
        if (field.precision && col.numeric_precision && field.precision !== col.numeric_precision) {
          return true;
        }
        if (field.scale && col.numeric_scale && field.scale !== col.numeric_scale) {
          return true;
        }
      }
      if (field.type === 'String') {
        if (field.large && col.data_type !== 'text') {
          return true;
        }
        if (field.stringType === 'richText' && col.data_type !== 'text') {
          return true;
        }
        if (!field.large && field.maxLength && col.max_length && field.maxLength !== col.max_length) {
          return true;
        }
      }
      if (field.type === 'Time') {
        if (!['time without time zone', 'time'].includes(col.data_type)) {
          return true;
        }
      }
    }

    return false;
  }

  private revisionFieldNeedsSchemaAlter(model: EntityModel, field: EntityField) {
    if (field.generateAs?.type === 'expression') {
      return false;
    }

    const tableName = `${model.name}Revision`;
    const colName = field.kind === 'relation' ? `${field.name}Id` : field.name;
    const revCol = this.getColumn(tableName, colName);
    if (!revCol) {
      return false;
    }

    if (field.generateAs) {
      if (revCol.generation_expression !== field.generateAs.expression) {
        return true;
      }
    }

    return this.hasChangedOnTable(tableName, field, { respectNullability: false });
  }

  private async handleFunctions(up: Callbacks, down: Callbacks) {
    if (!this.parsedFunctions || this.parsedFunctions.length === 0) {
      return;
    }

    const definedFunctions = this.parsedFunctions;

    const dbFunctions = await getDatabaseFunctions(this.knex);
    const dbFunctionsBySignature = new Map<string, DatabaseFunction>();
    for (const func of dbFunctions) {
      dbFunctionsBySignature.set(func.signature, func);
    }

    const definedFunctionsBySignature = new Map<string, ParsedFunction>();
    for (const func of definedFunctions) {
      definedFunctionsBySignature.set(func.signature, func);
    }

    const functionsToRestore: { func: DatabaseFunction; definition: string }[] = [];

    for (const definedFunc of definedFunctions) {
      const dbFunc = dbFunctionsBySignature.get(definedFunc.signature);

      if (!dbFunc) {
        up.push(() => {
          this.writer.writeLine(`await knex.raw(\`${definedFunc.fullDefinition.replace(/`/g, '\\`')}\`);`).blankLine();
        });

        down.push(() => {
          const isAggregate = definedFunc.isAggregate;
          const dropMatch = definedFunc.fullDefinition.match(/CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|AGGREGATE)\s+([^(]+)\(/i);
          if (dropMatch) {
            const functionName = dropMatch[3].trim();
            const argsMatch = definedFunc.fullDefinition.match(
              /CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|AGGREGATE)\s+[^(]+\(([^)]*)\)/i,
            );
            const args = argsMatch ? argsMatch[3].trim() : '';
            const dropType = isAggregate ? 'AGGREGATE' : 'FUNCTION';
            this.writer
              .writeLine(`await knex.raw(\`DROP ${dropType} IF EXISTS ${functionName}${args ? `(${args})` : ''}\`);`)
              .blankLine();
          }
        });
      } else {
        const dbBody = dbFunc.isAggregate ? normalizeAggregateDefinition(dbFunc.body) : normalizeFunctionBody(dbFunc.body);
        const definedBody = definedFunc.isAggregate
          ? normalizeAggregateDefinition(definedFunc.body)
          : normalizeFunctionBody(definedFunc.body);

        if (dbBody !== definedBody) {
          const oldDefinition = dbFunc.definition || dbFunc.body;

          up.push(() => {
            this.writer.writeLine(`await knex.raw(\`${definedFunc.fullDefinition.replace(/`/g, '\\`')}\`);`).blankLine();
          });

          down.push(() => {
            if (oldDefinition) {
              this.writer.writeLine(`await knex.raw(\`${oldDefinition.replace(/`/g, '\\`')}\`);`).blankLine();
            }
          });
        }
      }
    }

    for (const dbFunc of dbFunctions) {
      if (!definedFunctionsBySignature.has(dbFunc.signature)) {
        const definition = dbFunc.definition || dbFunc.body;

        if (definition) {
          functionsToRestore.push({ func: dbFunc, definition });

          down.push(() => {
            const argsMatch = dbFunc.signature.match(/\(([^)]*)\)/);
            const args = argsMatch ? argsMatch[1] : '';
            const dropType = dbFunc.isAggregate ? 'AGGREGATE' : 'FUNCTION';
            this.writer
              .writeLine(`await knex.raw(\`DROP ${dropType} IF EXISTS ${dbFunc.name}${args ? `(${args})` : ''}\`);`)
              .blankLine();
          });
        }
      }
    }

    for (const { definition } of functionsToRestore) {
      up.push(() => {
        this.writer.writeLine(`await knex.raw(\`${definition.replace(/`/g, '\\`')}\`);`).blankLine();
      });
    }
  }
}

export const getMigrationDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};
