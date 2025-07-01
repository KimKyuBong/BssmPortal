'use client';

import React from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { Modal, Button, Alert, Text, Heading } from '@/components/ui/StyledComponents';

interface EquipmentBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadFile: File | null;
  uploadLoading: boolean;
  uploadResult: { success: boolean; message: string } | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSubmit: () => void;
  onDownloadTemplate: () => void;
}

export default function EquipmentBulkUploadModal({
  isOpen,
  onClose,
  fileInputRef,
  uploadFile,
  uploadLoading,
  uploadResult,
  onFileChange,
  onUploadSubmit,
  onDownloadTemplate
}: EquipmentBulkUploadModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <Heading level={2} className="text-xl font-semibold text-gray-900 dark:text-white">
            엑셀 일괄 등록
          </Heading>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          {/* 설명 */}
          <div className="mb-6">
            <Text className="text-gray-600 dark:text-gray-400 mb-4">
              엑셀 파일을 업로드하여 장비를 일괄 등록할 수 있습니다. 
              템플릿을 다운로드하여 올바른 형식으로 데이터를 입력해주세요.
            </Text>
          </div>

          {/* 템플릿 다운로드 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Text className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  템플릿 다운로드
                </Text>
                <Text className="text-sm text-blue-700 dark:text-blue-300">
                  엑셀 템플릿을 다운로드하여 올바른 형식으로 데이터를 입력하세요.
                </Text>
              </div>
              <Button 
                variant="secondary"
                onClick={onDownloadTemplate}
                className="flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                템플릿 다운로드
              </Button>
            </div>
          </div>

          {/* 파일 업로드 */}
          <div className="mb-6">
            <Text className="font-medium text-gray-900 dark:text-white mb-2">
              엑셀 파일 선택
            </Text>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                id="equipment-file-upload"
                ref={fileInputRef}
                onChange={onFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <label
                htmlFor="equipment-file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <Text className="text-gray-600 dark:text-gray-400 mb-2">
                  클릭하여 파일을 선택하거나 여기에 파일을 드래그하세요
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-500">
                  지원 형식: .xlsx, .xls
                </Text>
              </label>
            </div>
            
            {uploadFile && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Text className="text-sm text-green-700 dark:text-green-300">
                  선택된 파일: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </Text>
              </div>
            )}
          </div>

          {/* 업로드 결과 */}
          {uploadResult && (
            <div className="mb-6">
              <Alert 
                type={uploadResult.success ? "success" : "error"}
                message={uploadResult.message}
              />
            </div>
          )}

          {/* 업로드 버튼 */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="secondary"
              onClick={onClose}
              disabled={uploadLoading}
            >
              취소
            </Button>
            <Button 
              variant="primary"
              onClick={onUploadSubmit}
              disabled={!uploadFile || uploadLoading}
              className="flex items-center"
            >
              {uploadLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  업로드
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
} 