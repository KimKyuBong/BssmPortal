'use client';

import React, { useCallback, useEffect } from 'react';
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
import SelectableTableRow from '@/components/ui/SelectableTableRow';
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
  onSelectAll?: (checked: boolean) => void;
  onSelectEquipment?: (equipmentId: number, checked: boolean) => void;
  selectedEquipmentIds?: number[];
  lastSelectedIndex?: number;
  onLastSelectedIndexChange?: (index: number) => void;
}

export default function EquipmentTable({
  equipment,
  loading,
  onEdit,
  onDelete,
  onRental,
  onNewRental,
  onHistory,
  onStatusChange,
  onSelectAll,
  onSelectEquipment,
  selectedEquipmentIds = [],
  lastSelectedIndex,
  onLastSelectedIndexChange
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

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: string | undefined) => {
    if (!price) return '-';
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('ko-KR').format(numPrice) + '원';
  };

  // 행 클릭 핸들러 (Ctrl, Shift 클릭 지원)
  const handleRowClick = useCallback((e: React.MouseEvent, equipmentId: number, index: number) => {
    if (!onSelectEquipment || !onLastSelectedIndexChange) return;

    const isCtrlPressed = e.ctrlKey || e.metaKey;
    const isShiftPressed = e.shiftKey;

    // 시프트 클릭 시 텍스트 선택 방지
    if (isShiftPressed) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isCtrlPressed || isShiftPressed) {
      if (isCtrlPressed) {
        // Ctrl 클릭: 개별 토글
        const isCurrentlySelected = selectedEquipmentIds.includes(equipmentId);
        onSelectEquipment(equipmentId, !isCurrentlySelected);
        onLastSelectedIndexChange(index);
      } else if (isShiftPressed && lastSelectedIndex !== undefined && lastSelectedIndex >= 0) {
        // Shift 클릭: 범위 선택
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        const rangeIds = equipment.slice(start, end + 1).map(eq => eq.id);
        
        // 모든 범위 아이템을 선택 상태로 설정
        rangeIds.forEach(id => {
          onSelectEquipment(id, true);
        });
        
        onLastSelectedIndexChange(index);
      }
    } else {
      // 일반 클릭: 개별 토글
      const isCurrentlySelected = selectedEquipmentIds.includes(equipmentId);
      onSelectEquipment(equipmentId, !isCurrentlySelected);
      onLastSelectedIndexChange(index);
    }
  }, [onSelectEquipment, onLastSelectedIndexChange, selectedEquipmentIds, lastSelectedIndex, equipment]);

  // 키보드 단축키 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A: 전체 선택
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (onSelectAll) {
          onSelectAll(true);
        }
      }
      
      // Escape: 선택 해제
      if (e.key === 'Escape') {
        if (onSelectAll) {
          onSelectAll(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSelectAll]);

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
          <BaseTableHeaderCell>순번</BaseTableHeaderCell>
          <BaseTableHeaderCell>물품번호</BaseTableHeaderCell>
          <BaseTableHeaderCell>관리번호</BaseTableHeaderCell>
          <BaseTableHeaderCell>제조사</BaseTableHeaderCell>
          <BaseTableHeaderCell>모델명</BaseTableHeaderCell>
          <BaseTableHeaderCell>유형</BaseTableHeaderCell>
          <BaseTableHeaderCell>일련번호</BaseTableHeaderCell>
          <BaseTableHeaderCell>상태</BaseTableHeaderCell>
          <BaseTableHeaderCell>대여자</BaseTableHeaderCell>
          <BaseTableHeaderCell>생산년도</BaseTableHeaderCell>
          <BaseTableHeaderCell>구매일</BaseTableHeaderCell>
          <BaseTableHeaderCell>구매가격</BaseTableHeaderCell>
          <BaseTableHeaderCell>등록일시</BaseTableHeaderCell>
          <BaseTableHeaderCell>작업</BaseTableHeaderCell>
        </BaseTableRow>
      </BaseTableHead>
      <BaseTableBody>
        {equipment.map((item, index) => (
          <SelectableTableRow
            key={item.id}
            isSelected={selectedEquipmentIds.includes(item.id)}
            onSelect={(e) => handleRowClick(e, item.id, index)}
          >
            <BaseTableCell className="text-center font-medium">
              {index + 1}
            </BaseTableCell>
            <BaseTableCell>{item.asset_number}</BaseTableCell>
            <BaseTableCell>{item.management_number || '-'}</BaseTableCell>
            <BaseTableCell>{item.manufacturer || '-'}</BaseTableCell>
            <BaseTableCell>{item.model_name || '-'}</BaseTableCell>
            <BaseTableCell>{item.equipment_type_display || '-'}</BaseTableCell>
            <BaseTableCell>{item.serial_number || '-'}</BaseTableCell>
            <BaseTableCell>{getStatusBadge(item.status)}</BaseTableCell>
            <BaseTableCell>
              {item.status === 'RENTED' && item.rental?.user ? (
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {item.rental.user.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ({item.rental.user.username})
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">-</span>
              )}
            </BaseTableCell>
            <BaseTableCell>{item.manufacture_year || '-'}</BaseTableCell>
            <BaseTableCell>{formatDate(item.purchase_date)}</BaseTableCell>
            <BaseTableCell>{formatPrice(item.purchase_price)}</BaseTableCell>
            <BaseTableCell>{formatDateTime(item.created_at)}</BaseTableCell>
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
          </SelectableTableRow>
        ))}
      </BaseTableBody>
    </BaseTable>
  );
} 