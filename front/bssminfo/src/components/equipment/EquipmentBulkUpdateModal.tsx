'use client';

import React from 'react';
import { FileText, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal, Button, Alert, Text, Heading } from '@/components/ui/StyledComponents';

interface BulkUpdateResult {
  success: boolean;
  message: string;
  results: {
    total_rows: number;
    created: number;
    updated: number;
    errors: string[];
    created_equipment: Array<{
      serial_number: string;
      asset_number: string;
      created_fields: string[];
    }>;
    updated_equipment: Array<{
      serial_number: string;
      asset_number: string;
      updated_fields: string[];
    }>;
  };
}

interface EquipmentBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadFile: File | null;
  uploadLoading: boolean;
  uploadResult: BulkUpdateResult | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSubmit: () => void;
  onDownloadTemplate: () => void;
}

export default function EquipmentBulkUpdateModal({
  isOpen,
  onClose,
  fileInputRef,
  uploadFile,
  uploadLoading,
  uploadResult,
  onFileChange,
  onUploadSubmit,
  onDownloadTemplate
}: EquipmentBulkUpdateModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <Heading level={2} className="text-xl font-semibold text-gray-900 dark:text-white">
            장비 정보 일괄 등록/업데이트
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
              엑셀 파일을 업로드하여 장비를 일괄 등록하거나 기존 장비의 정보를 업데이트할 수 있습니다. 
              일련번호가 있으면 업데이트하고, 없으면 새로 등록합니다.
            </Text>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <Text className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    주의사항
                  </Text>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• 일련번호는 필수 컬럼입니다</li>
                    <li>• 일련번호가 있으면 업데이트, 없으면 새로 등록됩니다</li>
                    <li>• 대여 정보는 업데이트되지 않습니다</li>
                    <li>• 처리 가능한 필드: 물품번호, 일련번호, 종류, 관리번호, 제조사, 모델명, 구매일자, 구매금액, 설명, 상태, 취득일, 생산년도</li>
                    <li>• 구매금액은 ₩ 기호와 쉼표를 제거하고 숫자만 입력하세요</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 템플릿 다운로드 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Text className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  현재 장비 목록 다운로드
                </Text>
                <Text className="text-sm text-blue-700 dark:text-blue-300">
                  현재 등록된 장비 목록을 엑셀로 다운로드하여 수정 후 업로드하세요.
                </Text>
              </div>
              <Button 
                variant="secondary"
                onClick={onDownloadTemplate}
                className="flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                장비 목록 다운로드
              </Button>
            </div>
          </div>

          {/* 파일 업로드 */}
          <div className="mb-6">
            <Text className="font-medium text-gray-900 dark:text-white mb-2">
              수정된 엑셀 파일 업로드
            </Text>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                id="equipment-update-file-upload"
                ref={fileInputRef}
                onChange={onFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <label
                htmlFor="equipment-update-file-upload"
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
              {uploadResult.success ? (
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <Text className="font-semibold text-green-800 dark:text-green-200 mb-3 text-lg">
                        ✅ 처리 완료!
                      </Text>
                      
                      {/* 통계 요약 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {uploadResult.results.total_rows}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">총 처리 행</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {uploadResult.results.created}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">새로 등록</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {uploadResult.results.updated}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">업데이트</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {uploadResult.results.errors.length}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">오류</div>
                        </div>
                      </div>
                      
                      {/* 성공 메시지 */}
                      <div className="bg-green-100 dark:bg-green-800/30 p-3 rounded-lg mb-4">
                        <Text className="text-sm text-green-800 dark:text-green-200">
                          🎉 총 {uploadResult.results.created + uploadResult.results.updated}개의 장비가 성공적으로 처리되었습니다!
                        </Text>
                      </div>
                      
                      {/* 새로 등록된 장비 목록 */}
                      {uploadResult.results.created_equipment.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center mb-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <Text className="font-semibold text-green-800 dark:text-green-200">
                              🆕 새로 등록된 장비 ({uploadResult.results.created}개)
                            </Text>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto border border-green-200 dark:border-green-700">
                            {uploadResult.results.created_equipment.map((equipment, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    {equipment.asset_number || equipment.serial_number}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    일련번호: {equipment.serial_number}
                                  </div>
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                  {equipment.created_fields.join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 업데이트된 장비 목록 */}
                      {uploadResult.results.updated_equipment.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center mb-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <Text className="font-semibold text-blue-800 dark:text-blue-200">
                              🔄 업데이트된 장비 ({uploadResult.results.updated}개)
                            </Text>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto border border-blue-200 dark:border-blue-700">
                            {uploadResult.results.updated_equipment.map((equipment, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    {equipment.asset_number || equipment.serial_number}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    일련번호: {equipment.serial_number}
                                  </div>
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                  {equipment.updated_fields.join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 오류 목록 */}
                      {uploadResult.results.errors.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center mb-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                            <Text className="font-semibold text-red-800 dark:text-red-200">
                              ⚠️ 오류 발생 ({uploadResult.results.errors.length}개)
                            </Text>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-40 overflow-y-auto border border-red-200 dark:border-red-700">
                            {uploadResult.results.errors.map((error, index) => (
                              <div key={index} className="flex items-start py-2 border-b border-red-100 dark:border-red-700 last:border-b-0">
                                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                                <div className="text-sm text-red-700 dark:text-red-300">
                                  {error}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <Text className="font-semibold text-red-800 dark:text-red-200 mb-2 text-lg">
                        ❌ 처리 실패
                      </Text>
                      <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded-lg">
                        <Text className="text-sm text-red-700 dark:text-red-300">
                          {uploadResult.message}
                        </Text>
                      </div>
                      <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                        💡 파일 형식과 필수 컬럼을 확인해주세요.
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  업데이트 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  업데이트
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
