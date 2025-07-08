import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from '@/components/ui/StyledComponents';
import { Device } from '@/services/ip';

interface DeviceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  onSubmit: (deviceId: number, deviceName: string) => Promise<void>;
  loading?: boolean;
}

export default function DeviceEditModal({
  isOpen,
  onClose,
  device,
  onSubmit,
  loading = false
}: DeviceEditModalProps) {
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (device) {
      setDeviceName(device.device_name || '');
      setError(null);
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!device) return;
    
    if (!deviceName.trim()) {
      setError('기기 이름을 입력해주세요.');
      return;
    }

    try {
      await onSubmit(device.id, deviceName.trim());
      onClose();
    } catch (error: any) {
      setError(error.message || '기기 정보 수정 중 오류가 발생했습니다.');
    }
  };

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75" onClick={onClose}></div>
        </div>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary">기기 정보 수정</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-primary">
                  MAC 주소
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  value={device.mac_address || ''}
                  disabled
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-primary">
                  IP 주소
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  value={device.assigned_ip || ''}
                  disabled
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-primary">
                  기기 이름 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700 text-primary"
                  placeholder="기기 이름 입력 (예: 내 노트북)"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="mb-4 p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 dark:text-red-300 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                      처리 중...
                    </span>
                  ) : (
                    '수정하기'
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