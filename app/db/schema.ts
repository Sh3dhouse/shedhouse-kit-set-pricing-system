// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
export const quotes = sqliteTable('quotes', {
 id:text('id').primaryKey(),variant:text('variant').notNull(),document:text('document').notNull(),
 revision:integer('revision').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
 createdBy:text('created_by').notNull(),updatedBy:text('updated_by').notNull(),updatedByEmail:text('updated_by_email').notNull(),
 archivedAt:text('archived_at'),mutationId:text('mutation_id').notNull()
},t=>[index('quotes_variant_updated').on(t.variant,t.updatedAt,t.id)]);
export const quoteHistory=sqliteTable('quote_history',{
 quoteId:text('quote_id').notNull(),revision:integer('revision').notNull(),document:text('document').notNull(),
 action:text('action').notNull(),changedAt:text('changed_at').notNull(),changedBy:text('changed_by').notNull(),changedByEmail:text('changed_by_email').notNull()
},t=>[primaryKey({columns:[t.quoteId,t.revision]})]);
