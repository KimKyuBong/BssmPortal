'use client';

import React, { useState, useEffect } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { DeviceMatrix } from '../../types/broadcast';
import { Building, Send } from 'lucide-react';

interface CommonBroadcastFormProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onSubmit: (targetRooms: string[]) => Promise<void>;
  loading: boolean;
  error?: string | null;
  submitText?: string;
}

export default function CommonBroadcastForm({ 
  children, 
  onSuccess, 
  onError, 
  onSubmit, 
  loading, 
  error, 
  submitText 
}: CommonBroadcastFormProps) {
  const [targetRooms, setTargetRooms] = useState<string[]>([]);
  
  // 장치 매트릭스 관련 상태
  const [deviceMatrix, setDeviceMatrix] = useState<DeviceMatrix[][]>([]);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  // 장치 매트릭스 로드
  useEffect(() => {
    loadDeviceMatrix();
  }, []);

  const loadDeviceMatrix = async () => {
    setIsLoadingMatrix(true);
    setMatrixError(null);
    try {
      const response = await broadcastService.getDeviceMatrix();
      if (response.success) {
        setDeviceMatrix(response.matrix);
      } else {
        setMatrixError('장치 매트릭스를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('장치 매트릭스 로드 오류:', error);
      setMatrixError('장치 매트릭스를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingMatrix(false);
    }
  };

  // 활성화된 장치들만 필터링
  const activeDevices = deviceMatrix.flat().filter(device => device.is_active);

  const handleRoomChange = (roomId: string) => {
    setTargetRooms(prev => 
      prev.includes(roomId)
        ? prev.filter(r => r !== roomId)
        : [...prev, roomId]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allRoomIds = activeDevices.map(device => device.room_id.toString());
    setTargetRooms(allRoomIds);
  };

  const handleDeselectAll = () => {
    setTargetRooms([]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (targetRooms.length === 0) {
      onError?.('방송할 장치를 선택해주세요.');
      return;
    }

    try {
      await onSubmit(targetRooms);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '방송 전송 중 오류가 발생했습니다.';
      onError?.(errorMessage);
    }
  };

  return (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow border">
      {children}

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
        {/* 장치 선택 섹션 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex items-center">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mr-2" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900">방송할 장치 선택</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                전체 해제
              </button>
            </div>
          </div>

          {isLoadingMatrix ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">장치 정보를 불러오는 중...</p>
            </div>
          ) : matrixError ? (
            <div className="text-center py-8">
              <p className="text-red-500">{matrixError}</p>
              <button
                type="button"
                onClick={loadDeviceMatrix}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-h-96 overflow-y-auto border rounded-lg p-2 sm:p-4">
              {activeDevices
                .filter(device => !device.device_name.startsWith('장치'))
                .map((device) => (
                  <button
                    key={device.room_id}
                    type="button"
                    onClick={() => handleRoomChange(device.room_id.toString())}
                    className={`p-2 sm:p-3 border rounded-lg flex flex-col items-center justify-center transition-colors min-h-[60px] sm:min-h-[80px] ${
                      targetRooms.includes(device.room_id.toString())
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                    title={device.device_name}
                  >
                    <div className="font-bold text-xs sm:text-sm text-center leading-tight">
                      {device.device_name}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {device.room_id}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 선택된 장치 표시 */}
        {targetRooms.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="h-4 w-4 text-blue-500 mr-2">✓</div>
              <span className="text-sm text-blue-800">
                선택된 장치: {targetRooms.length}개
              </span>
            </div>
            <div className="mt-1 text-xs text-blue-600">
              {targetRooms.map(roomId => {
                const device = activeDevices.find(d => d.room_id.toString() === roomId);
                return device ? `${device.device_name} (${device.room_id})` : roomId;
              }).join(', ')}
            </div>
          </div>
        )}

        {targetRooms.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">
            장치를 선택하지 않으면 모든 활성화된 장치에 방송됩니다.
          </p>
        )}

        {/* 전송 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || targetRooms.length === 0}
            className="w-full sm:w-auto flex justify-center items-center px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                전송 중...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {submitText || '방송 전송'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 