
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type GetFileInput, type CreateFileUploadInput } from '../schema';
import { getFile } from '../handlers/get_file';
import { eq } from 'drizzle-orm';

// Test setup data
const testFileData = {
  id: 'test123',
  original_name: 'test-file.pdf',
  filename: 'stored-test-file.pdf',
  mime_type: 'application/pdf',
  file_size: 2048,
  download_count: 0
};

const testInput: GetFileInput = {
  id: 'test123'
};

describe('getFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a file successfully', async () => {
    // Insert test file
    await db.insert(fileUploadsTable)
      .values(testFileData)
      .execute();

    const result = await getFile(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test123');
    expect(result!.original_name).toEqual('test-file.pdf');
    expect(result!.filename).toEqual('stored-test-file.pdf');
    expect(result!.mime_type).toEqual('application/pdf');
    expect(result!.file_size).toEqual(2048);
    expect(result!.file_path).toEqual('/uploads/stored-test-file.pdf');
  });

  it('should increment download counter', async () => {
    // Insert test file
    await db.insert(fileUploadsTable)
      .values(testFileData)
      .execute();

    await getFile(testInput);

    // Check that download counter was incremented
    const files = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, 'test123'))
      .execute();

    expect(files[0].download_count).toEqual(1);
  });

  it('should return null for non-existent file', async () => {
    const result = await getFile({ id: 'nonexistent' });

    expect(result).toBeNull();
  });

  it('should return null for expired file', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Insert expired file
    await db.insert(fileUploadsTable)
      .values({
        ...testFileData,
        expires_at: yesterday
      })
      .execute();

    const result = await getFile(testInput);

    expect(result).toBeNull();
  });

  it('should retrieve file that has not expired', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Insert file that expires tomorrow
    await db.insert(fileUploadsTable)
      .values({
        ...testFileData,
        expires_at: tomorrow
      })
      .execute();

    const result = await getFile(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test123');
  });

  it('should retrieve file with no expiration date', async () => {
    // Insert file with null expiration
    await db.insert(fileUploadsTable)
      .values({
        ...testFileData,
        expires_at: null
      })
      .execute();

    const result = await getFile(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('test123');
  });

  it('should increment counter multiple times', async () => {
    // Insert test file
    await db.insert(fileUploadsTable)
      .values(testFileData)
      .execute();

    // Download file multiple times
    await getFile(testInput);
    await getFile(testInput);
    await getFile(testInput);

    // Check final download counter
    const files = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, 'test123'))
      .execute();

    expect(files[0].download_count).toEqual(3);
  });
});
