
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { eq, and, isNull, gte } from 'drizzle-orm';
import { type GetFileInput, type FileDownloadResponse } from '../schema';

export const getFile = async (input: GetFileInput): Promise<FileDownloadResponse | null> => {
  try {
    // Query for the file by ID
    const files = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, input.id))
      .execute();

    if (files.length === 0) {
      return null; // File not found
    }

    const file = files[0];
    const now = new Date();

    // Check if file has expired
    if (file.expires_at && file.expires_at < now) {
      return null; // File has expired
    }

    // Increment download counter
    await db.update(fileUploadsTable)
      .set({ download_count: file.download_count + 1 })
      .where(eq(fileUploadsTable.id, input.id))
      .execute();

    // Return file information for download
    return {
      id: file.id,
      original_name: file.original_name,
      filename: file.filename,
      mime_type: file.mime_type,
      file_size: file.file_size,
      file_path: `/uploads/${file.filename}`
    };
  } catch (error) {
    console.error('File retrieval failed:', error);
    throw error;
  }
};
