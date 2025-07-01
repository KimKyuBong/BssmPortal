'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Modal, Button, Input, Select, DateInput, Text, Heading } from '@/components/ui/StyledComponents';
import { Equipment } from '@/services/api';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  equipment?: Equipment | null;
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export default function EquipmentFormModal({
  isOpen,
  onClose,
  mode,
  equipment,
  onSubmit,
  loading = false
}: EquipmentFormModalProps) {
  const [formData, setFormData] = useState({
    asset_number: '',
    manufacturer: '',
    model_name: '',
    serial_number: '',
    equipment_type: 'LAPTOP',
    description: '',
    status: 'AVAILABLE',
    manufacture_year: '',
    purchase_date: '',
    purchase_price: '',
    acquisition_date: ''
  });

  // 장비 데이터로 폼 초기화
  useEffect(() => {
    if (equipment && mode === 'edit') {
      setFormData({
        asset_number: equipment.asset_number || '',
        manufacturer: equipment.manufacturer || '',
        model_name: equipment.model_name || '',
        serial_number: equipment.serial_number,
        equipment_type: equipment.equipment_type,
        description: equipment.description || '',
        status: equipment.status,
        manufacture_year: equipment.manufacture_year?.toString() || '',
        purchase_date: equipment.purchase_date || '',
        purchase_price: equipment.purchase_price?.toString() || '',
        acquisition_date: equipment.acquisition_date || ''
      });
    } else {
      // 추가 모드일 때 폼 초기화
      setFormData({
        asset_number: '',
        manufacturer: '',
        model_name: '',
        serial_number: '',
        equipment_type: 'LAPTOP',
        description: '',
        status: 'AVAILABLE',
        manufacture_year: '',
        purchase_date: '',
        purchase_price: '',
        acquisition_date: ''
      });
    }
  }, [equipment, mode, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.model_name || !formData.serial_number) {
      alert('모델명과 일련번호는 필수 항목입니다.');
      return;
    }

    try {
      const submitData = {
        ...formData,
        manufacture_year: formData.manufacture_year ? parseInt(formData.manufacture_year) : undefined,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('장비 저장 실패:', error);
    }
  };

  const equipmentTypeOptions = [
    { value: 'LAPTOP', label: '노트북' },
    { value: 'MACBOOK', label: '맥북' },
    { value: 'DESKTOP', label: '데스크톱' },
    { value: 'MONITOR', label: '모니터' },
    { value: 'PRINTER', label: '프린터' },
    { value: 'PROJECTOR', label: '프로젝터' },
    { value: 'TABLET', label: '태블릿' },
    { value: 'OTHER', label: '기타' }
  ];

  const statusOptions = [
    { value: 'AVAILABLE', label: '사용 가능' },
    { value: 'RENTED', label: '대여 중' },
    { value: 'MAINTENANCE', label: '유지보수' },
    { value: 'BROKEN', label: '파손' },
    { value: 'LOST', label: '분실' },
    { value: 'DISPOSED', label: '폐기' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <Heading level={2} className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'add' ? '장비 추가' : '장비 수정'}
          </Heading>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 물품번호 */}
            <div>
              <Input
                label="물품번호"
                name="asset_number"
                value={formData.asset_number}
                onChange={handleInputChange}
                placeholder="물품번호를 입력하세요"
              />
            </div>

            {/* 제조사 */}
            <div>
              <Input
                label="제조사"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                placeholder="제조사를 입력하세요"
              />
            </div>

            {/* 모델명 */}
            <div>
              <Input
                label="모델명 *"
                name="model_name"
                value={formData.model_name}
                onChange={handleInputChange}
                placeholder="모델명을 입력하세요"
                required
              />
            </div>

            {/* 일련번호 */}
            <div>
              <Input
                label="일련번호 *"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleInputChange}
                placeholder="일련번호를 입력하세요"
                required
              />
            </div>

            {/* 장비 유형 */}
            <div>
              <Select
                label="장비 유형"
                name="equipment_type"
                value={formData.equipment_type}
                onChange={handleInputChange}
                options={equipmentTypeOptions}
              />
            </div>

            {/* 상태 */}
            <div>
              <Select
                label="상태"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                options={statusOptions}
              />
            </div>

            {/* 생산년도 */}
            <div>
              <Input
                label="생산년도"
                name="manufacture_year"
                type="number"
                value={formData.manufacture_year}
                onChange={handleInputChange}
                placeholder="예: 2023"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            {/* 구매일 */}
            <div>
              <DateInput
                label="구매일"
                value={formData.purchase_date}
                onChange={(value) => handleDateChange('purchase_date', value)}
                placeholder="구매일을 선택하세요"
              />
            </div>

            {/* 구매가격 */}
            <div>
              <Input
                label="구매가격"
                name="purchase_price"
                type="number"
                value={formData.purchase_price}
                onChange={handleInputChange}
                placeholder="구매가격을 입력하세요"
                min="0"
                step="0.01"
              />
            </div>

            {/* 취득일 */}
            <div>
              <DateInput
                label="취득일"
                value={formData.acquisition_date}
                onChange={(value) => handleDateChange('acquisition_date', value)}
                placeholder="취득일을 선택하세요"
              />
            </div>

            {/* 설명 */}
            <div className="md:col-span-2">
              <Input
                label="설명"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="장비에 대한 설명을 입력하세요"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              variant="primary"
              type="submit"
              disabled={loading}
              className="flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  저장 중...
                </>
              ) : (
                mode === 'add' ? '추가' : '수정'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 