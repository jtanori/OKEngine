import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { store } from '../services/store';
import { useI18n } from '../i18n/I18nContext';
import { Box, Text, Badge } from './ui';
import {
  validateFilenameInput,
  containsUnsafeMarkdownScript,
  sanitizePlainText,
} from '../services/formSecurity';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Upload Dropzone (CO-UPLOAD-DROPZONE)
// Enforces filename validation, content script sanitization, and loading/error states
// ============================================================================

export interface UploadDropzoneProps {
  collectionId: string;
  onUploadComplete?: () => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  collectionId,
  onUploadComplete,
}) => {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setUploadFeedback(null);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileCheck = validateFilenameInput(file.name);
        if (!fileCheck.valid) {
          setUploadError(
            t(fileCheck.errorKey || 'validation.filename_invalid', fileCheck.errorMessage)
          );
          setIsProcessing(false);
          return;
        }

        const content = await file.text();
        if (!content.trim()) {
          setUploadError(t('validation.required', 'Uploaded document cannot be empty.'));
          setIsProcessing(false);
          return;
        }

        if (containsUnsafeMarkdownScript(content)) {
          setUploadError(
            t(
              'validation.unsafe_input',
              'Blocked unsafe file content containing script tags or executable URI schemes.'
            )
          );
          setIsProcessing(false);
          return;
        }

        const rawTitle = fileCheck.sanitizedValue
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const safeTitle = sanitizePlainText(rawTitle, 120) || 'Untitled Document';

        store.saveDocument({
          title: safeTitle,
          filename: fileCheck.sanitizedValue,
          collectionId,
          content,
        });
      }

      setUploadFeedback(t('files.dropzone_indexed', 'Document indexed and Ready'));
      if (onUploadComplete) onUploadComplete();
    } catch {
      setUploadError(t('common.failed', 'Failed to ingest file.'));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadFeedback(null), 4000);
    }
  };

  return (
    <Box
      surface={isDragging ? 'accent' : 'surface'}
      bordered
      radius="sm"
      padding="md"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className="border-dashed text-center transition-colors cursor-pointer select-none hover:bg-elevated"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.txt,.json,.csv"
        aria-label={t('files.upload', 'Upload Markdown File')}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-9 h-9 rounded-sm bg-subtle border border-line flex items-center justify-center text-ink-secondary">
          {isProcessing ? (
            <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5 text-ink" />
          )}
        </div>

        <div>
          <Text variant="h3" tone="primary">
            {isProcessing
              ? t('files.dropzone_ingesting', 'Ingesting & chunking document...')
              : t(
                  'files.dropzone_title',
                  'Drop Markdown (.md) or text (.txt) files here, or click to browse'
                )}
          </Text>
          <Text variant="mono" tone="secondary" className="block mt-0.5">
            {t(
              'files.dropzone_sub',
              'Files are automatically parsed, segmented by headings, and indexed into this collection.'
            )}
          </Text>
        </div>

        {uploadFeedback && (
          <Badge tone="success" mono className="mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{uploadFeedback}</span>
          </Badge>
        )}

        {uploadError && (
          <div
            role="alert"
            className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-danger-subtle border border-danger/30 text-2xs font-mono text-danger"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    </Box>
  );
};
