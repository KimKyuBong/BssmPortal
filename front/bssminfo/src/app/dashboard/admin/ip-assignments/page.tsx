'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Heading, 
  Text, 
  Alert
} from '@/components/ui/StyledComponents';
import SearchBar, { SearchOption } from '@/components/ui/SearchBar';
import IpAssignmentTable from '@/components/admin/IpAssignmentTable';
import Pagination from '@/components/ui/Pagination';
import useIpAssignments from '@/hooks/useIpAssignments';

export default function AdminIpAssignmentsPage() {
  const [searchField, setSearchField] = useState<string>('all');
  
  const {
    deviceHistory,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    handleSearch,
    handleDeleteAssignment,
    extractIpAddress
  } = useIpAssignments();

  // 검색 옵션 정의
  const searchOptions: SearchOption[] = [
    { value: 'all', label: '전체' },
    { value: 'mac_address', label: 'MAC 주소' },
    { value: 'ip_address', label: 'IP 주소' },
    { value: 'device_name', label: '장치 이름' },
    { value: 'username', label: '사용자' },
    { value: 'created_at', label: '등록일' }
  ];

  return (
    <div className="p-4 lg:p-6">
      <Heading level={1} className="mb-6">IP 할당 내역</Heading>
      
      {/* 검색 영역 */}
      <Card className="mb-6">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchOptions={searchOptions}
          placeholder="검색어를 입력하세요"
          className="w-full"
        />
      </Card>

      {error && (
        <Alert type="error" message={error} className="mb-4" />
      )}

      {/* 테이블 카드 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>IP 할당 내역</Heading>
          {totalCount !== undefined && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              총 {totalCount}개의 할당 내역
            </Text>
          )}
        </div>
        
        <IpAssignmentTable
          deviceHistory={deviceHistory}
          loading={loading}
          onDeleteAssignment={handleDeleteAssignment}
          extractIpAddress={extractIpAddress}
        />
        
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount || 0}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
} 