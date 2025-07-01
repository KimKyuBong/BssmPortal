import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Card, Button, Alert } from '@/components/ui/StyledComponents';
import TemplateModal from './TemplateModal';

interface ExcelManagementProps {
  onDownloadTemplate: (count: number) => Promise<void>;
  onExportToExcel: () => Promise<void>;
  onImportUsers: (file: File) => Promise<{ success: boolean; message: string }>;
  className?: string;
}

export default function ExcelManagement({
  onDownloadTemplate,
  onExportToExcel,
  onImportUsers,
  className = ''
}: ExcelManagementProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportError(null);
      setImportSuccess(null);
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const result = await onImportUsers(importFile);
      if (result.success) {
        setImportSuccess(result.message);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setImportError(result.message);
      }
    } catch (error) {
      setImportError('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => setShowTemplateModal(true)}
              variant="secondary"
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" /> 템플릿 다운로드
            </Button>
            <Button
              onClick={onExportToExcel}
              variant="success"
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" /> 엑셀 내보내기
            </Button>
          </div>
          <div className="flex flex-row gap-6 items-center justify-end">
            <div className="flex flex-col gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                style={{ maxWidth: 250 }}
              />
              {importFile && (
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  선택된 파일: {importFile.name}
                </div>
              )}
            </div>
            <Button
              onClick={handleFileUpload}
              disabled={!importFile || importLoading}
              variant="primary"
              className="flex items-center"
            >
              {importLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> 파일 업로드
                </>
              )}
            </Button>
          </div>
        </div>
        {importError && (
          <Alert type="error" message={importError} onClose={() => setImportError(null)} />
        )}
        {importSuccess && (
          <Alert type="success" message={importSuccess} onClose={() => setImportSuccess(null)} />
        )}
      </div>
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onDownload={onDownloadTemplate}
      />
    </Card>
  );
} 