'use client';

import React from 'react';
import { PublicEquipment } from '@/services/publicEquipment';

interface EquipmentInfoCardProps {
  equipment: PublicEquipment;
}

export default function EquipmentInfoCard({ equipment }: EquipmentInfoCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'RENTED':
        return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'BROKEN':
        return 'bg-red-100 text-red-800';
      case 'LOST':
        return 'bg-gray-100 text-gray-800';
      case 'DISPOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEquipmentTypeIcon = (type: string) => {
    switch (type) {
      case 'LAPTOP':
        return '💻';
      case 'MACBOOK':
        return '💻';
      case 'TABLET':
        return '📱';
      case 'DESKTOP':
        return '🖥️';
      case 'MONITOR':
        return '🖥️';
      case 'PRINTER':
        return '🖨️';
      case 'PROJECTOR':
        return '📽️';
      default:
        return '🔧';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatPrice = (price: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">
              {getEquipmentTypeIcon(equipment.equipment_type)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                장비 정보
              </h2>
              <p className="text-sm text-gray-500">
                {equipment.equipment_type_display}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(equipment.status)}`}>
            {equipment.status_display}
          </span>
        </div>

        {/* 기본 정보 */}
        <div className="space-y-6">
          {/* 주요 식별 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-3">주요 식별 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  일련번호
                </label>
                <div className="text-sm font-mono bg-blue-100 text-blue-900 px-3 py-2 rounded-md border border-blue-300 font-semibold">
                  {equipment.serial_number}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  관리번호
                </label>
                <div className="text-sm font-mono bg-blue-100 text-blue-900 px-3 py-2 rounded-md border border-blue-300 font-semibold">
                  {equipment.management_number || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* 장비 기본 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">장비 기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  물품번호
                </label>
                <div className="text-sm text-gray-900">
                  {equipment.asset_number || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  제조사
                </label>
                <div className="text-sm text-gray-900">
                  {equipment.manufacturer || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  모델명
                </label>
                <div className="text-sm text-gray-900">
                  {equipment.model_name || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  제작년도
                </label>
                <div className="text-sm text-gray-900">
                  {equipment.manufacture_year || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* 구매 및 취득 정보 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-900 mb-3">구매 및 취득 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">
                  구매일
                </label>
                <div className="text-sm text-gray-900">
                  {formatDate(equipment.purchase_date)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">
                  구매금액
                </label>
                <div className="text-sm text-gray-900">
                  {formatPrice(equipment.purchase_price)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">
                  취득일
                </label>
                <div className="text-sm text-gray-900">
                  {formatDate(equipment.acquisition_date)}
                </div>
              </div>
            </div>
          </div>

          {/* 시스템 정보 */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-900 mb-3">시스템 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">
                  등록일
                </label>
                <div className="text-sm text-gray-900">
                  {formatDate(equipment.created_at)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">
                  현재 상태
                </label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(equipment.status)}`}>
                  {equipment.status_display}
                </span>
              </div>
            </div>
          </div>

          {/* 상세 설명 */}
          {equipment.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">상세 설명</h3>
              <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border whitespace-pre-wrap">
                {equipment.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
