'use client';

import React, { useEffect, useState } from 'react';
import { Delete, Plus, RefreshCw, Shield, Laptop, X } from 'lucide-react';
import { BlacklistedIPResponse } from '@/services/admin';
import adminService from '@/services/admin';
import DeviceManagement from '@/components/admin/IpManagement';
import useIps from '@/hooks/useIps';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Heading, 
  Text, 
  Input, 
  Button, 
  Badge,
  Alert,
  Modal,
  Tabs,
  Tab
} from '@/components/ui/StyledComponents';

const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

export default function IpManagementPage() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // IP 블랙리스트 관련 상태
  const [blacklistedIPs, setBlacklistedIPs] = useState<string[]>([]);
  const [newIPAddress, setNewIPAddress] = useState('');
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  
  // 알림 상태 관리
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // 장치 관리 훅 사용
  const {
    devices,
    filteredDevices,
    loading: devicesLoading,
    error: devicesError,
    selectedDevices,
    selectedDeviceCount,
    selectedDeviceList,
    deviceSearchTerm,
    setDeviceSearchTerm,
    handleDeviceSelection,
    handleDeleteDevice,
    handleToggleDeviceActive,
    handleBulkToggleDeviceActive,
    handleBulkDeleteDevices,
    exportToExcel,
    fetchDevices,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    handlePageChange,
    handleSearch,
    handlePageSizeChange
  } = useIps();

  const router = useRouter();

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });
    
    // 6초 후 자동으로 숨기기
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
    if (tabIndex === 0) {
      fetchDevices(1, deviceSearchTerm);
    } else if (tabIndex === 1) {
      fetchBlacklistedIPs();
    }
  };

  // IP 블랙리스트 관련 함수들
  const fetchBlacklistedIPs = async () => {
    try {
      setBlacklistLoading(true);
      const response = await adminService.getBlacklistedIPs();
      if (response.success && response.data) {
        setBlacklistedIPs(response.data.blacklisted_ips || []);
      } else {
        showNotification(response.message || '블랙리스트된 IP 목록을 가져오는데 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('블랙리스트 IP 조회 오류:', err);
      showNotification('블랙리스트된 IP 목록을 가져오는데 실패했습니다.', 'error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  const handleAddToBlacklist = async () => {
    if (!newIPAddress) {
      showNotification('IP 주소를 입력해주세요.', 'warning');
      return;
    }

    // IP 주소 유효성 검사 (간단한 형식 체크)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(newIPAddress)) {
      showNotification('유효한 IP 주소 형식이 아닙니다.', 'error');
      return;
    }

    try {
      setBlacklistLoading(true);
      const response = await adminService.blacklistIP(newIPAddress);
      if (response.success) {
        showNotification(`IP 주소 ${newIPAddress}가 블랙리스트에 추가되었습니다.`, 'success');
        setNewIPAddress('');
        // 블랙리스트 목록 갱신
        await fetchBlacklistedIPs();
      } else {
        showNotification(response.message || 'IP 주소를 블랙리스트에 추가하는데 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('블랙리스트 추가 오류:', err);
      showNotification('IP 주소를 블랙리스트에 추가하는데 실패했습니다.', 'error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  const handleRemoveFromBlacklist = async (ipAddress: string) => {
    try {
      setBlacklistLoading(true);
      const response = await adminService.unblacklistIP(ipAddress);
      if (response.success) {
        showNotification(`IP 주소 ${ipAddress}가 블랙리스트에서 제거되었습니다.`, 'success');
        // 블랙리스트 목록 갱신
        await fetchBlacklistedIPs();
      } else {
        showNotification(response.message || 'IP 주소를 블랙리스트에서 제거하는데 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('블랙리스트 제거 오류:', err);
      showNotification('IP 주소를 블랙리스트에서 제거하는데 실패했습니다.', 'error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  // 새로운 선택 핸들러 (배열 기반)
  const handleDeviceSelectionChange = (deviceIds: number[]) => {
    // 기존 선택 상태를 배열로 변환하여 업데이트
    const newSelection: Record<number, boolean> = {};
    deviceIds.forEach(id => {
      newSelection[id] = true;
    });
    
    // useIps 훅의 선택 상태 업데이트
    Object.keys(newSelection).forEach(deviceId => {
      const id = parseInt(deviceId);
      if (!selectedDevices[id]) {
        handleDeviceSelection(id, {} as React.MouseEvent);
      }
    });
    
    // 선택 해제된 장치들 처리
    Object.keys(selectedDevices).forEach(deviceId => {
      const id = parseInt(deviceId);
      if (selectedDevices[id] && !deviceIds.includes(id)) {
        handleDeviceSelection(id, {} as React.MouseEvent);
      }
    });
  };

  useEffect(() => {
    // 초기 탭에 따라 데이터 로드
    if (activeTab === 0) {
      fetchDevices(1, deviceSearchTerm);
    } else {
      fetchBlacklistedIPs();
    }
  }, [activeTab]);

  return (
    <div className="p-4 lg:p-6">
      {/* 알림 표시 */}
      {notification.show && (
        <div className="mb-4">
          <Alert 
            type={notification.type} 
            message={notification.message}
            onClose={() => setNotification(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}

      <Heading level={1} className="mb-6">IP 관리</Heading>
      
      {/* 탭 네비게이션 */}
      <Tabs className="mb-6">
        <nav className="-mb-px flex space-x-8">
          <Tab
            active={activeTab === 0}
            onClick={() => handleTabChange(0)}
            icon={<Laptop className="w-4 h-4" />}
          >
            장치 관리
          </Tab>
          <Tab
            active={activeTab === 1}
            onClick={() => handleTabChange(1)}
            icon={<Shield className="w-4 h-4" />}
          >
            블랙리스트 관리
          </Tab>
        </nav>
      </Tabs>
      
      {/* 장치 관리 탭 */}
      {activeTab === 0 && (
        <DeviceManagement
          devices={filteredDevices}
          loading={devicesLoading}
          error={devicesError}
          searchTerm={deviceSearchTerm}
          onSearchChange={setDeviceSearchTerm}
          selectedDevices={Object.keys(selectedDevices).filter(id => selectedDevices[parseInt(id)]).map(id => parseInt(id))}
          selectedCount={selectedDeviceCount}
          onSelectDevices={handleDeviceSelectionChange}
          onDeleteDevice={handleDeleteDevice}
          onToggleActive={handleToggleDeviceActive}
          onBulkToggleActive={handleBulkToggleDeviceActive}
          onBulkDelete={handleBulkDeleteDevices}
          onExportToExcel={exportToExcel}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      
      {/* 블랙리스트 관리 탭 */}
      {activeTab === 1 && (
        <div className="space-y-6">
          {/* 블랙리스트 추가 카드 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Heading level={3} className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-500" />
                IP 블랙리스트 추가
              </Heading>
            </div>
            
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              블랙리스트에 추가된 IP 주소는 장치에 할당되지 않으며, 기존에 할당된 장치가 있다면 자동으로 새 IP가 할당됩니다.
            </Text>
            
            <div className="flex space-x-2">
              <Input
                placeholder="예: 10.129.50.88"
                value={newIPAddress}
                onChange={(e) => setNewIPAddress(e.target.value)}
                disabled={blacklistLoading}
                className="flex-1"
              />
              <Button
                onClick={handleAddToBlacklist}
                disabled={blacklistLoading}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </Button>
            </div>
          </Card>
          
          {/* 블랙리스트 목록 카드 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>블랙리스트 목록</Heading>
              <Button
                onClick={fetchBlacklistedIPs}
                disabled={blacklistLoading}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>새로고침</span>
              </Button>
            </div>
            
            {blacklistLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : blacklistedIPs.length === 0 ? (
              <Text className="text-center py-8 text-gray-500 dark:text-gray-400">
                블랙리스트에 등록된 IP 주소가 없습니다.
              </Text>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {blacklistedIPs.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <Text className="font-medium">{ip}</Text>
                    <Button
                      onClick={() => handleRemoveFromBlacklist(ip)}
                      disabled={blacklistLoading}
                      variant="danger"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Delete className="w-4 h-4" />
                      <span>제거</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          
          {/* 도움말 카드 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Heading level={3} className="flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 text-blue-500" />
                IP 관리 도움말
              </Heading>
            </div>
            
            <div className="space-y-3">
              <Text className="text-sm">
                이 페이지에서는 IP 주소 블랙리스트를 관리할 수 있습니다. 블랙리스트에 등록된 IP 주소는 어떤 사용자나 장치에도 할당되지 않습니다.
              </Text>
              <Text className="text-sm">
                이미 할당된 IP를 블랙리스트에 추가하면 해당 장치에는 자동으로 새로운 IP가 할당됩니다.
              </Text>
              <Text className="text-sm font-medium">IP 블랙리스트는 다음과 같은 경우에 유용합니다:</Text>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>문제가 발생한 IP 주소를 더 이상 할당하지 않도록 차단</li>
                <li>특정 범위의 IP를 다른 용도로 예약</li>
                <li>네트워크 문제 해결을 위한 IP 주소 격리</li>
              </ul>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 