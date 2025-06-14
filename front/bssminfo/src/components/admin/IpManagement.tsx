import React, { useState, useMemo } from 'react';
import { 
  Search, Download, Laptop, Trash2, Power, X,
  ChevronDown
} from 'lucide-react';
import { Device } from '@/services/ip';

interface DeviceManagementProps {
  devices: Device[];
  loading?: boolean;
  error?: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedDevices: Record<number, boolean>;
  selectedCount?: number;
  selectedList?: Device[];
  onSelectDevice: (deviceId: number, event: React.MouseEvent) => void;
  onDeleteDevice: (deviceId: number) => Promise<boolean>;
  onToggleActive: (deviceId: number) => Promise<boolean>;
  onBulkToggleActive: (activate: boolean) => Promise<boolean>;
  onBulkDelete: () => Promise<boolean>;
  onExportToExcel: () => boolean;
}

export default function DeviceManagement({
  devices,
  loading,
  error,
  searchTerm,
  onSearchChange,
  selectedDevices,
  selectedCount,
  selectedList,
  onSelectDevice,
  onDeleteDevice,
  onToggleActive,
  onBulkToggleActive,
  onBulkDelete,
  onExportToExcel
}: DeviceManagementProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // 필터 상태 추가
  const [filters, setFilters] = useState({
    deviceName: '',
    macAddress: '',
    ipAddress: '',
    owner: '',
    status: '',
    lastAccess: ''
  });

  const [searchField, setSearchField] = useState<string>('device_name');
  const [searchValue, setSearchValue] = useState<string>('');

  const searchFields = [
    { value: 'device_name', label: '기기명' },
    { value: 'mac_address', label: 'MAC 주소' },
    { value: 'assigned_ip', label: 'IP 주소' },
    { value: 'owner_name', label: '소유자 이름' },
    { value: 'owner_id', label: '소유자 ID' },
    { value: 'is_active', label: '상태' }
  ];

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      if (!searchValue) return true;
      
      const searchTerm = searchValue.toLowerCase();
      switch (searchField) {
        case 'device_name':
          return device.device_name?.toLowerCase().includes(searchTerm) ?? false;
        case 'mac_address':
          return device.mac_address?.toLowerCase().includes(searchTerm) ?? false;
        case 'assigned_ip':
          return device.assigned_ip?.toLowerCase().includes(searchTerm) ?? false;
        case 'owner_name':
          return device.user_full_name?.toLowerCase().includes(searchTerm) ?? false;
        case 'owner_id':
          return device.username?.toLowerCase().includes(searchTerm) ?? false;
        case 'is_active':
          return (device.is_active ? '활성' : '비활성').includes(searchTerm);
        default:
          return true;
      }
    });
  }, [devices, searchField, searchValue]);

  const handleDeviceClick = (device: Device, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onSelectDevice(device.id, e);
    } else {
      setSelectedDevice(device);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-end items-center mb-6">
        <div className="flex space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="장치 검색..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          <button
            onClick={onExportToExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            엑셀로 내보내기
          </button>
        </div>
      </div>

      {/* 검색 필드 선택 및 검색어 입력 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">검색 필드</label>
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            {searchFields.map(field => (
              <option key={field.value} value={field.value}>{field.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">검색어</label>
          <input
            type="text"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            placeholder="검색어를 입력하세요"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>
      
      {/* 다중 선택 안내 */}
      <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">장치 다중 선택 기능</span>
        </div>
        <ul className="list-disc ml-8 mt-1">
          <li><strong>Ctrl/⌘ + 클릭</strong>: 개별 장치 선택/해제 토글</li>
          <li><strong>Shift + 클릭</strong>: 마지막으로 선택한 장치와 현재 장치 사이의 모든 장치 선택</li>
        </ul>
      </div>
      
      {/* 선택된 장치에 대한 일괄 작업 버튼 */}
      {selectedCount && (
        <div className="bg-gray-50 p-3 rounded-md mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{selectedCount}개</span>의 장치가 선택됨
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onBulkToggleActive(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Power className="w-3 h-3 mr-1" />
                일괄 활성화
              </button>
              <button
                onClick={() => onBulkToggleActive(false)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <Power className="w-3 h-3 mr-1" />
                일괄 비활성화
              </button>
              <button
                onClick={onBulkDelete}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                선택 장치 삭제
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기기명
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MAC 주소
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP 주소
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                소유자
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                최종 수정일
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록 날짜
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDevices.map((device) => {
              const isSelected = selectedDevices[device.id] === true;
              return (
                <tr 
                  key={device.id} 
                  className={`${isSelected ? 'bg-blue-200 border-l-4 border-blue-500' : ''} hover:bg-gray-100 cursor-pointer`}
                  onClick={(e) => handleDeviceClick(device, e)}
                >
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.device_name}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.mac_address}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.assigned_ip || '미할당'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.user_full_name ? `${device.user_full_name} (${device.username})` : '미지정'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {device.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.last_access ? new Date(device.last_access).toLocaleString() : '기록 없음'}
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.created_at ? new Date(device.created_at).toLocaleString() : '기록 없음'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleActive(device.id);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {device.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDevice(device.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredDevices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                  등록된 기기가 없거나 검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 장치 상세정보 모달 */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold">장치 상세 정보</h2>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">기기 정보</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.device_name || '이름 없음'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">장치 ID</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">MAC 주소</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.mac_address || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">IP 주소</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.assigned_ip || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">소유자</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.user_full_name ? `${selectedDevice.user_full_name} (${selectedDevice.username})` : '미할당'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">상태</h3>
                    <p className={`mt-1 text-sm ${
                      selectedDevice.is_active ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedDevice.is_active ? '활성' : '비활성'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">최종 수정일</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedDevice.last_access ? new Date(selectedDevice.last_access).toLocaleString() : '기록 없음'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">등록 날짜</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedDevice.created_at ? new Date(selectedDevice.created_at).toLocaleString() : '기록 없음'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      onToggleActive(selectedDevice.id);
                      setSelectedDevice(null);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedDevice.is_active 
                        ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    <Power className="h-4 w-4 inline mr-1" />
                    {selectedDevice.is_active ? '비활성화' : '활성화'}
                  </button>
                  <button
                    onClick={() => {
                      onDeleteDevice(selectedDevice.id);
                      setSelectedDevice(null);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 