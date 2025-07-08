'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, RefreshCw, Filter, Calendar, FileText, 
  Laptop, Monitor, Printer, Smartphone, 
  Package, Settings, AlertCircle, CheckCircle, FileEdit
} from 'lucide-react';
import { Equipment as ApiEquipment } from '@/services/api';
import rentalService from '@/services/rental';
import equipmentService from '@/services/equipment';
import 'dayjs/locale/ko';
import dayjs from 'dayjs';
import { formatDateToKorean } from '@/utils/dateUtils';
import { useToastContext } from '@/contexts/ToastContext';
import { 
  Card, 
  Heading, 
  Text, 
  Button, 
  Input, 
  Textarea, 
  Modal,
  Spinner,
  DateInput
} from '@/components/ui/StyledComponents';

interface Equipment extends ApiEquipment {
  mac_addresses: Array<{
    mac_address: string;
    is_primary: boolean;
  }>;
  equipment_type_display: string;
  manufacture_year?: number;
  purchase_date?: string;
}

// 장비 유형 옵션
const EQUIPMENT_TYPE_OPTIONS = [
  { value: 'ALL', label: '전체', icon: Package },
  { value: 'LAPTOP', label: '노트북', icon: Laptop },
  { value: 'MACBOOK', label: '맥북', icon: Laptop },
  { value: 'TABLET', label: '태블릿', icon: Smartphone },
  { value: 'DESKTOP', label: '데스크톱', icon: Monitor },
  { value: 'MONITOR', label: '모니터', icon: Monitor },
  { value: 'PRINTER', label: '프린터', icon: Printer },
  { value: 'PROJECTOR', label: '프로젝터', icon: Monitor },
  { value: 'OTHER', label: '기타', icon: Settings },
];

export default function RentalsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToastContext();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openRentDialog, setOpenRentDialog] = useState<boolean>(false);
  const [openDetailDialog, setOpenDetailDialog] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [returnDate, setReturnDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('ALL');

  // 초기 데이터 로드
  useEffect(() => {
    loadEquipmentData();
  }, []);

  // 장비 유형 필터링 적용
  useEffect(() => {
    if (selectedEquipmentType === 'ALL') {
      setFilteredEquipment(equipment);
    } else {
      const filtered = equipment.filter(eq => eq.equipment_type === selectedEquipmentType);
      setFilteredEquipment(filtered);
    }
  }, [equipment, selectedEquipmentType]);

  // 장비 데이터 로드
  const loadEquipmentData = async () => {
    try {
      console.log('대여 가능한 장비 조회 시작...');
      setLoading(true);
      const equipmentResult = await equipmentService.getAvailableEquipment();
      console.log('대여 가능한 장비 조회 결과:', equipmentResult);
      
      if (equipmentResult.success && equipmentResult.data) {
        console.log('대여 가능한 장비 수:', equipmentResult.data.length);
        setEquipment(equipmentResult.data);
      } else {
        console.error('대여 가능한 장비 조회 실패:', equipmentResult);
        setEquipment([]);
      }
    } catch (error) {
      console.error('장비 데이터 로드 중 오류 발생:', error);
      showError('장비 데이터 오류', '장비 데이터를 불러오는 중 오류가 발생했습니다.');
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  // 상세정보 다이얼로그 열기
  const handleOpenDetailDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setOpenDetailDialog(true);
  };

  // 대여 신청 다이얼로그 열기
  const handleOpenRentDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setReturnDate(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    setNotes('');
    setOpenRentDialog(true);
  };

  // 대여 신청 처리
  const handleSubmitRentRequest = async () => {
    if (!selectedEquipment || !returnDate) {
      showError('입력 오류', '장비와 반납 예정일을 모두 선택해주세요.');
      return;
    }

    console.log('대여 신청 시작');
    setLoading(true);
    try {
      console.log('대여 신청 API 요청 전송');
      const result = await rentalService.createRentalRequest({
        equipment: selectedEquipment.id,
        request_type: "RENTAL",
        expected_return_date: dayjs(returnDate).toISOString(),
        request_reason: notes
      });
      console.log('대여 신청 API 응답:', result);

      if (result && (result.success || result.data)) {
        showSuccess('대여 신청 완료', '대여 신청이 완료되었습니다.');
        setOpenRentDialog(false);
        resetDialogFields();
        
        // 데이터 갱신
        await loadEquipmentData();
      } else {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.detail || '대여 신청 중 오류가 발생했습니다.';
        showError('대여 신청 실패', errorMessage);
      }
    } catch (error) {
      console.error('대여 신청 중 오류 발생:', error);
      showError('대여 신청 오류', '대여 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 다이얼로그 필드 초기화
  const resetDialogFields = () => {
    setSelectedEquipment(null);
    setReturnDate('');
    setNotes('');
  };

  // 장비 유형별 통계 계산
  const getEquipmentTypeStats = () => {
    const stats: { [key: string]: number } = {};
    EQUIPMENT_TYPE_OPTIONS.forEach(option => {
      if (option.value === 'ALL') {
        stats[option.value] = equipment.length;
      } else {
        stats[option.value] = equipment.filter(eq => eq.equipment_type === option.value).length;
      }
    });
    return stats;
  };

  const equipmentStats = getEquipmentTypeStats();

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/dashboard/user')}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <h1 className="text-2xl font-bold text-primary">대여 가능한 장비 목록</h1>
          </div>
          <button
            onClick={loadEquipmentData}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 장비 유형별 통계 */}
        <div className="card mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-primary" />
            <h2 className="text-lg font-semibold text-primary">장비 유형별 현황</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_TYPE_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedEquipmentType(option.value)}
                  className={`flex items-center px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedEquipmentType === option.value
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <IconComponent className="w-4 h-4 mr-1" />
                  {option.label} ({equipmentStats[option.value]})
                </button>
              );
            })}
          </div>
        </div>

        {/* 장비 유형 필터 */}
        <div className="card mb-6">
          <label className="block text-sm font-medium text-secondary mb-2">
            장비 유형 선택
          </label>
          <select
            value={selectedEquipmentType}
            onChange={(e) => setSelectedEquipmentType(e.target.value)}
            className="input-field"
          >
            {EQUIPMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({equipmentStats[option.value]})
              </option>
            ))}
          </select>
        </div>

        {filteredEquipment.length === 0 && !loading ? (
          <div className="card">
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-secondary">
                {selectedEquipmentType === 'ALL' 
                  ? '현재 대여 가능한 장비가 없습니다.'
                  : `${EQUIPMENT_TYPE_OPTIONS.find(opt => opt.value === selectedEquipmentType)?.label} 유형의 대여 가능한 장비가 없습니다.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEquipment.map((equipment) => (
              <div key={equipment.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-primary truncate flex-1">
                    {equipment.manufacturer} {equipment.model_name}
                  </h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-2 border border-blue-200 dark:border-blue-700">
                    {equipment.equipment_type_display}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                    <div className="text-sm text-secondary mb-1">
                      <span className="font-medium">관리번호</span>
                    </div>
                    <div className="text-sm font-semibold text-primary">
                      {equipment.management_number || '미지정'}
                    </div>
                  </div>
                  
                  {equipment.manufacture_year && (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                      <div className="text-sm text-secondary mb-1">
                        <span className="font-medium">제작년도</span>
                      </div>
                      <div className="text-sm font-semibold text-primary">
                        {equipment.manufacture_year}년
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenDetailDialog(equipment)}
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    상세정보
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenRentDialog(equipment)}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    대여 신청
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 상세정보 모달 */}
        <Modal
          isOpen={openDetailDialog}
          onClose={() => setOpenDetailDialog(false)}
          size="lg"
        >
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <Heading level={2} className="text-xl font-bold">
                  장비 상세정보
                </Heading>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <Heading level={3} className="text-lg font-semibold mb-3">
                      {selectedEquipment.manufacturer} {selectedEquipment.model_name}
                    </Heading>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Text className="text-sm text-secondary">장비 유형:</Text>
                        <Text className="text-sm font-medium">{selectedEquipment.equipment_type_display}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text className="text-sm text-secondary">관리번호:</Text>
                        <Text className="text-sm font-medium">{selectedEquipment.management_number || '미지정'}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text className="text-sm text-secondary">시리얼번호:</Text>
                        <Text className="text-sm font-medium">{selectedEquipment.serial_number}</Text>
                      </div>
                      {selectedEquipment.manufacture_year && (
                        <div className="flex justify-between">
                          <Text className="text-sm text-secondary">제작년도:</Text>
                          <Text className="text-sm font-medium">{selectedEquipment.manufacture_year}년</Text>
                        </div>
                      )}
                      {selectedEquipment.purchase_date && (
                        <div className="flex justify-between">
                          <Text className="text-sm text-secondary">구매일:</Text>
                          <Text className="text-sm font-medium">{dayjs(selectedEquipment.purchase_date).format('YYYY년 MM월 DD일')}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <Heading level={4} className="text-md font-semibold mb-3">MAC 주소</Heading>
                    <div className="space-y-2">
                      {selectedEquipment.mac_addresses && selectedEquipment.mac_addresses.length > 0 ? (
                        selectedEquipment.mac_addresses.map((mac, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <Text className="text-sm text-secondary">
                              {mac.is_primary ? '주 MAC:' : `MAC ${index + 1}:`}
                            </Text>
                            <Text className="text-sm font-mono">{mac.mac_address}</Text>
                          </div>
                        ))
                      ) : (
                        <Text className="text-sm text-secondary">등록된 MAC 주소가 없습니다.</Text>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedEquipment.description && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <Heading level={4} className="text-md font-semibold mb-2">설명</Heading>
                    <Text className="text-sm text-secondary">{selectedEquipment.description}</Text>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setOpenDetailDialog(false)}
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* 대여 신청 모달 */}
        <Modal
          isOpen={openRentDialog}
          onClose={() => setOpenRentDialog(false)}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <Heading level={2} className="text-xl font-bold">
                장비 대여 신청
              </Heading>
            </div>
            
            {selectedEquipment && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Text className="text-sm text-secondary">
                  {selectedEquipment.manufacturer} {selectedEquipment.model_name} ({selectedEquipment.equipment_type_display})
                </Text>
              </div>
            )}
            
            <div className="space-y-4">
              <Input
                label="선택된 장비"
                value={selectedEquipment ? `${selectedEquipment.manufacturer} ${selectedEquipment.model_name}` : ''}
                readOnly
                className="bg-gray-50 dark:bg-gray-700"
              />
              
              <DateInput
                label="반납 예정일"
                value={returnDate}
                onChange={setReturnDate}
                min={dayjs().format('YYYY-MM-DD')}
                className="w-full"
              />
              
              <Textarea
                label="신청 사유"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="장비 대여 목적을 입력하세요"
                rows={4}
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setOpenRentDialog(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitRentRequest}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    처리중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    신청하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
} 