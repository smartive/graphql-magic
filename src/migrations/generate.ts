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
import { Value } from '../values';

type Callbacks = (() => void)[];

export class MigrationGenerator {
  // eslint-disable-next-line @typescript-eslint/dot-notation
  private writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });
  private schema: SchemaInspectorType;
  private columns: Record<string, Column[]> = {};
  private uuidUsed?: boolean;
  private nowUsed?: boolean;

  constructor(
    knex: Knex,
    private models: Models,
  ) {
    this.schema = SchemaInspector(knex);
  }

  public async generate() {
    const { writer, schema, models } = this;
    const enums = (await schema.knex('pg_type').where({ typtype: 'e' }).select('typname')).map(({ typname }) => typname);
    const tables = await schema.tables();
    for (const table of tables) {
      this.columns[table] = await schema.columnInfo(table);
    }

    const up: Callbacks = [];
    const down: Callbacks = [];

    this.createEnums(
      this.models.enums.filter((enm) => !enums.includes(lowerFirst(enm.name))),
      up,
      down,
    );

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
              for (const field of model.fields.filter(not(isInherited))) {
                this.column(field);
              }
            });
          });

          down.push(() => {
            this.dropTable(model.name);
          });
        } else {
          // Rename fields
          this.renameFields(
            model,
            model.fields.filter(not(isInherited)).filter(({ oldName }) => oldName),
            up,
            down,
          );

          // Add missing fields
          this.createFields(
            model,
            model.fields
              .filter(not(isInherited))
              .filter(
                ({ name, ...field }) =>
                  field.kind !== 'custom' &&
                  !this.getColumn(model.name, field.kind === 'relation' ? field.foreignKey || `${name}Id` : name),
              ),
            up,
            down,
          );

          // Update fields
          const existingFields = model.fields.filter(({ name, kind, nonNull }) => {
            const col = this.getColumn(model.name, kind === 'relation' ? `${name}Id` : name);
            if (!col) {
              return false;
            }

            return !nonNull && !col.is_nullable;
          });
          this.updateFields(model, existingFields, up, down);
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
                          writer.writeLine(`id: uuid(),`);
                          writer.writeLine(`${typeToField(model.name)}Id: row.id,`);
                          this.nowUsed = true;
                          writer.writeLine(`createdAt: row.updatedAt || row.createdAt || now,`);
                          writer.writeLine(`createdById: row.updatedById || row.createdById,`);
                          if (model.deletable) {
                            writer.writeLine(`deleted: row.deleted,`);
                            writer.writeLine(`deleteRootType: row.deleteRootType,`);
                            writer.writeLine(`deleteRootId: row.deleteRootId,`);
                          }

                          for (const { name, kind } of model.fields.filter(isUpdatableField)) {
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
            const missingRevisionFields = model.fields
              .filter(isUpdatableField)
              .filter(
                ({ name, ...field }) =>
                  field.kind !== 'custom' &&
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
      writer.writeLine(`import { v4 as uuid } from 'uuid';`);
    }
    if (this.nowUsed) {
      writer.writeLine(`import { date } from '../src/utils/dates';`);
    }
    writer.blankLine();

    if (this.nowUsed) {
      writer.writeLine(`const now = date();`).blankLine();
    }

    this.migration('up', up);
    this.migration('down', down.reverse());

    return writer.toString();
  }

  private renameFields(model: EntityModel, fields: EntityField[], up: Callbacks, down: Callbacks) {
    if (!fields.length) {
      return;
    }

    up.push(() => {
      for (const field of fields) {
        this.alterTable(model.name, () => {
          this.renameColumn(
            field.kind === 'relation' ? `${field.oldName}Id` : get(field, 'oldName'),
            field.kind === 'relation' ? `${field.name}Id` : field.name,
          );
        });
      }
    });

    down.push(() => {
      for (const field of fields) {
        this.alterTable(model.name, () => {
          this.renameColumn(
            field.kind === 'relation' ? `${field.name}Id` : field.name,
            field.kind === 'relation' ? `${field.oldName}Id` : get(field, 'oldName'),
          );
        });
      }
    });

    for (const field of fields) {
      summonByName(this.columns[model.name], field.kind === 'relation' ? `${field.oldName!}Id` : field.oldName!).name =
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
        alter.push(() => this.column(field, { setNonNull: field.defaultValue !== undefined }));

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
        for (const { kind, name } of fields) {
          this.dropColumn(kind === 'relation' ? `${name}Id` : name);
        }
      });
    });
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
      const updatableFields = fields.filter(isUpdatableField);
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

      for (const field of model.fields.filter(and(isUpdatableField, not(isInherited)))) {
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
        this.writer
          .write(`await knex('${model.name}Revision').update(`)
          .inlineBlock(() => {
            for (const { name, kind: type } of missingRevisionFields) {
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
    this.writer.writeLine(`table.renameColumn('${from}', '${to}')`);
  }

  private value(value: Value) {
    if (typeof value === 'string') {
      return `'${value}'`;
    }

    return value;
  }

  private column(
    { name, primary, list, ...field }: EntityField,
    { setUnique = true, setNonNull = true, alter = false, foreign = true, setDefault = true } = {},
    toColumn?: Column,
  ) {
    const col = (what?: string) => {
      if (what) {
        this.writer.write(what);
      }
      if (setNonNull) {
        if (toColumn) {
          if (toColumn.is_nullable) {
            this.writer.write(`.nullable()`);
          } else {
            this.writer.write('.notNullable()');
          }
        } else {
          if (field.nonNull) {
            this.writer.write(`.notNullable()`);
          } else {
            this.writer.write('.nullable()');
          }
        }
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
    const kind = field.kind;
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
        this.writer.write(`table.json('${typeToField(field.type)}')`);
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
