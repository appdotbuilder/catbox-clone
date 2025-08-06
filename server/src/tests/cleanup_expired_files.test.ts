
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { cleanupExpiredFiles } from '../handlers/cleanup_expired_files';
import { eq, lt } from 'drizzle-orm';

describe('cleanupExpiredFiles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero when no expired files exist', async () => {
    // Create a non-expired file
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(fileUploadsTable)
      .values({
        id: 'file1',
        original_name: 'test.txt',
        filename: 'stored_test.txt',
        mime_type: 'text/plain',
        file_size: 1024,
        expires_at: futureDate
      })
      .execute();

    const result = await cleanupExpiredFiles();

    expect(result.deleted_count).toEqual(0);
  });

  it('should delete expired files from database', async () => {
    // Create expired file
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await db.insert(fileUploadsTable)
      .values({
        id: 'expired1',
        original_name: 'expired.txt',
        filename: 'stored_expired.txt',
        mime_type: 'text/plain',
        file_size: 512,
        expires_at: pastDate
      })
      .execute();

    // Create non-expired file
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(fileUploadsTable)
      .values({
        id: 'active1',
        original_name: 'active.txt',
        filename: 'stored_active.txt',
        mime_type: 'text/plain',
        file_size: 1024,
        expires_at: futureDate
      })
      .execute();

    const result = await cleanupExpiredFiles();

    expect(result.deleted_count).toEqual(1);

    // Verify expired file is deleted
    const expiredFiles = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, 'expired1'))
      .execute();

    expect(expiredFiles).toHaveLength(0);

    // Verify non-expired file remains
    const activeFiles = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, 'active1'))
      .execute();

    expect(activeFiles).toHaveLength(1);
  });

  it('should handle multiple expired files', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    // Create multiple expired files
    await db.insert(fileUploadsTable)
      .values([
        {
          id: 'expired1',
          original_name: 'expired1.txt',
          filename: 'stored_expired1.txt',
          mime_type: 'text/plain',
          file_size: 512,
          expires_at: pastDate
        },
        {
          id: 'expired2',
          original_name: 'expired2.txt',
          filename: 'stored_expired2.txt',
          mime_type: 'text/plain',
          file_size: 256,
          expires_at: pastDate
        }
      ])
      .execute();

    const result = await cleanupExpiredFiles();

    expect(result.deleted_count).toEqual(2);

    // Verify all expired files are deleted
    const remainingFiles = await db.select()
      .from(fileUploadsTable)
      .where(lt(fileUploadsTable.expires_at, new Date()))
      .execute();

    expect(remainingFiles).toHaveLength(0);
  });

  it('should not affect files with null expires_at', async () => {
    // Create file with no expiration
    await db.insert(fileUploadsTable)
      .values({
        id: 'permanent1',
        original_name: 'permanent.txt',
        filename: 'stored_permanent.txt',
        mime_type: 'text/plain',
        file_size: 1024,
        expires_at: null
      })
      .execute();

    const result = await cleanupExpiredFiles();

    expect(result.deleted_count).toEqual(0);

    // Verify permanent file remains
    const permanentFiles = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, 'permanent1'))
      .execute();

    expect(permanentFiles).toHaveLength(1);
  });
});
