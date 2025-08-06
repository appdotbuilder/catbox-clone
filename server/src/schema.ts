
import { z } from 'zod';

// File upload schema
export const fileUploadSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  file_size: z.number().int(),
  upload_date: z.coerce.date(),
  download_count: z.number().int(),
  expires_at: z.coerce.date().nullable()
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Input schema for file upload
export const createFileUploadInputSchema = z.object({
  original_name: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().positive(),
  expires_at: z.coerce.date().nullable().optional()
});

export type CreateFileUploadInput = z.infer<typeof createFileUploadInputSchema>;

// Input schema for file retrieval
export const getFileInputSchema = z.object({
  id: z.string()
});

export type GetFileInput = z.infer<typeof getFileInputSchema>;

// Response schema for file download
export const fileDownloadResponseSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  file_size: z.number().int(),
  file_path: z.string()
});

export type FileDownloadResponse = z.infer<typeof fileDownloadResponseSchema>;

// File stats schema
export const fileStatsSchema = z.object({
  total_files: z.number().int(),
  total_size: z.number().int(),
  total_downloads: z.number().int()
});

export type FileStats = z.infer<typeof fileStatsSchema>;
