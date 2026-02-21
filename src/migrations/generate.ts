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
  isUpdatableField,
  isUpdatableModel,
  modelNeedsTable,
  not,
  summonByName,
  typeToField,
} from '../models/utils';
import { getColumnName } from '../resolvers';
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
  /** table name -> constraint name -> check clause expression */
  private existingCheckConstraints: Record<string, Map<string, string>> = {};
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
      `SELECT tc.table_name, tc.constraint_name, cc.check_clause
       FROM information_schema.table_constraints tc
       JOIN information_schema.check_constraints cc
         ON tc.constraint_schema = cc.constraint_schema AND tc.constraint_name = cc.constraint_name
       WHERE tc.table_schema = ? AND tc.constraint_type = ?`,
      ['public', 'CHECK'],
    );
    const rows: { table_name: string; constraint_name: string; check_clause: string }[] =
      'rows' in checkResult && Array.isArray((checkResult as { rows: unknown }).rows)
        ? (checkResult as { rows: { table_name: string; constraint_name: string; check_clause: string }[] }).rows
        : [];
    for (const row of rows) {
      const tableName = row.table_name;
      if (!this.existingCheckConstraints[tableName]) {
        this.existingCheckConstraints[tableName] = new Map();
      }
      this.existingCheckConstraints[tableName].set(row.constraint_name, row.check_clause);
    }

    const up: Callbacks = [];
    const down: Callbacks = [];

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
                const table = model.name;
                const constraintName = this.getCheckConstraintName(model, entry, i);
                const expression = entry.expression;
                up.push(() => {
                  this.addCheckConstraint(table, constraintName, expression);
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
            const existingMap = this.existingCheckConstraints[model.name];
            for (let i = 0; i < model.constraints.length; i++) {
              const entry = model.constraints[i];
              if (entry.kind !== 'check') {
                continue;
              }
              const table = model.name;
              const constraintName = this.getCheckConstraintName(model, entry, i);
              const newExpression = entry.expression;
              const existingExpression = existingMap?.get(constraintName);
              if (existingExpression === undefined) {
                up.push(() => {
                  this.addCheckConstraint(table, constraintName, newExpression);
                });
                down.push(() => {
                  this.dropCheckConstraint(table, constraintName);
                });
              } else if (
                this.normalizeCheckExpression(existingExpression) !== this.normalizeCheckExpression(newExpression)
              ) {
                up.push(() => {
                  this.dropCheckConstraint(table, constraintName);
                  this.addCheckConstraint(table, constraintName, newExpression);
                });
                down.push(() => {
                  this.dropCheckConstraint(table, constraintName);
                  this.addCheckConstraint(table, constraintName, existingExpression);
                });
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

                          for (const { name, kind } of model.fields
                            .filter(isUpdatableField)
                            .filter((f) => !(f.generateAs?.type === 'expression'))) {
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
              .filter(isUpdatableField)
              .filter(
                ({ name, ...field }) =>
                  field.kind !== 'custom' &&
                  !(field.generateAs?.type === 'expression') &&
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
      const updatableFields = fields.filter(isUpdatableField).filter((f) => !(f.generateAs?.type === 'expression'));
      if (!updatableFields.length) {
        return;
      }

      up.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const [index, field] of updatableFields.entries()) {
            this.columnRaw(field, { alter: true }, index);
          }
        });
      });

      down.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const [index, field] of updatableFields.entries()) {
            this.columnRaw(
              field,
              { alter: true },
              index,
              summonByName(this.columns[model.name], field.kind === 'relation' ? `${field.name}Id` : field.name),
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
      const updatableFields = fields.filter(isUpdatableField).filter((f) => !(f.generateAs?.type === 'expression'));
      if (!updatableFields.length) {
        return;
      }

      up.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const field of updatableFields) {
            this.column(field, { alter: true });
          }
        });
      });

      down.push(() => {
        this.alterTable(`${model.name}Revision`, () => {
          for (const field of updatableFields) {
            this.column(
              field,
              { alter: true },
              summonByName(this.columns[model.name], field.kind === 'relation' ? `${field.name}Id` : field.name),
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

      for (const field of model.fields
        .filter(and(isUpdatableField, not(isInherited)))
        .filter((f) => !(f.generateAs?.type === 'expression'))) {
        this.column(field, { setUnique: false, setDefault: false });
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
            this.column(field, { setUnique: false, setNonNull: false, setDefault: false });
          }
        });

        // Insert data for missing revisions columns
        const revisionFieldsWithDataToCopy = missingRevisionFields.filter(
          (field) =>
            this.columns[model.name].find((col) => col.name === getColumnName(field)) ||
            field.defaultValue !== undefined ||
            field.nonNull,
        );
        if (revisionFieldsWithDataToCopy.length) {
          this.writer
            .write(`await knex('${model.name}Revision').update(`)
            .inlineBlock(() => {
              for (const { name, kind: type } of revisionFieldsWithDataToCopy) {
                const col = type === 'relation' ? `${name}Id` : name;
                this.writer
                  .write(
                    `${col}: knex.raw('(select "${col}" from "${model.name}" where "${model.name}".id = "${
                      model.name
                    }Revision"."${typeToField(model.name)}Id")'),`,
                  )
                  .newLine();
              }
            })
            .write(');')
            .newLine()
            .blankLine();
        }

        const nonNullableMissingRevisionFields = missingRevisionFields.filter(({ nonNull }) => nonNull);
        if (nonNullableMissingRevisionFields.length) {
          this.alterTable(revisionTable, () => {
            for (const field of nonNullableMissingRevisionFields) {
              this.column(field, { setUnique: false, setDefault: false, alter: true });
            }
          });
        }
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

  private getCheckConstraintName(model: EntityModel, entry: { kind: string; name: string }, index: number): string {
    return `${model.name}_${entry.name}_${entry.kind}_${index}`;
  }

  private normalizeCheckExpression(expr: string): string {
    return expr.replace(/\s+/g, ' ').trim();
  }

  /** Escape expression for embedding inside a template literal in generated code */
  private escapeExpressionForRaw(expr: string): string {
    return expr.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  private addCheckConstraint(table: string, constraintName: string, expression: string) {
    const escaped = this.escapeExpressionForRaw(expression);
    this.writer.writeLine(
      `await knex.raw(\`ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" CHECK (${escaped})\`);`,
    );
    this.writer.blankLine();
  }

  private dropCheckConstraint(table: string, constraintName: string) {
    this.writer.writeLine(`await knex.raw('ALTER TABLE "${table}" DROP CONSTRAINT "${constraintName}"');`);
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
    if (field.generateAs?.type === 'expression') {
      return false;
    }

    const col = this.getColumn(model.name, field.kind === 'relation' ? `${field.name}Id` : field.name);
    if (!col) {
      return false;
    }

    if (field.generateAs) {
      if (col.generation_expression !== field.generateAs.expression) {
        throw new Error(
          `Column ${col.name} has specific type ${col.generation_expression} but expected ${field.generateAs.expression}`,
        );
      }
    }

    if ((!field.nonNull && !col.is_nullable) || (field.nonNull && col.is_nullable)) {
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
    }

    return false;
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
