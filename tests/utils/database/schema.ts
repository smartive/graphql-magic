import { Knex } from 'knex';

export const setupSchema = async (knex: Knex) => {
  await knex.raw(`CREATE TYPE "someEnum" AS ENUM ('A','B','C')`);

  await knex.raw(`CREATE TYPE "role" AS ENUM ('ADMIN','USER')`);

  await knex.schema.createTable('User', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('username', undefined).nullable();
    table
      .enum('role', null as any, {
        useNative: true,
        existingType: true,
        enumName: 'role',
      })
      .nullable();
  });

  await knex.schema.createTable('AnotherObject', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('myselfId').notNullable();
    table.foreign('myselfId').references('id').inTable('AnotherObject');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.foreign('deletedById').references('id').inTable('User');
  });

  await knex.schema.createTable('AnotherObjectRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.boolean('deleted').notNullable();
  });
  
  await knex.schema.createTable('SomeObject', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('field', undefined).nullable();
    table.uuid('anotherId').notNullable();
    table.foreign('anotherId').references('id').inTable('AnotherObject');
    table.decimal('list', 1, 1).notNullable();
    table.integer('xyz').notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdById').notNullable();
    table.foreign('createdById').references('id').inTable('User');
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedById').notNullable();
    table.foreign('updatedById').references('id').inTable('User');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.foreign('deletedById').references('id').inTable('User');
  });

  await knex.schema.createTable('SomeObjectRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('someObjectId').notNullable();
    table.uuid('createdById').notNullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now(0));
    table.boolean('deleted').notNullable();
    table.integer('xyz').notNullable();
  });
};
