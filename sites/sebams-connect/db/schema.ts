import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('sebams_users',{owner:text('owner').primaryKey(),revision:integer('revision').notNull().default(0),timezone:text('timezone').notNull().default('America/La_Paz'),lastSync:integer('last_sync').notNull().default(0)});
export const records=sqliteTable('sebams_records',{owner:text('owner').notNull(),key:text('key').notNull(),value:text('value'),version:integer('version').notNull(),requestHash:text('request_hash')},t=>[primaryKey({columns:[t.owner,t.key]})]);
