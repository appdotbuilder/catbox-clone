
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type CreateFileUploadInput, type FileUpload } from '../schema';

export const uploadFile = async (input: CreateFileUploadInput): Promise<FileUpload> => {
  try {
    // Generate a unique ID for the file (32 characters to match schema)
    const fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);

    // Insert file record into database
    const result = await db.insert(fileUploadsTable)
      .values({
        id: fileId,
        original_name: input.original_name,
        filename: input.filename,
        mime_type: input.mime_type,
        file_size: input.file_size,
        expires_at: input.expires_at || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};
