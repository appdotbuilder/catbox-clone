
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { getFileStats } from '../handlers/get_file_stats';

describe('getFileStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no files exist', async () => {
    const stats = await getFileStats();

    expect(stats.total_files).toBe(0);
    expect(stats.total_size).toBe(0);
    expect(stats.total_downloads).toBe(0);
  });

  it('should calculate correct stats for single file', async () => {
    // Insert a test file
    await db.insert(fileUploadsTable)
      .values({
        id: 'test123',
        original_name: 'test.txt',
        filename: 'stored_test.txt',
        mime_type: 'text/plain',
        file_size: 1024,
        download_count: 5,
        expires_at: null
      })
      .execute();

    const stats = await getFileStats();

    expect(stats.total_files).toBe(1);
    expect(stats.total_size).toBe(1024);
    expect(stats.total_downloads).toBe(5);
  });

  it('should aggregate stats for multiple files correctly', async () => {
    // Insert multiple test files
    await db.insert(fileUploadsTable)
      .values([
        {
          id: 'file1',
          original_name: 'document.pdf',
          filename: 'stored_doc.pdf',
          mime_type: 'application/pdf',
          file_size: 2048,
          download_count: 10,
          expires_at: null
        },
        {
          id: 'file2',
          original_name: 'image.jpg',
          filename: 'stored_image.jpg',
          mime_type: 'image/jpeg',
          file_size: 512,
          download_count: 3,
          expires_at: null
        },
        {
          id: 'file3',
          original_name: 'video.mp4',
          filename: 'stored_video.mp4',
          mime_type: 'video/mp4',
          file_size: 8192,
          download_count: 0,
          expires_at: null
        }
      ])
      .execute();

    const stats = await getFileStats();

    expect(stats.total_files).toBe(3);
    expect(stats.total_size).toBe(10752); // 2048 + 512 + 8192
    expect(stats.total_downloads).toBe(13); // 10 + 3 + 0
  });

  it('should handle files with zero download count', async () => {
    // Insert files with various download counts including zero
    await db.insert(fileUploadsTable)
      .values([
        {
          id: 'popular',
          original_name: 'popular.txt',
          filename: 'stored_popular.txt',
          mime_type: 'text/plain',
          file_size: 100,
          download_count: 50,
          expires_at: null
        },
        {
          id: 'unused',
          original_name: 'unused.txt',
          filename: 'stored_unused.txt',
          mime_type: 'text/plain',
          file_size: 200,
          download_count: 0,
          expires_at: null
        }
      ])
      .execute();

    const stats = await getFileStats();

    expect(stats.total_files).toBe(2);
    expect(stats.total_size).toBe(300);
    expect(stats.total_downloads).toBe(50);
  });
});
