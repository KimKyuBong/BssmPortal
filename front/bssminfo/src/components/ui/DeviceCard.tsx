import React from 'react';
import { Laptop } from 'lucide-react';

interface DeviceCardProps {
  device: {
    id: number;
    device_name: string;
    mac_address: string;
    assigned_ip?: string;
    is_active: boolean;
    last_seen?: string;
  };
  onClick?: () => void;
  showActions?: boolean;
  onToggleActive?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function DeviceCard({
  device,
  onClick,
  showActions = false,
  onToggleActive,
  onEdit,
  onDelete,
  className = ''
}: DeviceCardProps) {
  return (
    <div 
      className={`card-hover p-4 border rounded-lg transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Laptop className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary">
              {device.device_name || '이름 없음'}
            </h3>
            <p className="text-xs text-secondary">
              {device.mac_address ? `MAC: ${device.mac_address.substring(0, 8)}...` : '정보 없음'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            device.is_active 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {device.is_active ? '활성' : '비활성'}
          </span>
          
          {showActions && (
            <div className="flex space-x-1">
              {onToggleActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive();
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    device.is_active 
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800' 
                      : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  {device.is_active ? '비활성화' : '활성화'}
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                >
                  수정
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-secondary">
        <div>
          <span className="font-medium">IP 주소:</span>
          <span className="ml-1">{device.assigned_ip || '-'}</span>
        </div>
        <div>
          <span className="font-medium">마지막 접속:</span>
          <span className="ml-1">{device.last_seen || '기록 없음'}</span>
        </div>
      </div>
    </div>
  );
} 