import { Knex } from 'knex';

export const up = async (knex: Knex) => {
  await knex.raw(`CREATE TYPE "someEnum" AS ENUM ('A','B','C')`);

  await knex.raw(`CREATE TYPE "role" AS ENUM ('ADMIN','USER')`);

  await knex.raw(`CREATE TYPE "reactionType" AS ENUM ('Review','Question','Answer')`);

  await knex.schema.createTable('User', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('username', undefined).nullable();
    table.enum('role', null, {
      useNative: true,
      existingType: true,
      enumName: 'role',
    }).notNullable();
  });

  await knex.schema.createTable('AnotherObject', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('name', undefined).nullable();
    table.uuid('myselfId').nullable();
    table.foreign('myselfId').references('id').inTable('AnotherObject').onDelete('CASCADE');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.foreign('deletedById').references('id').inTable('User').onDelete('CASCADE');
  });

  await knex.schema.createTable('SomeObject', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('field', undefined).nullable();
    table.uuid('anotherId').nullable();
    table.foreign('anotherId').references('id').inTable('AnotherObject').onDelete('CASCADE');
    table.decimal('float', 1, 1).notNullable();
    table.specificType('list', '"someEnum"[]').notNullable();
    table.integer('xyz').notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdById').notNullable();
    table.foreign('createdById').references('id').inTable('User').onDelete('CASCADE');
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedById').notNullable();
    table.foreign('updatedById').references('id').inTable('User').onDelete('CASCADE');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.foreign('deletedById').references('id').inTable('User').onDelete('CASCADE');
  });

  await knex.schema.createTable('SomeObjectRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('someObjectId').notNullable();
    table.uuid('createdById').notNullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now(0));
    table.boolean('deleted').notNullable();
    table.uuid('anotherId').nullable();
    table.foreign('anotherId').references('id').inTable('AnotherObject').onDelete('CASCADE');
    table.integer('xyz').notNullable();
  });

  await knex.schema.createTable('Reaction', (table) => {
    table.uuid('id').notNullable().primary();
    table.enum('type', null, {
      useNative: true,
      existingType: true,
      enumName: 'reactionType',
    }).notNullable();
    table.uuid('parentId').nullable();
    table.foreign('parentId').references('id').inTable('Reaction').onDelete('CASCADE');
    table.string('content', undefined).nullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdById').notNullable();
    table.foreign('createdById').references('id').inTable('User').onDelete('CASCADE');
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedById').notNullable();
    table.foreign('updatedById').references('id').inTable('User').onDelete('CASCADE');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.foreign('deletedById').references('id').inTable('User').onDelete('CASCADE');
  });

  await knex.schema.createTable('ReactionRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('reactionId').notNullable();
    table.uuid('createdById').notNullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now(0));
    table.boolean('deleted').notNullable();
    table.string('content', undefined).nullable();
  });

  await knex.schema.createTable('Review', (table) => {
    table.uuid('id').notNullable().primary();
    table.foreign('id').references('id').inTable('Reaction').onDelete('CASCADE');
    table.decimal('rating', undefined, undefined).nullable();
  });

  await knex.schema.createTable('ReviewRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.decimal('rating', undefined, undefined).nullable();
  });

};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable('ReviewRevision');

  await knex.schema.dropTable('Review');

  await knex.schema.dropTable('ReactionRevision');

  await knex.schema.dropTable('Reaction');

  await knex.schema.dropTable('SomeObjectRevision');

  await knex.schema.dropTable('SomeObject');

  await knex.schema.dropTable('AnotherObject');

  await knex.schema.dropTable('User');

  await knex.raw('DROP TYPE "reactionType"');
  await knex.raw('DROP TYPE "role"');
  await knex.raw('DROP TYPE "someEnum"');
};

