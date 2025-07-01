import React from 'react';
import { Power, PowerOff, Trash2, CheckCircle } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkActivate?: () => void;
  onBulkDeactivate?: () => void;
  onBulkDelete?: () => void;
  className?: string;
}

export default function BulkActionBar({
  selectedCount,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  className = ''
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 p-4 rounded-lg mb-4 flex items-center justify-between shadow-sm ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-sm">
          <span className="font-semibold text-blue-900 dark:text-blue-100">{selectedCount}개</span>
          <span className="text-blue-700 dark:text-blue-300">의 기기가 선택됨</span>
        </div>
      </div>
      <div className="flex space-x-3">
        {onBulkActivate && (
          <button
            onClick={onBulkActivate}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <Power className="w-4 h-4 mr-2" />
            일괄 활성화
          </button>
        )}
        {onBulkDeactivate && (
          <button
            onClick={onBulkDeactivate}
            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <PowerOff className="w-4 h-4 mr-2" />
            일괄 비활성화
          </button>
        )}
        {onBulkDelete && (
          <button
            onClick={onBulkDelete}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            선택 기기 삭제
          </button>
        )}
      </div>
    </div>
  );
} 