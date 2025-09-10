'use client';

import React from 'react';
import { PublicEquipmentHistory } from '@/services/publicEquipment';

interface EquipmentHistoryCardProps {
  history: PublicEquipmentHistory[];
  totalEntries: number;
}

export default function EquipmentHistoryCard({ history, totalEntries }: EquipmentHistoryCardProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'STATUS_CHANGE':
        return '🔄';
      case 'RENTAL':
        return '📤';
      case 'RETURN':
        return '📥';
      case 'MAINTENANCE':
        return '🔧';
      case 'REPAIR':
        return '🛠️';
      case 'UPDATE':
        return '✏️';
      case 'CREATE':
        return '➕';
      case 'DELETE':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'STATUS_CHANGE':
        return 'bg-blue-100 text-blue-800';
      case 'RENTAL':
        return 'bg-green-100 text-green-800';
      case 'RETURN':
        return 'bg-purple-100 text-purple-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'REPAIR':
        return 'bg-orange-100 text-orange-800';
      case 'UPDATE':
        return 'bg-indigo-100 text-indigo-800';
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📊</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                장비 이력
              </h2>
              <p className="text-sm text-gray-500">
                총 {totalEntries}건의 관리 기록
              </p>
            </div>
          </div>
        </div>

        {/* 이력 목록 */}
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <p className="text-gray-500">장비 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <div 
                key={entry.id} 
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* 아이콘 */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                    {getActionIcon(entry.action)}
                  </div>
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                      {entry.action_display}
                    </span>
                    <div className="text-sm text-gray-500">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-900">
                    {entry.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
