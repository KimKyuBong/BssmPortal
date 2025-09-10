'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Input, 
  Select, 
  Heading,
  Card,
  Spinner
} from '@/components/ui/StyledComponents';
import { X } from 'lucide-react';
import equipment, { ModelBatchUpdateData, UpdatedEquipment } from '@/services/equipment';
import { Equipment } from '@/services/api';
import { useToastContext } from '@/contexts/ToastContext';

interface ModelBatchUpdateProps {
  open: boolean;
  onClose: () => void;
}

export default function ModelBatchUpdate({ open, onClose }: ModelBatchUpdateProps) {
  const { showSuccess, showError } = useToastContext();

  // 모델명 선택/입력
  const [modelName, setModelName] = useState<string>('');
  // 모델명 목록 (기존 모델들)
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  // 제조사
  const [manufacturer, setManufacturer] = useState<string>('');
  // 제작년도
  const [manufactureYear, setManufactureYear] = useState<string>('');
  // 구매일시
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  // 구매가격
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  // 장비 종류
  const [equipmentType, setEquipmentType] = useState<string>('');
  // 로딩 상태
  const [loading, setLoading] = useState<boolean>(false);
  // 결과 메시지
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);
  // 업데이트된 장비들
  const [updatedEquipments, setUpdatedEquipments] = useState<UpdatedEquipment[]>([]);

  // 모델명 변경 핸들러
  const handleModelNameChange = async (newModelName: string) => {
    console.log('모델명 변경 핸들러 호출됨:', newModelName);
    setModelName(newModelName);
    
    if (newModelName) {
      try {
        console.log('모델 정보 조회 시도:', newModelName);
        const response = await equipment.getModelInfo(newModelName);
        console.log('모델 정보 조회 응답:', response);
        if (response.success && response.data) {
          console.log('모델 정보 설정:', response.data);
          setManufacturer(response.data.manufacturer || '');
          setManufactureYear(response.data.manufacture_year?.toString() || '');
          setPurchaseDate(response.data.purchase_date || '');
          setPurchasePrice(response.data.purchase_price?.toString() || '');
          setEquipmentType(response.data.equipment_type || '');
        }
      } catch (error) {
        console.error("모델 정보 조회 실패:", error);
      }
    } else {
      // 모델명이 비어있으면 입력 필드 초기화
      setManufacturer('');
      setManufactureYear('');
      setPurchaseDate('');
      setPurchasePrice('');
      setEquipmentType('');
    }
  };

  // Select 컴포넌트의 onChange 핸들러
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Select onChange 이벤트 발생:', event.target.value);
    handleModelNameChange(event.target.value);
  };

  // 고유한 모델명 목록 가져오기
  useEffect(() => {
    const fetchModelNames = async () => {
      try {
        const response = await equipment.getAllEquipment();
        if (response.success && Array.isArray(response.data)) {
          // 중복 제거하고 고유한 모델명만 추출
          const uniqueModels = Array.from(
            new Set(
              response.data
                .map((equipment: Equipment) => equipment.model_name)
                .filter((name: string | null) => name) // null/빈 값 제거
            )
          );
          setModelOptions(uniqueModels as string[]);
        }
      } catch (error) {
        console.error("모델명 목록 로드 실패:", error);
      }
    };

    fetchModelNames();
  }, []);

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modelName) {
      showError('입력 오류', '모델명을 입력해주세요.');
      return;
    }
    
    if (!equipmentType) {
      showError('입력 오류', '장비 종류를 선택해주세요. 모델별 일괄 업데이트에서는 장비 종류가 필수입니다.');
      return;
    }
    
    if (!manufacturer && !manufactureYear && !purchaseDate && !purchasePrice) {
      showError('입력 오류', '제조사, 생산년도, 구매일시, 구매가격 중 하나는 입력해야 합니다.');
      return;
    }
    
    const data: ModelBatchUpdateData = {
      model_name: modelName,
      equipment_type: equipmentType, // 장비 유형은 항상 포함
    };
    
    if (manufacturer) {
      data.manufacturer = manufacturer;
    }
    
    if (manufactureYear) {
      data.manufacture_year = parseInt(manufactureYear);
    }
    
    if (purchaseDate) {
      data.purchase_date = purchaseDate;
    }
    
    if (purchasePrice) {
      data.purchase_price = parseFloat(purchasePrice);
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await equipment.updateByModel(data);
      console.log('업데이트 응답:', response);
      
      if (response.success) {
        // 성공 메시지 표시
        showSuccess('일괄 업데이트 완료', response.message);
        
        // 2초 후 모달 닫기
        setTimeout(() => {
          onClose();
          // 상태 초기화
          setModelName('');
          setManufacturer('');
          setManufactureYear('');
          setPurchaseDate('');
          setPurchasePrice('');
          setEquipmentType('');
          setResult(null);
          setUpdatedEquipments([]);
        }, 2000);
      } else {
        showError('일괄 업데이트 실패', response.message || '일괄 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('일괄 업데이트 오류:', error);
      showError('일괄 업데이트 오류', '일괄 업데이트 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <Heading level={2} className="text-xl font-bold text-gray-900 dark:text-white">
              모델별 일괄 업데이트
            </Heading>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              특정 모델명을 가진 모든 장비의 제조사, 생산년도, 구매일시, 구매가격을 한 번에 업데이트합니다.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      
        {/* 컨텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-4" id="batch-update-form">
            {/* 모델명 선택 */}
            <div>
              <Select
                label="모델명 선택"
                value={modelName}
                onChange={handleSelectChange}
                options={[
                  { value: '', label: '모델명을 선택하세요' },
                  ...modelOptions.map(model => ({ value: model, label: model }))
                ]}
              />
            </div>
            
            {/* 모델명 직접 입력 */}
            <div>
              <Input
                label="모델명 직접 입력"
                value={modelName}
                onChange={(e) => handleModelNameChange(e.target.value)}
                placeholder="모델명이 목록에 없는 경우 직접 입력하세요"
              />
            </div>
            
            {/* 제조사 */}
            <div>
              <Input
                label="제조사"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="제조사를 입력하세요 (예: Apple, Samsung, LG)"
              />
            </div>
            
            {/* 생산년도 */}
            <div>
              <Input
                label="생산년도"
                type="number"
                value={manufactureYear}
                onChange={(e) => setManufactureYear(e.target.value)}
                min="1900"
                max={new Date().getFullYear()}
                placeholder="생산년도를 입력하세요"
              />
            </div>
            
            {/* 구매일시 */}
            <div>
              <Input
                label="구매일시 (YYYY-MM-DD)"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                placeholder="구매일시를 입력하세요"
              />
            </div>
            
            {/* 구매가격 */}
            <div>
              <Input
                label="구매가격 (원)"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="구매가격을 입력하세요"
              />
            </div>
            
            {/* 장비 종류 */}
            <div>
              <Select
                label="장비 종류 (필수)"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                options={[
                  { value: '', label: '장비 종류를 선택하세요' },
                  { value: 'LAPTOP', label: '노트북' },
                  { value: 'MACBOOK', label: '맥북' },
                  { value: 'TABLET', label: '태블릿' },
                  { value: 'DESKTOP', label: '데스크톱' },
                  { value: 'MONITOR', label: '모니터' },
                  { value: 'PRINTER', label: '프린터' },
                  { value: 'PROJECTOR', label: '프로젝터' },
                  { value: 'OTHER', label: '기타' }
                ]}
              />
            </div>
            
            {/* 수정 안내 메시지 */}
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📝 일괄 수정 안내</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>장비 종류</strong>는 반드시 선택해야 합니다.</li>
                <li>• <strong>제조사</strong> 정보를 업데이트할 수 있습니다.</li>
                <li>• <strong>구매일시</strong>를 수정하면 관리번호가 자동으로 재생성됩니다.</li>
                <li>• <strong>장비 종류</strong>를 변경하면 관리번호가 자동으로 재생성됩니다.</li>
                <li>• 입력하지 않은 필드는 기존 값이 유지됩니다.</li>
              </ul>
            </div>
            
            {/* 결과 메시지 */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success 
                ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' 
                : 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
              }`}>
                {result.message}
              </div>
            )}
            
            {/* 업데이트된 장비 목록 */}
            {updatedEquipments.length > 0 && (
              <div className="mt-4">
                <Heading level={4} className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  업데이트된 장비 목록 ({updatedEquipments.length}개)
                </Heading>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {updatedEquipments.map((equipment) => (
                    <Card key={equipment.id} className="p-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {equipment.model_name} ({equipment.equipment_type_display})
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          제조사: {equipment.manufacturer}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          자산번호: {equipment.asset_number || '없음'} | 시리얼번호: {equipment.serial_number}
                        </p>
                        {equipment.mac_addresses.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            MAC 주소: {equipment.mac_addresses.map(mac => mac.mac_address).join(', ')}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
        
        {/* 버튼 영역 */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
          <Button 
            variant="secondary" 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
          >
            취소
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            form="batch-update-form"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
          >
            {loading && <Spinner className="w-4 h-4 mr-2" />}
            {loading ? '업데이트 중...' : '일괄 업데이트'}
          </Button>
        </div>
      </div>
    </div>
  );
} 