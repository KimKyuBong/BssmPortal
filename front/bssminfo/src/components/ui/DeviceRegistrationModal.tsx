import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/StyledComponents';

interface DeviceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (macAddress: string, deviceName: string) => void;
  macAddress: string;
  deviceName: string;
  macParts: string[];
  macError: string | null;
  macLoading: boolean;
  registering: boolean;
  isManualInput: boolean;
  onMacAddressChange: (macAddress: string) => void;
  onDeviceNameChange: (deviceName: string) => void;
  onMacPartChange: (index: number, value: string) => void;
  onMacPartKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onManualInputChange: (isManual: boolean) => void;
  onFetchCurrentMac: () => void;
}

export default function DeviceRegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  macAddress,
  deviceName,
  macParts,
  macError,
  macLoading,
  registering,
  isManualInput,
  onMacAddressChange,
  onDeviceNameChange,
  onMacPartChange,
  onMacPartKeyDown,
  onManualInputChange,
  onFetchCurrentMac
}: DeviceRegistrationModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(macAddress, deviceName);
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75" onClick={onClose}></div>
        </div>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary">기기 IP 등록</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-primary">
                  MAC 주소
                </label>
                
                <div className="mb-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onFetchCurrentMac}
                    disabled={macLoading || isManualInput}
                    className={`w-full transition-colors ${
                      isManualInput 
                        ? 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 dark:border-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {macLoading ? (
                      <span className="inline-flex items-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></span>
                        MAC 주소 조회 중...
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        {isManualInput ? (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                            </svg>
                            수동 입력 모드 (자동 불러오기 비활성화)
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            내 MAC 주소 자동 불러오기
                          </>
                        )}
                      </span>
                    )}
                  </Button>
                </div>
                
                <div className="mb-2">
                  <div className="flex items-center space-x-1">
                    {macParts.map((part, idx) => (
                      <div key={idx} className="flex-1">
                        <input
                          id={`macPart-${idx}`}
                          type="text"
                                                  className={`w-full px-2 py-3 border rounded-md text-center font-mono uppercase font-semibold text-lg transition-colors ${
                          part.length === 2 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900 dark:border-green-400' 
                            : part.length === 1 
                              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-400'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                          } ${registering ? 'opacity-50 cursor-not-allowed' : ''} ${
                            isManualInput ? 'ring-2 ring-blue-200 dark:ring-blue-700' : ''
                          }`}
                          value={part}
                          onChange={(e) => onMacPartChange(idx, e.target.value)}
                          onKeyDown={(e) => onMacPartKeyDown(idx, e)}
                          maxLength={2}
                          disabled={registering}
                          placeholder="00"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    MAC 주소 형식: XX:XX:XX:XX:XX:XX (16진수)
                  </div>
                </div>
                
                {macError && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-600 dark:text-red-300 text-sm font-medium">{macError}</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={isManualInput}
                      onChange={(e) => onManualInputChange(e.target.checked)}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      수동으로 MAC 주소 입력 모드
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    체크하면 자동 불러오기 기능이 비활성화됩니다
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-primary">
                  기기 이름
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700 text-primary"
                  placeholder="기기 이름 입력 (예: 내 노트북)"
                  value={deviceName}
                  onChange={(e) => onDeviceNameChange(e.target.value)}
                  disabled={registering}
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={registering}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={registering}
                >
                  {registering ? (
                    <span className="inline-flex items-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                      처리 중...
                    </span>
                  ) : (
                    '등록하기'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 