"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  transactionCount?: number;
}

interface FileUploadProps {
  onFilesUpload: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
  isProcessing?: boolean;
}

export function FileUpload({ 
  onFilesUpload, 
  maxFiles = 5, 
  className = '',
  isProcessing = false 
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Convert files to UploadedFile objects
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    onFilesUpload(acceptedFiles);
  }, [onFilesUpload]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  // Update file status (to be called from parent component)
  const updateFileStatus = useCallback((fileId: string, status: UploadedFile['status'], options?: { 
    progress?: number; 
    error?: string; 
    transactionCount?: number; 
  }) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, status, ...options }
          : file
      )
    );
  }, []);

  // Remove unused imperative handle

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    maxFiles,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing
  });

  const getFileIcon = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-red-600" />;
    }
    return <FileText className="h-8 w-8 text-gray-600" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <Card 
        {...getRootProps()}
        className={`border-2 border-dashed transition-colors cursor-pointer hover:bg-gray-50 ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <input {...getInputProps()} />
          
          <Upload className={`h-12 w-12 mb-4 ${
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          }`} />
          
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              {isDragActive 
                ? 'Drop your files here...' 
                : 'Drag & drop bank statements here'
              }
            </p>
            <p className="text-sm text-gray-500">
              or click to browse files
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                CSV
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                PDF
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              Maximum {maxFiles} files, up to 10MB each
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-sm">Uploaded Files ({uploadedFiles.length})</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFiles}
                disabled={isProcessing}
              >
                Clear All
              </Button>
            </div>
            
            <div className="space-y-3">
              {uploadedFiles.map((uploadedFile) => (
                <div 
                  key={uploadedFile.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {getFileIcon(uploadedFile.file)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(uploadedFile.status)}`}
                      >
                        {uploadedFile.status}
                      </Badge>
                      {uploadedFile.transactionCount && (
                        <Badge variant="outline" className="text-xs">
                          {uploadedFile.transactionCount} transactions
                        </Badge>
                      )}
                    </div>
                    
                    {uploadedFile.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {uploadedFile.error}
                      </p>
                    )}
                    
                    {uploadedFile.progress !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${uploadedFile.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(uploadedFile.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                      disabled={isProcessing && uploadedFile.status === 'processing'}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}