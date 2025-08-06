
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type CreateFileUploadInput } from '../schema';
import { uploadFile } from '../handlers/upload_file';
import { eq } from 'drizzle-orm';

const testInput: CreateFileUploadInput = {
  original_name: 'test-document.pdf',
  filename: 'stored-file-123.pdf',
  mime_type: 'application/pdf',
  file_size: 1024000,
  expires_at: new Date('2024-12-31T23:59:59Z')
};

const testInputWithoutExpiry: CreateFileUploadInput = {
  original_name: 'image.jpg',
  filename: 'stored-image-456.jpg',
  mime_type: 'image/jpeg',
  file_size: 2048000
};

describe('uploadFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a file upload record with expiry', async () => {
    const result = await uploadFile(testInput);

    // Basic field validation
    expect(result.original_name).toEqual('test-document.pdf');
    expect(result.filename).toEqual('stored-file-123.pdf');
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at?.toISOString()).toEqual('2024-12-31T23:59:59.000Z');
    expect(result.download_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.upload_date).toBeInstanceOf(Date);
  });

  it('should create a file upload record without expiry', async () => {
    const result = await uploadFile(testInputWithoutExpiry);

    expect(result.original_name).toEqual('image.jpg');
    expect(result.filename).toEqual('stored-image-456.jpg');
    expect(result.mime_type).toEqual('image/jpeg');
    expect(result.file_size).toEqual(2048000);
    expect(result.expires_at).toBeNull();
    expect(result.download_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.upload_date).toBeInstanceOf(Date);
  });

  it('should save file upload to database', async () => {
    const result = await uploadFile(testInput);

    // Query database to verify record was saved
    const files = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, result.id))
      .execute();

    expect(files).toHaveLength(1);
    expect(files[0].original_name).toEqual('test-document.pdf');
    expect(files[0].filename).toEqual('stored-file-123.pdf');
    expect(files[0].mime_type).toEqual('application/pdf');
    expect(files[0].file_size).toEqual(1024000);
    expect(files[0].download_count).toEqual(0);
    expect(files[0].upload_date).toBeInstanceOf(Date);
    expect(files[0].expires_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for multiple uploads', async () => {
    const result1 = await uploadFile(testInput);
    const result2 = await uploadFile(testInputWithoutExpiry);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id.length).toBeGreaterThan(0);
    expect(result2.id.length).toBeGreaterThan(0);
  });

  it('should handle large file sizes', async () => {
    const largeFileInput: CreateFileUploadInput = {
      original_name: 'large-video.mp4',
      filename: 'stored-large-video-789.mp4',
      mime_type: 'video/mp4',
      file_size: 1073741824 // 1GB
    };

    const result = await uploadFile(largeFileInput);

    expect(result.file_size).toEqual(1073741824);
    expect(result.mime_type).toEqual('video/mp4');
    expect(result.expires_at).toBeNull();
  });
});
