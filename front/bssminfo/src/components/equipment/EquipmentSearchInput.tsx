import React from 'react';
import { Input } from '@/components/ui/StyledComponents';

interface EquipmentSearchInputProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EquipmentSearchInput: React.FC<EquipmentSearchInputProps> = ({
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="mb-2">
      <div className="relative">
        <Input
          type="text"
          placeholder="검색어를 입력하세요 (실시간 검색)"
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default EquipmentSearchInput; 