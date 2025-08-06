
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type GetFileInput, type CreateFileUploadInput } from '../schema';
import { getFileInfo } from '../handlers/get_file_info';
import { eq } from 'drizzle-orm';

// Helper function to create test file upload
const createTestFileUpload = async (overrides?: Partial<CreateFileUploadInput>) => {
  const testFile = {
    id: 'test123',
    original_name: 'test-file.txt',
    filename: 'stored-file.txt',
    mime_type: 'text/plain',
    file_size: 1024,
    expires_at: null,
    ...overrides
  };

  const result = await db.insert(fileUploadsTable)
    .values(testFile)
    .returning()
    .execute();

  return result[0];
};

const testInput: GetFileInput = {
  id: 'test123'
};

describe('getFileInfo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return file info for existing file', async () => {
    // Create test file
    const createdFile = await createTestFileUpload();
    
    const result = await getFileInfo(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test123');
    expect(result!.original_name).toEqual('test-file.txt');
    expect(result!.filename).toEqual('stored-file.txt');
    expect(result!.mime_type).toEqual('text/plain');
    expect(result!.file_size).toEqual(1024);
    expect(result!.download_count).toEqual(0);
    expect(result!.expires_at).toBeNull();
    expect(result!.upload_date).toBeInstanceOf(Date);
  });

  it('should return null for non-existent file', async () => {
    const result = await getFileInfo({ id: 'nonexistent' });

    expect(result).toBeNull();
  });

  it('should return null for expired file', async () => {
    // Create file with expiration date in the past
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await createTestFileUpload({ expires_at: yesterday });

    const result = await getFileInfo(testInput);

    expect(result).toBeNull();
  });

  it('should return file info for file expiring in future', async () => {
    // Create file with expiration date in the future
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await createTestFileUpload({ expires_at: tomorrow });

    const result = await getFileInfo(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test123');
    expect(result!.expires_at).toBeInstanceOf(Date);
  });

  it('should not increment download counter when getting file info', async () => {
    // Create file with existing download count
    await createTestFileUpload();
    
    // Set initial download count
    await db.update(fileUploadsTable)
      .set({ download_count: 5 })
      .where(eq(fileUploadsTable.id, 'test123'))
      .execute();

    // Get file info
    await getFileInfo(testInput);

    // Verify download count wasn't incremented
    const fileAfter = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, 'test123'))
      .execute();

    expect(fileAfter[0].download_count).toEqual(5);
  });
});
