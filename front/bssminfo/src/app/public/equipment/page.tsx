'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicEquipmentService, PublicEquipmentDetailResponse, PublicApiError } from '@/services/publicEquipment';
import EquipmentInfoCard from '@/components/public/EquipmentInfoCard';
import RentalHistoryCard from '@/components/public/RentalHistoryCard';
import EquipmentHistoryCard from '@/components/public/EquipmentHistoryCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

function PublicEquipmentContent() {
  const searchParams = useSearchParams();
  const serialNumber = searchParams.get('serial');
  
  const [equipmentData, setEquipmentData] = useState<PublicEquipmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serialNumber) {
      fetchEquipmentData(serialNumber);
    }
  }, [serialNumber]);

  // 일련번호가 없으면 아무것도 표시하지 않음
  if (!serialNumber) {
    return null;
  }

  const fetchEquipmentData = async (serial: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await publicEquipmentService.getEquipmentDetail(serial);
      
      if (result.success) {
        setEquipmentData(result);
      } else {
        setError((result as PublicApiError).message);
      }
    } catch (err) {
      setError('장비 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (serial: string) => {
    if (serial.trim()) {
      fetchEquipmentData(serial.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* 오류 상태 */}
        {error && !loading && (
          <div className="mb-8">
            <ErrorMessage 
              title="장비 정보 조회 실패"
              message={error}
              serialNumber={serialNumber || undefined}
            />
          </div>
        )}

        {/* 장비 정보 */}
        {equipmentData && !loading && (
          <div className="space-y-8">
            {/* 장비 기본 정보 */}
            <EquipmentInfoCard equipment={equipmentData.equipment} />

            {/* 대여 이력 */}
            <RentalHistoryCard 
              rentals={equipmentData.rental_history} 
              totalRentals={equipmentData.total_rentals} 
            />

            {/* 장비 이력 */}
            <EquipmentHistoryCard 
              history={equipmentData.equipment_history} 
              totalEntries={equipmentData.total_history_entries} 
            />
          </div>
        )}

      </div>
    </div>
  );
}

export default function PublicEquipmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <PublicEquipmentContent />
    </Suspense>
  );
}