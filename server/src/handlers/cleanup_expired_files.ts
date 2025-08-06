
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { lt } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';

export async function cleanupExpiredFiles(): Promise<{ deleted_count: number }> {
  try {
    const now = new Date();
    
    // Query for expired files
    const expiredFiles = await db.select()
      .from(fileUploadsTable)
      .where(lt(fileUploadsTable.expires_at, now))
      .execute();

    if (expiredFiles.length === 0) {
      return { deleted_count: 0 };
    }

    let deletedCount = 0;

    // Delete files from disk and database
    for (const file of expiredFiles) {
      try {
        // Delete file from disk
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        await unlink(filePath);
      } catch (diskError) {
        // Log disk deletion error but continue with database cleanup
        console.error(`Failed to delete file from disk: ${file.filename}`, diskError);
      }

      // Remove record from database
      await db.delete(fileUploadsTable)
        .where(lt(fileUploadsTable.expires_at, now))
        .execute();
      
      deletedCount++;
    }

    return { deleted_count: deletedCount };
  } catch (error) {
    console.error('Cleanup expired files failed:', error);
    throw error;
  }
}
