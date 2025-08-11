"use client";

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { FileUpload } from '@/components/file-upload';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface UploadStats {
  totalTransactions: number;
  totalAmount: number;
  dateRange: { start: string; end: string };
  categories: Record<string, number>;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUpload: (files: File[]) => Promise<void>;
  isProcessing: boolean;
  uploadStats: UploadStats | null;
  error: string | null;
}

export function UploadModal({ 
  isOpen, 
  onClose, 
  onFilesUpload, 
  isProcessing, 
  uploadStats, 
  error 
}: UploadModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleUpload = async (files: File[]) => {
    await onFilesUpload(files);
    
    // Auto close modal after successful upload
    if (!error && uploadStats) {
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Bank Statements"
      size="lg"
      className="swiss-card"
    >
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Upload your CSV or PDF bank statements to automatically categorize transactions and analyze your spending patterns.
        </div>

        <FileUpload 
          onFilesUpload={handleUpload}
          isProcessing={isProcessing}
          maxFiles={5}
        />
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive">Upload Error</h4>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {uploadStats && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-success mb-3">Upload Successful!</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-lg font-mono font-semibold text-card-foreground">
                      {uploadStats.totalTransactions.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-mono font-semibold text-card-foreground">
                      {formatCurrency(uploadStats.totalAmount)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date Range</p>
                    <p className="text-sm font-medium text-card-foreground">
                      {formatDate(uploadStats.dateRange.start)} - {formatDate(uploadStats.dateRange.end)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-lg font-mono font-semibold text-card-foreground">
                      {Object.keys(uploadStats.categories).length}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Modal will close automatically in 3 seconds...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}