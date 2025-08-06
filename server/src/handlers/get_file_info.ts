
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type GetFileInput, type FileUpload } from '../schema';
import { eq } from 'drizzle-orm';

export const getFileInfo = async (input: GetFileInput): Promise<FileUpload | null> => {
  try {
    // Query file by ID
    const results = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const fileRecord = results[0];

    // Check if file has expired
    if (fileRecord.expires_at && fileRecord.expires_at <= new Date()) {
      return null;
    }

    // Return file metadata without incrementing download counter
    return fileRecord;
  } catch (error) {
    console.error('File info retrieval failed:', error);
    throw error;
  }
};
