'use client';

import React from 'react';
import { PublicRental } from '@/services/publicEquipment';

interface RentalHistoryCardProps {
  rentals: PublicRental[];
  totalRentals: number;
}

export default function RentalHistoryCard({ rentals, totalRentals }: RentalHistoryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RENTED':
        return 'bg-blue-100 text-blue-800';
      case 'RETURNED':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const isOverdue = (dueDate: string, returnDate: string | null, status: string) => {
    if (status === 'RETURNED' || returnDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📋</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                대여이력
              </h2>
              <p className="text-sm text-gray-500">
                총 {totalRentals}건의 대여 기록
              </p>
            </div>
          </div>
        </div>

        {/* 대여이력 목록 */}
        {rentals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📝</div>
            <p className="text-gray-500">대여이력이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map((rental, index) => (
              <div 
                key={rental.id} 
                className={`border rounded-lg p-3 ${
                  isOverdue(rental.due_date, rental.return_date, rental.status) 
                    ? 'border-red-300 bg-red-50' 
                    : rental.status === 'RENTED'
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* 상태 표시 헤더 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
                      #{rentals.length - index}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(rental.status)}`}>
                      {rental.status_display}
                    </span>
                    {isOverdue(rental.due_date, rental.return_date, rental.status) && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-900 border border-red-300">
                        ⚠️ 연체
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDateOnly(rental.created_at)}
                  </div>
                </div>

                {/* 대여 정보 */}
                <div className="space-y-3">
                  {/* 대여자 정보 */}
                  <div className="bg-white p-3 rounded-md border">
                    <div className="text-xs font-medium text-gray-700 mb-1">대여자</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {rental.user_name}
                    </div>
                  </div>

                  {/* 날짜 정보 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-md border">
                      <div className="text-xs font-medium text-gray-700 mb-1">대여일</div>
                      <div className="text-sm text-gray-900">
                        {formatDateOnly(rental.rental_date)}
                      </div>
                    </div>

                    <div className={`p-3 rounded-md border ${
                      isOverdue(rental.due_date, rental.return_date, rental.status)
                        ? 'bg-red-100 border-red-300'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="text-xs font-medium text-gray-700 mb-1">반납예정일</div>
                      <div className={`text-sm font-medium ${
                        isOverdue(rental.due_date, rental.return_date, rental.status)
                          ? 'text-red-700'
                          : 'text-gray-900'
                      }`}>
                        {formatDateOnly(rental.due_date)}
                      </div>
                    </div>
                  </div>

                  {/* 반납일 (있는 경우) */}
                  {rental.return_date && (
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <div className="text-xs font-medium text-green-700 mb-1">반납일</div>
                      <div className="text-sm font-medium text-green-900">
                        {formatDateOnly(rental.return_date)}
                      </div>
                    </div>
                  )}
                </div>

                {/* 비고 */}
                {rental.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-medium text-gray-700 mb-1">비고</div>
                    <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {rental.notes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
