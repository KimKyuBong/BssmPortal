'use client';

import React, { useCallback } from 'react';
import { BaseTableRow, BaseTableCell } from '@/components/ui/StyledComponents';

interface SelectableTableRowProps {
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  className?: string;
}

export default function SelectableTableRow({
  children,
  isSelected,
  onSelect,
  className = ''
}: SelectableTableRowProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    // 버튼이나 링크 클릭 시에는 선택하지 않음
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[role="button"]')) {
      return;
    }
    
    // 시프트 클릭 시 텍스트 선택 방지
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    onSelect(e);
  }, [onSelect]);

  return (
    <BaseTableRow
      onClick={handleClick}
      className={`
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
        ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
        cursor-pointer transition-colors duration-150
        ${className}
      `}
    >
      {children}
    </BaseTableRow>
  );
}
