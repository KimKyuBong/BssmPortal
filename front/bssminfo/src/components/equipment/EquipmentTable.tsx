'use client';

import React from 'react';
import { Edit, Trash2, UserCheck, History, UserPlus } from 'lucide-react';
import { 
  BaseTable, 
  BaseTableHead, 
  BaseTableBody, 
  BaseTableRow, 
  BaseTableHeaderCell, 
  BaseTableCell, 
  Button, 
  Badge,
  Spinner
} from '@/components/ui/StyledComponents';
import Tooltip from '@/components/ui/Tooltip';
import { Equipment } from '@/services/api';

interface EquipmentTableProps {
  equipment: Equipment[];
  loading: boolean;
  onEdit: (item: Equipment) => void;
  onDelete: (id: number) => void;
  onRental: (item: Equipment) => void;
  onNewRental: (item: Equipment) => void;
  onHistory: (equipment: Equipment) => void;
  onStatusChange: (id: number, newStatus: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED') => void;
}

export default function EquipmentTable({
  equipment,
  loading,
  onEdit,
  onDelete,
  onRental,
  onNewRental,
  onHistory,
  onStatusChange
}: EquipmentTableProps) {

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'AVAILABLE': { label: '사용가능', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      'RENTED': { label: '대여중', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'MAINTENANCE': { label: '점검중', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      'BROKEN': { label: '고장', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      'LOST': { label: '분실', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
      'DISPOSED': { label: '폐기', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['AVAILABLE'];
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatPrice = (price: string | undefined) => {
    if (!price) return '-';
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('ko-KR').format(numPrice) + '원';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        등록된 장비가 없습니다.
      </div>
    );
  }

  return (
    <BaseTable>
      <BaseTableHead>
        <BaseTableRow>
          <BaseTableHeaderCell>물품번호</BaseTableHeaderCell>
          <BaseTableHeaderCell>제조사</BaseTableHeaderCell>
          <BaseTableHeaderCell>모델명</BaseTableHeaderCell>
          <BaseTableHeaderCell>유형</BaseTableHeaderCell>
          <BaseTableHeaderCell>일련번호</BaseTableHeaderCell>
          <BaseTableHeaderCell>상태</BaseTableHeaderCell>
          <BaseTableHeaderCell>대여자</BaseTableHeaderCell>
          <BaseTableHeaderCell>생산년도</BaseTableHeaderCell>
          <BaseTableHeaderCell>구매일</BaseTableHeaderCell>
          <BaseTableHeaderCell>구매가격</BaseTableHeaderCell>
          <BaseTableHeaderCell>작업</BaseTableHeaderCell>
        </BaseTableRow>
      </BaseTableHead>
      <BaseTableBody>
        {equipment.map((item) => (
          <BaseTableRow key={item.id}>
            <BaseTableCell>{item.asset_number}</BaseTableCell>
            <BaseTableCell>{item.manufacturer || '-'}</BaseTableCell>
            <BaseTableCell>{item.model_name || '-'}</BaseTableCell>
            <BaseTableCell>{item.equipment_type_display || '-'}</BaseTableCell>
            <BaseTableCell>{item.serial_number || '-'}</BaseTableCell>
            <BaseTableCell>{getStatusBadge(item.status)}</BaseTableCell>
            <BaseTableCell>{item.rental?.user.name || '-'}</BaseTableCell>
            <BaseTableCell>{item.manufacture_year || '-'}</BaseTableCell>
            <BaseTableCell>{formatDate(item.purchase_date)}</BaseTableCell>
            <BaseTableCell>{formatPrice(item.purchase_price)}</BaseTableCell>
            <BaseTableCell>
              <div className="flex items-center space-x-2">
                <Tooltip content="장비 정보 수정">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(item)}
                    className="h-8 px-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </Tooltip>
                
                <Tooltip content="대여 관리">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRental(item)}
                    className="h-8 px-2"
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </Tooltip>
                
                {/* 새 대여 생성 버튼: 사용가능(AVAILABLE) 장비에만 노출 */}
                {item.status === 'AVAILABLE' && (
                  <Tooltip content="새 대여 생성">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onNewRental(item)}
                      className="h-8 px-2"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
                
                <Tooltip content="장비 이력 보기">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onHistory(item)}
                    className="h-8 px-2"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </Tooltip>
                
                <Tooltip content="장비 삭제">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onDelete(item.id)}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </div>
            </BaseTableCell>
          </BaseTableRow>
        ))}
      </BaseTableBody>
    </BaseTable>
  );
} 