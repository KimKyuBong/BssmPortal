'use client';

import React from 'react';
import { Button, Select, Input } from '@/components/ui/StyledComponents';

interface EquipmentSearchFilterProps {
  searchType: string;
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  onSearchTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onTypeFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onResetFilters: () => void;
  onFilter: () => void;
}

export default function EquipmentSearchFilter({
  searchType,
  searchQuery,
  statusFilter,
  typeFilter,
  onSearchTypeChange,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onResetFilters,
  onFilter
}: EquipmentSearchFilterProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={searchType}
          onChange={onSearchTypeChange}
          label="검색 항목"
          options={[
            { value: "all", label: "통합 검색" },
            { value: "asset_number", label: "물품번호" },
            { value: "manufacturer", label: "제조사" },
            { value: "model_name", label: "모델명" },
            { value: "serial_number", label: "시리얼 번호" },
            { value: "description", label: "설명" },
            { value: "rental_user", label: "대여자" },
            { value: "manufacture_year", label: "생산년도" },
            { value: "purchase_date", label: "구매일" },
            { value: "acquisition_date", label: "취득일" }
          ]}
          className="w-40"
        />
        <Input
          type="text"
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="검색어를 입력하세요"
          className="w-64"
        />
        <Button
          variant="primary"
          onClick={onFilter}
        >
          검색
        </Button>
        <Select
          value={statusFilter}
          onChange={onStatusFilterChange}
          label="상태 필터"
          options={[
            { value: "", label: "전체" },
            { value: "AVAILABLE", label: "대여 가능" },
            { value: "RENTED", label: "대여 중" },
            { value: "MAINTENANCE", label: "점검 중" },
            { value: "BROKEN", label: "파손" },
            { value: "LOST", label: "분실" },
            { value: "DISPOSED", label: "폐기" }
          ]}
          className="w-32"
        />
        <Select
          value={typeFilter}
          onChange={onTypeFilterChange}
          label="유형 필터"
          options={[
            { value: "", label: "전체" },
            { value: "LAPTOP", label: "노트북" },
            { value: "MACBOOK", label: "맥북" },
            { value: "TABLET", label: "태블릿" },
            { value: "DESKTOP", label: "데스크톱" },
            { value: "MONITOR", label: "모니터" },
            { value: "PRINTER", label: "프린터" },
            { value: "PROJECTOR", label: "프로젝터" },
            { value: "OTHER", label: "기타" }
          ]}
          className="w-32"
        />
        <Button
          variant="secondary"
          onClick={onResetFilters}
        >
          필터 초기화
        </Button>
      </div>
    </div>
  );
} 