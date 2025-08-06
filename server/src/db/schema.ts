
import { text, pgTable, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

export const fileUploadsTable = pgTable('file_uploads', {
  id: varchar('id', { length: 32 }).primaryKey(), // Random string ID for sharing
  original_name: text('original_name').notNull(), // Original filename from user
  filename: text('filename').notNull(), // Stored filename on disk
  mime_type: varchar('mime_type', { length: 255 }).notNull(), // MIME type of the file
  file_size: integer('file_size').notNull(), // File size in bytes
  upload_date: timestamp('upload_date').defaultNow().notNull(), // When file was uploaded
  download_count: integer('download_count').default(0).notNull(), // Number of times downloaded
  expires_at: timestamp('expires_at') // Optional expiration date
});

// TypeScript types for the table schema
export type FileUpload = typeof fileUploadsTable.$inferSelect; // For SELECT operations
export type NewFileUpload = typeof fileUploadsTable.$inferInsert; // For INSERT operations

// Export all tables for proper query building
export const tables = { fileUploads: fileUploadsTable };
