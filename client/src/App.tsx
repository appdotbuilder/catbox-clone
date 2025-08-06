
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { FileUpload, FileStats } from '../../server/src/schema';

interface UploadedFile extends FileUpload {
  shareLink?: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState<FileStats>({ total_files: 0, total_size: 0, total_downloads: 0 });
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const result = await trpc.getFileStats.query();
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateShareLink = (fileId: string) => {
    return `${window.location.origin}/file/${fileId}`;
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 200 * 1024 * 1024) { // 200MB limit like catbox
      setError('File size must be less than 200MB');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // Generate a filename for storage
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const extension = selectedFile.name.split('.').pop() || '';
      const filename = `${timestamp}_${randomId}${extension ? '.' + extension : ''}`;

      const uploadData = {
        original_name: selectedFile.name,
        filename: filename,
        mime_type: selectedFile.type || 'application/octet-stream',
        file_size: selectedFile.size,
        expires_at: null
      };

      const result = await trpc.uploadFile.mutate(uploadData);
      
      const uploadedFile: UploadedFile = {
        ...result,
        shareLink: generateShareLink(result.id)
      };

      setUploadedFiles(prev => [uploadedFile, ...prev]);
      setSelectedFile(null);
      
      // Refresh stats
      await loadStats();

    } catch (error) {
      console.error('Upload failed:', error);
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">📁 File Share</h1>
            <Badge variant="secondary" className="text-sm">
              📊 {stats.total_files} files • {formatFileSize(stats.total_size)} • {stats.total_downloads} downloads
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main Upload Card */}
        <Card className="mb-8 shadow-lg border-2 border-dashed border-purple-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-800">
              📤 Upload & Share Files
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Select or drag & drop a file to get a shareable link • Max 200MB
            </p>
          </CardHeader>
          <CardContent>
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragOver 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-2xl">📄</span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex space-x-3 justify-center">
                    <Button 
                      onClick={handleUpload} 
                      disabled={isUploading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isUploading ? '⬆️ Uploading...' : '🚀 Upload File'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedFile(null)}
                      disabled={isUploading}
                    >
                      ❌ Cancel
                    </Button>
                  </div>
                  {isUploading && (
                    <div className="w-full max-w-xs mx-auto">
                      <Progress value={75} className="h-2" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-4xl">📁</div>
                  <p className="text-gray-600">Drop files here or click to browse</p>
                  <Input
                    type="file"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="max-w-xs mx-auto cursor-pointer"
                  />
                </div>
              )}
            </div>

            {error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  ⚠️ {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">
                ✅ Your Uploaded Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedFiles.map((file: UploadedFile) => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="font-medium text-gray-900">{file.original_name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.file_size)} • Uploaded {file.upload_date.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={file.shareLink || ''}
                      readOnly
                      className="w-80 text-sm bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(file.shareLink || '')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      📋 Copy
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-lg font-semibold text-purple-700 bg-white/80 backdrop-blur-sm rounded-lg px-6 py-3 inline-block shadow-md">
            🏪 Created by Earl Store
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Simple, fast, and reliable file sharing
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
