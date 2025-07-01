import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input, Button, Select } from './StyledComponents';

export interface SearchOption {
  value: string;
  label: string;
}

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  searchField: string;
  onSearchFieldChange: (value: string) => void;
  searchOptions: SearchOption[];
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  searchTerm,
  onSearchChange,
  onSearch,
  searchField,
  onSearchFieldChange,
  searchOptions,
  placeholder = "검색어를 입력하세요",
  className = ""
}: SearchBarProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* 검색 항목 드롭박스 */}
      <div className="w-32">
        <Select
          value={searchField}
          onChange={(e) => onSearchFieldChange(e.target.value)}
          options={searchOptions}
          className="w-full"
        />
      </div>
      
      {/* 검색어 입력 */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          type="text"
          className="pl-10 w-full"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>
      
      {/* 검색 버튼 */}
      <Button
        onClick={onSearch}
        variant="primary"
        size="sm"
        className="flex items-center whitespace-nowrap"
      >
        <Search className="w-4 h-4 mr-2" />
        검색
      </Button>
    </div>
  );
} 