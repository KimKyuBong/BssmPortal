import React, { useState } from 'react';
import { BaseTable, BaseTableHead, BaseTableHeaderCell, BaseTableBody, BaseTableRow, BaseTableCell, Text } from './StyledComponents';

interface SelectableTableProps<T> {
  data: T[];
  selectedItems: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  renderRow: (item: T, isSelected: boolean, onClick: (event: React.MouseEvent<HTMLTableRowElement>) => void) => React.ReactNode;
  headers: Array<{ key: string; label: string }>;
  getItemId: (item: T) => number;
  className?: string;
  emptyMessage?: string;
}

export default function SelectableTable<T>({
  data,
  selectedItems,
  onSelectionChange,
  renderRow,
  headers,
  getItemId,
  className = '',
  emptyMessage = '데이터가 없습니다.'
}: SelectableTableProps<T>) {
  const [lastSelectedItem, setLastSelectedItem] = useState<number | null>(null);

  const handleRowClick = (item: T, event: React.MouseEvent<HTMLTableRowElement>) => {
    const itemId = getItemId(item);
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    if (isCtrlPressed) {
      // Ctrl/⌘ + 클릭: 개별 선택/해제 토글
      onSelectionChange(
        selectedItems.includes(itemId) 
          ? selectedItems.filter(id => id !== itemId)
          : [...selectedItems, itemId]
      );
      setLastSelectedItem(itemId);
    } else if (isShiftPressed && lastSelectedItem !== null) {
      // Shift + 클릭: 범위 선택
      const lastIndex = data.findIndex(item => getItemId(item) === lastSelectedItem);
      const currentIndex = data.findIndex(item => getItemId(item) === itemId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeIds = data.slice(startIndex, endIndex + 1).map(item => getItemId(item));
        
        const newSelection = [...selectedItems];
        rangeIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        onSelectionChange(newSelection);
      }
    } else {
      // 일반 클릭: 단일 선택
      onSelectionChange([itemId]);
      setLastSelectedItem(itemId);
    }
  };

  return (
    <BaseTable className={className}>
      <BaseTableHead>
        <BaseTableRow>
          {headers.map(header => (
            <BaseTableHeaderCell key={header.key}>
              {header.label}
            </BaseTableHeaderCell>
          ))}
        </BaseTableRow>
      </BaseTableHead>
      <BaseTableBody>
        {data.map((item) => {
          const itemId = getItemId(item);
          const isSelected = selectedItems.includes(itemId);
          
          return (
            <BaseTableRow 
              key={itemId}
              isSelected={isSelected}
              onClick={(e) => handleRowClick(item, e)}
            >
              {renderRow(item, isSelected, (e) => handleRowClick(item, e))}
            </BaseTableRow>
          );
        })}
        
        {data.length === 0 && (
          <BaseTableRow>
            <BaseTableCell 
              colSpan={headers.length} 
              className="text-center text-secondary"
            >
              {emptyMessage}
            </BaseTableCell>
          </BaseTableRow>
        )}
      </BaseTableBody>
    </BaseTable>
  );
} 