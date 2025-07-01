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
                
                <div className="mb-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onFetchCurrentMac}
                    disabled={macLoading}
                  >
                    {macLoading ? (
                      <span className="inline-flex items-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2"></span>
                        로딩 중...
                      </span>
                    ) : (
                      <span className="font-medium">현재 MAC 주소 가져오기</span>
                    )}
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  {macParts.map((part, idx) => (
                    <div key={idx} className="w-12">
                      <input
                        id={`macPart-${idx}`}
                        type="text"
                        className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-center font-mono uppercase font-semibold bg-white dark:bg-gray-700 text-primary"
                        value={part}
                        onChange={(e) => onMacPartChange(idx, e.target.value)}
                        onKeyDown={(e) => onMacPartKeyDown(idx, e)}
                        maxLength={2}
                        disabled={registering}
                      />
                    </div>
                  ))}
                </div>
                
                {macError && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{macError}</p>
                )}
                
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600"
                      checked={isManualInput}
                      onChange={(e) => onManualInputChange(e.target.checked)}
                    />
                    <span className="ml-2 text-sm font-medium text-primary">수동으로 MAC 주소 입력</span>
                  </label>
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