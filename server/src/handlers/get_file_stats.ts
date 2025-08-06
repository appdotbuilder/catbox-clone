
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { sum, count } from 'drizzle-orm';
import { type FileStats } from '../schema';

export async function getFileStats(): Promise<FileStats> {
  try {
    // Query aggregated statistics from the database
    const result = await db
      .select({
        total_files: count(fileUploadsTable.id),
        total_size: sum(fileUploadsTable.file_size),
        total_downloads: sum(fileUploadsTable.download_count)
      })
      .from(fileUploadsTable)
      .execute();

    const stats = result[0];

    // Handle null values from sum() when no records exist
    // count() returns a string, sum() returns a string or null
    return {
      total_files: Number(stats.total_files) || 0,
      total_size: Number(stats.total_size || '0'),
      total_downloads: Number(stats.total_downloads || '0')
    };
  } catch (error) {
    console.error('Failed to get file stats:', error);
    throw error;
  }
}
