import { Knex } from 'knex';

export const up = async (knex: Knex) => {
  await knex.raw(`CREATE TYPE "someEnum" AS ENUM ('A','B','C')`);

  await knex.raw(`CREATE TYPE "reactionType" AS ENUM ('Review','Question','Answer')`);

  await knex.schema.alterTable('User', (table) => {
    table.string('username', undefined);
  });

  await knex.schema.createTable('AnotherObject', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('name', undefined).nullable();
    table.uuid('myselfId').nullable();
    table.index('myselfId');
    table.foreign('myselfId').references('id').inTable('AnotherObject').onDelete('CASCADE');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.index('deletedById');
    table.foreign('deletedById').references('id').inTable('User').onDelete('CASCADE');
    table.string('deleteRootType', undefined).nullable();
    table.uuid('deleteRootId').nullable();
  });

  await knex.schema.createTable('SomeObject', (table) => {
    table.uuid('id').notNullable().primary();
    table.string('field', undefined).nullable();
    table.uuid('anotherId').nullable();
    table.index('anotherId');
    table.foreign('anotherId').references('id').inTable('AnotherObject').onDelete('CASCADE');
    table.decimal('float', 1, 1).notNullable();
    table.specificType('list', '"someEnum"[]').notNullable();
    table.integer('xyz').notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdById').notNullable();
    table.index('createdById');
    table.foreign('createdById').references('id').inTable('User').onDelete('CASCADE');
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedById').notNullable();
    table.index('updatedById');
    table.foreign('updatedById').references('id').inTable('User').onDelete('CASCADE');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.index('deletedById');
    table.foreign('deletedById').references('id').inTable('User').onDelete('CASCADE');
    table.string('deleteRootType', undefined).nullable();
    table.uuid('deleteRootId').nullable();
  });

  await knex.schema.createTable('SomeObjectRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('someObjectId').notNullable();
    table.uuid('createdById').notNullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now(0));
    table.boolean('deleted').notNullable();
    table.string('deleteRootType');
    table.uuid('deleteRootId');
    table.uuid('anotherId').nullable();
    table.index('anotherId');
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
    table.index('parentId');
    table.foreign('parentId').references('id').inTable('Reaction').onDelete('CASCADE');
    table.string('content', undefined).nullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdById').notNullable();
    table.index('createdById');
    table.foreign('createdById').references('id').inTable('User').onDelete('CASCADE');
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedById').notNullable();
    table.index('updatedById');
    table.foreign('updatedById').references('id').inTable('User').onDelete('CASCADE');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('deletedAt').nullable();
    table.uuid('deletedById').nullable();
    table.index('deletedById');
    table.foreign('deletedById').references('id').inTable('User').onDelete('CASCADE');
    table.string('deleteRootType', undefined).nullable();
    table.uuid('deleteRootId').nullable();
  });

  await knex.schema.createTable('ReactionRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('reactionId').notNullable();
    table.uuid('createdById').notNullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now(0));
    table.boolean('deleted').notNullable();
    table.string('deleteRootType');
    table.uuid('deleteRootId');
    table.string('content', undefined).nullable();
  });

  await knex.schema.createTable('Review', (table) => {
    table.uuid('id').notNullable().primary();
    table.index('id');
    table.foreign('id').references('id').inTable('Reaction').onDelete('CASCADE');
    table.decimal('rating', undefined, undefined).nullable();
  });

  await knex.schema.createTable('ReviewRevision', (table) => {
    table.uuid('id').notNullable().primary();
    table.decimal('rating', undefined, undefined).nullable();
  });

  await knex.schema.alterTable('User', (table) => {
    table.dropColumn('updatedAt');
    table.dropColumn('createdAt');
  });

};

export const down = async (knex: Knex) => {
  await knex.schema.alterTable('User', (table) => {
    table.timestamp('createdAt');
    table.timestamp('updatedAt');
  });

  await knex('User').update({
    createdAt: 'TODO',
    updatedAt: 'TODO',
  });

  await knex.schema.alterTable('User', (table) => {
    table.timestamp('createdAt').notNullable().alter();
    table.timestamp('updatedAt').notNullable().alter();
  });

  await knex.schema.dropTable('ReviewRevision');

  await knex.schema.dropTable('Review');

  await knex.schema.dropTable('ReactionRevision');

  await knex.schema.dropTable('Reaction');

  await knex.schema.dropTable('SomeObjectRevision');

  await knex.schema.dropTable('SomeObject');

  await knex.schema.dropTable('AnotherObject');

  await knex.schema.alterTable('User', (table) => {
    table.dropColumn('username');
  });

  await knex.raw('DROP TYPE "reactionType"');
  await knex.raw('DROP TYPE "someEnum"');
};

