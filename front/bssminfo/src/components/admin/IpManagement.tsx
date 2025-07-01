import React, { useState, useMemo } from 'react';
import { 
  Download, Laptop, Trash2, Power
} from 'lucide-react';
import { Device } from '@/services/ip';
import { 
  Card, 
  Heading, 
  Text, 
  Button,
  BaseTableCell
} from '@/components/ui/StyledComponents';
import SearchBar, { SearchOption } from '@/components/ui/SearchBar';
import SelectableTable from '@/components/ui/SelectableTable';
import Pagination from '@/components/ui/Pagination';

interface DeviceManagementProps {
  devices: Device[];
  loading?: boolean;
  error?: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedDevices: number[];
  selectedCount?: number;
  onSelectDevices: (deviceIds: number[]) => void;
  onDeleteDevice: (deviceId: number) => Promise<boolean>;
  onToggleActive: (deviceId: number) => Promise<boolean>;
  onBulkToggleActive: (activate: boolean) => Promise<boolean>;
  onBulkDelete: () => Promise<boolean>;
  onExportToExcel: () => boolean;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onSearch?: () => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

export default function DeviceManagement({
  devices,
  loading,
  error,
  searchTerm,
  onSearchChange,
  selectedDevices,
  selectedCount,
  onSelectDevices,
  onDeleteDevice,
  onToggleActive,
  onBulkToggleActive,
  onBulkDelete,
  onExportToExcel,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  onSearch,
  pageSize,
  onPageSizeChange
}: DeviceManagementProps) {
  // 검색 필드 상태
  const [searchField, setSearchField] = useState<string>('all');

  // 검색 옵션 정의
  const searchOptions: SearchOption[] = [
    { value: 'all', label: '전체' },
    { value: 'device_name', label: '기기명' },
    { value: 'mac_address', label: 'MAC 주소' },
    { value: 'assigned_ip', label: 'IP 주소' },
    { value: 'owner_name', label: '소유자 이름' },
    { value: 'owner_id', label: '소유자 ID' },
    { value: 'is_active', label: '상태' }
  ];

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      if (!searchTerm) return true;
      
      const searchValue = searchTerm.toLowerCase();
      switch (searchField) {
        case 'device_name':
          return device.device_name?.toLowerCase().includes(searchValue) ?? false;
        case 'mac_address':
          return device.mac_address?.toLowerCase().includes(searchValue) ?? false;
        case 'assigned_ip':
          return device.assigned_ip?.toLowerCase().includes(searchValue) ?? false;
        case 'owner_name':
          return device.user_full_name?.toLowerCase().includes(searchValue) ?? false;
        case 'owner_id':
          return device.username?.toLowerCase().includes(searchValue) ?? false;
        case 'is_active':
          return (device.is_active ? '활성' : '비활성').includes(searchValue);
        default:
          // 전체 검색
          return (
            device.device_name?.toLowerCase().includes(searchValue) ||
            device.mac_address?.toLowerCase().includes(searchValue) ||
            device.assigned_ip?.toLowerCase().includes(searchValue) ||
            device.user_full_name?.toLowerCase().includes(searchValue) ||
            device.username?.toLowerCase().includes(searchValue) ||
            (device.is_active ? '활성' : '비활성').includes(searchValue)
          );
      }
    });
  }, [devices, searchField, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 카드 */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Heading level={3}>장치 검색</Heading>
          <Button
            onClick={onExportToExcel}
            variant="success"
            size="sm"
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            엑셀로 내보내기
          </Button>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onSearch={onSearch || (() => {})}
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchOptions={searchOptions}
          placeholder="장치를 검색하세요"
          className="w-full"
        />
      </Card>

      {/* 다중 선택 안내 */}
      <Card>
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <Text className="text-sm text-blue-800 dark:text-blue-300">
            <strong>다중 선택 기능:</strong> Ctrl/⌘ + 클릭: 개별 선택/해제 토글 | Shift + 클릭: 마지막으로 선택한 항목과 현재 항목 사이의 모든 항목 선택
          </Text>
        </div>
      </Card>

      {/* 선택된 장치가 있을 때 표시되는 액션 바 */}
      {selectedCount !== undefined && selectedCount > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{selectedCount}개</span>의 장치가 선택됨
            </Text>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onBulkToggleActive(true)}
                variant="primary"
                size="sm"
                className="flex items-center"
              >
                <Power className="w-3 h-3 mr-1" />
                일괄 활성화
              </Button>
              <Button
                onClick={() => onBulkToggleActive(false)}
                variant="warning"
                size="sm"
                className="flex items-center"
              >
                <Power className="w-3 h-3 mr-1" />
                일괄 비활성화
              </Button>
              <Button
                onClick={onBulkDelete}
                variant="danger"
                size="sm"
                className="flex items-center"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                선택 장치 삭제
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* 테이블 카드 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>장치 목록</Heading>
          {totalCount !== undefined && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              총 {totalCount}개의 장치
            </Text>
          )}
        </div>
        
        <SelectableTable
          data={filteredDevices}
          selectedItems={selectedDevices}
          onSelectionChange={onSelectDevices}
          headers={[
            { key: 'device_name', label: '기기명' },
            { key: 'mac_address', label: 'MAC 주소' },
            { key: 'assigned_ip', label: 'IP 주소' },
            { key: 'owner', label: '소유자' },
            { key: 'status', label: '상태' },
            { key: 'created_at', label: '등록 날짜' },
            { key: 'actions', label: '작업' }
          ]}
          getItemId={(item) => item.id}
          renderRow={(device, isSelected, onClick) => (
            <>
              <BaseTableCell className="text-gray-900 dark:text-gray-100">
                {device.device_name || '-'}
              </BaseTableCell>
              <BaseTableCell className="text-gray-500 dark:text-gray-400">
                {device.mac_address || '-'}
              </BaseTableCell>
              <BaseTableCell className="text-gray-500 dark:text-gray-400">
                {device.assigned_ip || '미할당'}
              </BaseTableCell>
              <BaseTableCell className="text-gray-500 dark:text-gray-400">
                {device.user_full_name ? `${device.user_full_name} (${device.username})` : device.username || '미지정'}
              </BaseTableCell>
              <BaseTableCell>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${device.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                  {device.is_active ? '활성' : '비활성'}
                </span>
              </BaseTableCell>
              <BaseTableCell className="text-gray-500 dark:text-gray-400">
                {device.created_at ? new Date(device.created_at).toLocaleDateString('ko-KR') : '-'}
              </BaseTableCell>
              <BaseTableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleActive(device.id);
                    }}
                    variant="secondary"
                    size="sm"
                    className="flex items-center"
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {device.is_active ? '비활성화' : '활성화'}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDevice(device.id);
                    }}
                    variant="danger"
                    size="sm"
                    className="flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    삭제
                  </Button>
                </div>
              </BaseTableCell>
            </>
          )}
          emptyMessage="등록된 기기가 없거나 검색 결과가 없습니다."
        />
        
        {/* 페이지네이션 */}
        {totalPages && totalPages > 1 && onPageChange && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage || 1}
              totalPages={totalPages}
              totalItems={totalCount || 0}
              pageSize={pageSize || 10}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
} 