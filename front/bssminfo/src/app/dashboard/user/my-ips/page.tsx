'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import ipService from '@/services/ip';
import { Device } from '@/services/ip';
import Link from 'next/link';
import { LogOut, User, Search, Plus, Edit, Trash2, Laptop, ArrowLeft, Monitor, Wifi, WifiOff } from 'lucide-react';
import dnsService from '@/services/dns';
import StatsCard from '@/components/ui/StatsCard';
import DeviceTable from '@/components/ui/DeviceTable';
import BulkActionBar from '@/components/ui/BulkActionBar';
import DeviceRegistrationModal from '@/components/ui/DeviceRegistrationModal';
import { useToastContext } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/StyledComponents';

export default function MyIpsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // DNS 관련 상태 (백엔드에서 device.dns_info로 제공하므로 별도 상태 불필요)
  
  // 다중 선택 상태
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [lastSelectedDevice, setLastSelectedDevice] = useState<number | null>(null);
  
  // 통계 데이터
  const [stats, setStats] = useState<{
    totalDevices: number;
    activeDevices: number;
  }>({
    totalDevices: 0,
    activeDevices: 0
  });

  // MAC 주소 관련 상태
  const [macLoading, setMacLoading] = useState(false);
  const [macError, setMacError] = useState<string | null>(null);
  const [macAddress, setMacAddress] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);
  const [macParts, setMacParts] = useState<string[]>(['', '', '', '', '', '']);
  const [deviceName, setDeviceName] = useState('');
  
  // 장치 등록 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  // DNS 등록 신청 다이얼로그 상태
  const [dnsDialog, setDnsDialog] = useState<{ open: boolean; ip: string; mac: string; deviceName: string; isResubmit?: boolean; requestId?: number } | null>(null);
  const [dnsForm, setDnsForm] = useState({ domain: '', reason: '' });
  const [dnsSubmitting, setDnsSubmitting] = useState(false);
  
  // 거절 사유 보기 다이얼로그 상태
  const [rejectReasonDialog, setRejectReasonDialog] = useState<{ open: boolean; reason: string; domain: string; ip: string } | null>(null);

  // MAC 주소 입력 관련 핸들러
  const handleMacPartChange = (index: number, value: string) => {
    // 16진수 문자만 허용 (0-9, A-F, a-f)
    const cleanValue = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    
    // 최대 2자리까지만 허용
    const truncatedValue = cleanValue.substring(0, 2);
    
    // 새 MAC 부분 배열 생성
    const newMacParts = [...macParts];
    newMacParts[index] = truncatedValue;
    setMacParts(newMacParts);
    
    // 전체 MAC 주소 업데이트
    const fullMac = newMacParts.join(':');
    setMacAddress(fullMac);
    
    // 유효성 검사
    if (fullMac.length === 17) {
      if (!validateMacAddress(fullMac)) {
        setMacError('올바른 MAC 주소 형식이 아닙니다.');
      } else {
        setMacError(null);
      }
    } else if (fullMac.replace(/:/g, '').length > 0) {
      setMacError('MAC 주소를 완성해주세요.');
    } else {
      setMacError(null);
    }
    
    // 자동으로 다음 입력 필드로 포커스 이동 (2자리 입력 완료 시)
    if (truncatedValue.length === 2 && index < 5) {
      const nextInput = document.getElementById(`macPart-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };
  
  // 키 입력 핸들러 (백스페이스 처리)
  const handleMacPartKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 백스페이스 키를 누른 상태로 현재 입력 필드가 비어있을 때 이전 필드로 이동
    if (e.key === 'Backspace' && macParts[index] === '' && index > 0) {
      const prevInput = document.getElementById(`macPart-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };
  
  // MAC 주소 유효성 검사 함수
  const validateMacAddress = (mac: string): boolean => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  };

  // DNS 상태 확인 함수 (백엔드 dns_info 사용)
  const getDnsInfo = (device: Device) => {
    return device.dns_info || { status: 'none' };
  };

  // DNS 도메인 삭제 함수
  const handleDeleteDomain = async (recordId: number) => {
    try {
      const response = await dnsService.deleteMyRecord(recordId);
      if (response.success) {
        showSuccess('도메인 삭제 완료', '도메인이 삭제되었습니다.');
        
        // 삭제된 레코드 ID와 일치하는 기기의 DNS 정보를 즉시 업데이트
        setDevices(prevDevices => 
          prevDevices.map(device => {
            if (device.dns_info?.record_id === recordId) {
              return {
                ...device,
                dns_info: { status: 'none' }
              };
            }
            return device;
          })
        );
      } else {
        showError('도메인 삭제 실패', '도메인 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('도메인 삭제 오류:', error);
      let errorMessage = '도메인 삭제 중 오류가 발생했습니다.';
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      showError('도메인 삭제 오류', errorMessage);
    }
  };

  // DNS 삭제 함수 (DeviceTable에서 호출)
  const handleDnsDelete = async (device: Device) => {
    const dnsInfo = getDnsInfo(device);
    if (dnsInfo.status === 'approved' && dnsInfo.request_id) {
      try {
        const response = await dnsService.deleteMyRecord(dnsInfo.request_id);
        if (response.success) {
          showSuccess('DNS 삭제 완료', '도메인이 성공적으로 삭제되었습니다.');
          
          // 기기 목록 새로고침
          const devicesResponse = await ipService.getMyIps();
          if (devicesResponse.success) {
            setDevices(devicesResponse.data || []);
          }
        } else {
          showError('DNS 삭제 실패', '도메인 삭제에 실패했습니다.');
        }
      } catch (error: any) {
        console.error('DNS 삭제 오류:', error);
        let errorMessage = '도메인 삭제 중 오류가 발생했습니다.';
        if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        }
        showError('DNS 삭제 오류', errorMessage);
      }
    }
  };

  // SSL 인증서 다운로드 함수
  const handleSslDownload = async (device: Device) => {
    const dnsInfo = getDnsInfo(device);
    if (dnsInfo.status === 'approved' && dnsInfo.domain) {
      try {
        // SSL 패키지 다운로드 API 호출
        const response = await dnsService.downloadSslPackage(dnsInfo.domain);
        if (response && response.data) {
          // ZIP 파일로 다운로드
          const blob = new Blob([response.data], { type: 'application/zip' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${dnsInfo.domain}_ssl_package.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showSuccess('SSL 패키지 다운로드 완료', '매번 새로운 개인키가 생성되며, 이전에 받은 인증서는 사용할 수 없습니다.');
        } else {
          showError('SSL 패키지 다운로드 실패', '패키지 다운로드에 실패했습니다.');
        }
      } catch (error: any) {
        console.error('SSL 패키지 다운로드 오류:', error);
        let errorMessage = '패키지 다운로드 중 오류가 발생했습니다.';
        if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        }
        showError('SSL 패키지 다운로드 오류', errorMessage);
      }
    }
  };
  
  // 기기 등록 모달 열기
  const openRegisterModal = () => {
    setShowModal(true);
    setMacAddress('');
    setMacParts(['', '', '', '', '', '']);
    setDeviceName('');
    setMacError(null);
    setIsManualInput(false);
    setRegistering(false);
    
    // 현재 MAC 주소 가져오기
    fetchCurrentMac();
  };
  
  // 기기 등록 처리
  const handleRegisterDevice = async (macAddress: string, deviceName: string) => {
    // 입력 검증
    if (!macAddress || !validateMacAddress(macAddress)) {
      setMacError('유효한 MAC 주소를 입력해주세요.');
      return;
    }
    
    if (!deviceName.trim()) {
      showError('입력 오류', '기기 이름을 입력해주세요.');
      return;
    }
    
    try {
      setRegistering(true);
      
      // 장치 등록 API 호출
      const response = await ipService.registerIp({
        mac_address: macAddress,
        device_name: deviceName
      });
      
      if (response.success) {
        showSuccess('기기 등록 완료', '기기가 성공적으로 등록되었습니다.');
        setShowModal(false);
        
        // 장치 목록 새로고침
        const devicesResponse = await ipService.getMyIps();
        if (devicesResponse.success) {
          setDevices(devicesResponse.data || []);
          
          // 통계 업데이트
          const activeDevices = devicesResponse.data?.filter((d: Device) => d.is_active).length || 0;
          setStats({
            totalDevices: devicesResponse.data?.length || 0,
            activeDevices
          });
        }
      } else {
        showError('기기 등록 실패', typeof response.error === 'string' ? response.error : '기기 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('Register device error:', err);
      showError('기기 등록 오류', '기기 등록 중 오류가 발생했습니다.');
    } finally {
      setRegistering(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자 정보 가져오기
        const userResponse = await authService.getCurrentUser();
        if (!userResponse.success) {
          router.push('/login/');
          return;
        }
        
        setUser(userResponse.data);
        
        // 교사 본인의 장치 목록 가져오기
        const devicesResponse = await ipService.getMyIps();
        if (devicesResponse.success) {
          setDevices(devicesResponse.data || []);
          
          // 통계 계산
          const activeDevices = devicesResponse.data?.filter((d: Device) => d.is_active).length || 0;
          setStats({
            totalDevices: devicesResponse.data?.length || 0,
            activeDevices
          });
        }

        // DNS 정보는 백엔드에서 dns_info 필드로 제공됨
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);
  
  const handleToggleDeviceActive = async (deviceId: number, currentStatus: boolean) => {
    try {
      const response = await ipService.toggleIpActive(deviceId);
      if (response.success) {
        // 장치 목록 업데이트
        setDevices(devices.map(device => 
          device.id === deviceId 
            ? { ...device, is_active: !currentStatus } 
            : device
        ));
        
        // 통계 업데이트
        const activeDevices = devices
          .map(device => device.id === deviceId ? { ...device, is_active: !currentStatus } : device)
          .filter(d => d.is_active).length;
        
        setStats(prev => ({
          ...prev,
          activeDevices
        }));
        
        // 성공 메시지 표시
        if (response.message) {
          showSuccess('장치 상태 변경 완료', response.message);
        }
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 상태 변경에 실패했습니다.';
        setError(errorMessage);
        showError('장치 상태 변경 실패', errorMessage);
      }
    } catch (err) {
      setError('장치 상태 변경 중 오류가 발생했습니다.');
      console.error('Toggle device error:', err);
      showError('장치 상태 변경 오류', '장치 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteDevice = async (deviceId: number) => {
    // confirm 대신 토스트로 확인 메시지 표시하고 바로 삭제 처리
    showError('기기 삭제', '정말로 이 기기를 삭제하시겠습니까?');
    
    try {
      const response = await ipService.deleteIp(deviceId);
      if (response.success) {
        // 장치 목록에서 제거
        setDevices(devices.filter(device => device.id !== deviceId));
        
        // 통계 업데이트
        const remainingDevices = devices.filter(device => device.id !== deviceId);
        const activeDevices = remainingDevices.filter(d => d.is_active).length;
        setStats({
          totalDevices: remainingDevices.length,
          activeDevices
        });
        
        showSuccess('기기 삭제 완료', '기기가 삭제되었습니다.');
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 삭제에 실패했습니다.';
        setError(errorMessage);
        showError('기기 삭제 실패', errorMessage);
      }
    } catch (err) {
      setError('장치 삭제 중 오류가 발생했습니다.');
      console.error('Delete device error:', err);
      showError('기기 삭제 오류', '장치 삭제 중 오류가 발생했습니다.');
    }
  };

  // 장치 일괄 활성화/비활성화 함수
  const handleBulkToggleDeviceActive = async (deviceIds: number[], setActive: boolean) => {
    try {
      // 모든 장치에 대해 상태 변경 처리
      const promises = deviceIds.map(deviceId => {
        const device = devices.find(d => d.id === deviceId);
        // 현재 상태와 다른 경우에만 변경
        if (device && device.is_active !== setActive) {
          return ipService.toggleIpActive(deviceId);
        }
        return Promise.resolve({ success: true }); // 이미 원하는 상태인 경우 변경 없이 성공 처리
      });
      
      const results = await Promise.all(promises);
      const success = results.every((result: any) => result.success);
      
      if (success) {
        // 장치 목록 상태 업데이트
        const updatedDevices = devices.map(device => 
          deviceIds.includes(device.id) 
            ? { ...device, is_active: setActive } 
            : device
        );
        setDevices(updatedDevices);
        
        // 통계 업데이트
        const activeDevices = updatedDevices.filter(d => d.is_active).length;
        setStats(prev => ({
          ...prev,
          activeDevices
        }));
        
        showSuccess('일괄 작업 완료', `${deviceIds.length}개의 기기 상태가 변경되었습니다.`);
        setSelectedDevices([]); // 선택 초기화
      } else {
        setError('일부 기기의 상태 변경에 실패했습니다.');
      }
    } catch (err) {
      setError('기기 상태 일괄 변경 중 오류가 발생했습니다.');
      console.error('Bulk toggle device error:', err);
    }
  };

  // 장치 일괄 삭제 함수
  const handleBulkDeleteDevices = async (deviceIds: number[]) => {
    try {
      // 모든 장치에 대해 삭제 처리
      const promises = deviceIds.map(deviceId => ipService.deleteIp(deviceId));
      const results = await Promise.all(promises);
      const success = results.every((result: any) => result.success);
      
      if (success) {
        // 장치 목록에서 제거
        const updatedDevices = devices.filter(device => !deviceIds.includes(device.id));
        setDevices(updatedDevices);
        
        // 통계 업데이트
        const activeDevices = updatedDevices.filter(d => d.is_active).length;
        setStats({
          totalDevices: updatedDevices.length,
          activeDevices
        });
        
        showSuccess('일괄 작업 완료', `${deviceIds.length}개의 기기가 삭제되었습니다.`);
        setSelectedDevices([]); // 선택 초기화
      } else {
        setError('일부 기기의 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('기기 일괄 삭제 중 오류가 발생했습니다.');
      console.error('Bulk delete device error:', err);
    }
  };

  // 장치 선택 핸들러 (다중 선택 지원)
  const handleDeviceSelection = (deviceId: number, event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) => {
    // Ctrl/⌘ + 클릭: 개별 선택/해제 토글
    if (event.ctrlKey || event.metaKey) {
      setSelectedDevices(prev => {
        if (prev.includes(deviceId)) {
          return prev.filter(id => id !== deviceId);
        } else {
          return [...prev, deviceId];
        }
      });
      setLastSelectedDevice(deviceId);
    }
    // Shift + 클릭: 범위 선택
    else if (event.shiftKey && lastSelectedDevice !== null) {
      const currentIndex = devices.findIndex(d => d.id === deviceId);
      const lastIndex = devices.findIndex(d => d.id === lastSelectedDevice);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = devices.slice(start, end + 1).map(d => d.id);
        
        setSelectedDevices(prev => {
          const newSelection = [...prev];
          rangeIds.forEach(id => {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          });
          return newSelection;
        });
      }
    }
    // 일반 클릭: 단일 선택
    else {
      setSelectedDevices([deviceId]);
      setLastSelectedDevice(deviceId);
    }
  };

  // 현재 MAC 주소 가져오기
  const fetchCurrentMac = async () => {
    console.log('🔍 fetchCurrentMac 함수 시작');
    setMacLoading(true);
    setMacError(null);
    
    try {
      const response = await ipService.getCurrentMac();
      console.log('🔍 MAC 주소 조회 응답:', response);
      
      if (response.success && response.data) {
        const { mac_address, ip_address } = response.data;
        console.log('🔍 MAC 주소:', mac_address, 'IP 주소:', ip_address);
        
        if (mac_address && validateMacAddress(mac_address)) {
          console.log('🔍 유효한 MAC 주소 발견:', mac_address);
          
          // MAC 주소를 6개 부분으로 분할
          const parts = mac_address.split(':').map(part => part.toUpperCase());
          console.log('🔍 MAC 주소 파트:', parts);
          
          // 수동 입력 모드로 전환
          setIsManualInput(true);
          
          // 각 입력 필드에 MAC 주소 파트 설정
          setMacParts(parts);
          
          // 기기 이름 자동 설정 (IP 주소가 있는 경우)
          if (ip_address && deviceName === '') {
            setDeviceName(`내 기기 (${ip_address})`);
          }
        } else {
          console.log('🔍 유효한 MAC 주소를 찾을 수 없음');
          setMacError('현재 기기의 MAC 주소를 찾을 수 없습니다.');
        }
      } else {
        console.error('🔍 API 응답 오류:', response.error);
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '알 수 없는 오류가 발생했습니다.';
        setMacError(errorMessage);
      }
    } catch (err) {
      console.error('🔍 MAC 주소 조회 중 오류 발생:', err);
      setMacError('MAC 주소를 가져오는 중 오류가 발생했습니다.');
    } finally {
      console.log('🔍 fetchCurrentMac 함수 종료');
      setMacLoading(false);
    }
  };

  // 필터링된 장치 목록
  const filteredDevices = devices.filter(device =>
    device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.mac_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.assigned_ip?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/dashboard/teacher')}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <h1 className="text-2xl font-bold text-primary">내 IP 관리</h1>
          </div>
        </div>
        
        {/* 기기 통계 */}
        <div className="card mb-8">
          <h2 className="text-lg font-medium text-primary mb-4">IP 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="총 등록 IP"
              value={stats.totalDevices}
              icon={Monitor}
              color="blue"
            />
            <StatsCard
              title="활성 IP"
              value={stats.activeDevices}
              icon={Wifi}
              color="green"
            />
            <StatsCard
              title="비활성 IP"
              value={stats.totalDevices - stats.activeDevices}
              icon={WifiOff}
              color="red"
            />
          </div>
        </div>
        
        {/* 기기 관리 */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-primary">내 IP 목록</h2>
            
            <div className="flex space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="IP 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button variant="primary" size="md" onClick={openRegisterModal}>
                <Plus className="w-4 h-4 mr-2" /> IP 추가
              </Button>
            </div>
          </div>
          
          {/* 다중 선택 안내 */}
          <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-md mb-4 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">IP 다중 선택 기능</span>
            </div>
            <ul className="list-disc ml-8 mt-1">
              <li><strong>Ctrl/⌘ + 클릭</strong>: 개별 IP 선택/해제 토글</li>
              <li><strong>Shift + 클릭</strong>: 마지막으로 선택한 IP와 현재 IP 사이의 모든 IP 선택</li>
            </ul>
          </div>
          
          {/* 일괄 작업 바 */}
          <BulkActionBar
            selectedCount={selectedDevices.length}
            onBulkActivate={() => {
              // confirm 대신 토스트로 확인 메시지 표시하고 바로 처리
              showError('일괄 활성화', `선택한 ${selectedDevices.length}개의 IP를 활성화하시겠습니까?`);
              handleBulkToggleDeviceActive(selectedDevices, true);
            }}
            onBulkDeactivate={() => {
              // confirm 대신 토스트로 확인 메시지 표시하고 바로 처리
              showError('일괄 비활성화', `선택한 ${selectedDevices.length}개의 IP를 비활성화하시겠습니까?`);
              handleBulkToggleDeviceActive(selectedDevices, false);
            }}
            onBulkDelete={() => {
              // confirm 대신 토스트로 확인 메시지 표시하고 바로 처리
              showError('일괄 삭제', `정말로 선택한 ${selectedDevices.length}개의 IP를 삭제하시겠습니까?`);
              handleBulkDeleteDevices(selectedDevices);
            }}
          />
          
          <DeviceTable
            devices={filteredDevices}
            selectedDevices={selectedDevices}
            onDeviceSelect={handleDeviceSelection}
            onToggleActive={handleToggleDeviceActive}
            onEdit={(deviceId) => router.push(`/dashboard/teacher/my-devices/${deviceId}/edit`)}
            onDelete={handleDeleteDevice}
            onDnsRequest={(device) => setDnsDialog({ open: true, ip: device.assigned_ip || '', mac: device.mac_address, deviceName: device.device_name })}
            onDnsResubmit={(device) => {
              const dnsInfo = getDnsInfo(device);
              setDnsDialog({ 
                open: true, 
                ip: device.assigned_ip || '', 
                mac: device.mac_address, 
                deviceName: device.device_name,
                isResubmit: true,
                requestId: dnsInfo.request_id
              });
            }}
            onViewRejectReason={(device) => {
              const dnsInfo = getDnsInfo(device);
              setRejectReasonDialog({
                open: true,
                reason: dnsInfo.reject_reason || '거절 사유 없음',
                domain: dnsInfo.domain || '',
                ip: device.assigned_ip || ''
              });
            }}
            onDnsDelete={handleDnsDelete}
            onSslDownload={handleSslDownload}
          />
        </div>
      </div>
      
      {/* 장치 등록 모달 */}
      <DeviceRegistrationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleRegisterDevice}
        macAddress={macAddress}
        deviceName={deviceName}
        macParts={macParts}
        macError={macError}
        macLoading={macLoading}
        registering={registering}
        isManualInput={isManualInput}
        onMacAddressChange={setMacAddress}
        onDeviceNameChange={setDeviceName}
        onMacPartChange={handleMacPartChange}
        onMacPartKeyDown={handleMacPartKeyDown}
        onManualInputChange={setIsManualInput}
        onFetchCurrentMac={fetchCurrentMac}
      />

      {/* DNS 등록 신청 다이얼로그 */}
      {dnsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-primary mb-4">
              {dnsDialog?.isResubmit ? 'DNS 재신청' : 'DNS 등록 신청'}
            </h3>
            
            {/* 도메인 형식 안내 */}
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">📝 도메인 형식 안내</h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>올바른 형식:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code>example.com</code> - 영문 도메인</li>
                  <li><code>사이트.kr</code> - 한글 + 영문 확장자</li>
                  <li><code>도메인.한국</code> - 한글 도메인</li>
                  <li><code>my-site.info</code> - 하이픈 포함 (시작/끝 제외)</li>
                </ul>
                <p className="mt-2"><strong>지원 확장자:</strong></p>
                <p className="text-xs">.com, .net, .org, .kr, .한국, .info, .app, .dev, .io, .tech 등</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  도메인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dnsForm.domain}
                  onChange={e => setDnsForm({ ...dnsForm, domain: e.target.value })}
                  className="input-field"
                  placeholder="예: example.com, 사이트.kr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">IP 주소</label>
                <input
                  type="text"
                  value={dnsDialog?.ip || ''}
                  className="input-field bg-gray-100 dark:bg-gray-700"
                  disabled
                />
                <p className="text-xs text-secondary mt-1">이 기기의 IP 주소가 자동으로 설정됩니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  신청 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={dnsForm.reason}
                  onChange={e => setDnsForm({ ...dnsForm, reason: e.target.value })}
                  className="input-field"
                  placeholder="도메인이 필요한 이유를 간단히 설명해주세요"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setDnsDialog(null)}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!dnsDialog) return;
                  setDnsSubmitting(true);
                  try {
                    await dnsService.requestDomain({ domain: dnsForm.domain, ip: dnsDialog.ip, reason: dnsForm.reason });
                    const message = dnsDialog.isResubmit ? 'DNS 재신청 완료' : 'DNS 등록 신청 완료';
                    showSuccess('DNS 신청 완료', message);
                    setDnsDialog(null);
                    setDnsForm({ domain: '', reason: '' });
                    // 기기 목록 다시 로드 (DNS 정보 포함)
                    const devicesResponse = await ipService.getMyIps();
                    if (devicesResponse.success) {
                      setDevices(devicesResponse.data || []);
                    }
                  } catch (error: any) {
                    let errorMessage = '신청 실패';
                    if (error?.response?.data?.domain) {
                      errorMessage = error.response.data.domain[0] || error.response.data.domain;
                    } else if (error?.response?.data?.detail) {
                      errorMessage = error.response.data.detail;
                    }
                    showError('DNS 신청 실패', errorMessage);
                  } finally {
                    setDnsSubmitting(false);
                  }
                }}
                disabled={dnsSubmitting || !dnsForm.domain || !dnsForm.reason}
                className="btn-primary disabled:opacity-50"
              >
                {dnsSubmitting ? '처리 중...' : '신청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거절 사유 보기 다이얼로그 */}
      {rejectReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-primary mb-4">거절 사유</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">도메인</label>
                <p className="text-sm text-primary bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                  {rejectReasonDialog.domain}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">IP 주소</label>
                <p className="text-sm text-primary bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                  {rejectReasonDialog.ip}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">거절 사유</label>
                <div className="text-sm text-primary bg-red-50 dark:bg-red-900 p-3 rounded border border-red-200 dark:border-red-700">
                  {rejectReasonDialog.reason || '거절 사유가 없습니다.'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setRejectReasonDialog(null)}
                className="btn-secondary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 