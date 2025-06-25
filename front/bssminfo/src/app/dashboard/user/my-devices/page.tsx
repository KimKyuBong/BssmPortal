'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import ipService from '@/services/ip';
import { Device } from '@/services/ip';
import Link from 'next/link';
import { LogOut, User, Search, Plus, Edit, Trash2, Laptop, ArrowLeft } from 'lucide-react';
import { Box, Button } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import dnsService from '@/services/dns';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function MyDevicesPage() {
  const router = useRouter();
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
  const [dnsSnackbar, setDnsSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  
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
        setDnsSnackbar({ open: true, message: '도메인이 삭제되었습니다.', severity: 'success' });
        
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
        setDnsSnackbar({ open: true, message: '도메인 삭제에 실패했습니다.', severity: 'error' });
      }
    } catch (error: any) {
      console.error('도메인 삭제 오류:', error);
      let errorMessage = '도메인 삭제 중 오류가 발생했습니다.';
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setDnsSnackbar({ open: true, message: errorMessage, severity: 'error' });
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
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 검증
    if (!macAddress || !validateMacAddress(macAddress)) {
      setMacError('유효한 MAC 주소를 입력해주세요.');
      return;
    }
    
    if (!deviceName.trim()) {
      alert('기기 이름을 입력해주세요.');
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
        alert('기기가 성공적으로 등록되었습니다.');
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
        alert(response.error || '기기 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('Register device error:', err);
      alert('기기 등록 중 오류가 발생했습니다.');
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
          alert(response.message);
        }
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 상태 변경에 실패했습니다.';
        setError(errorMessage);
        alert(errorMessage);
      }
    } catch (err) {
      setError('장치 상태 변경 중 오류가 발생했습니다.');
      console.error('Toggle device error:', err);
      alert('장치 상태 변경 중 오류가 발생했습니다.');
    }
  };
  
  const handleDeleteDevice = async (deviceId: number) => {
    if (!confirm('정말로 이 장치를 삭제하시겠습니까?')) return;
    
    try {
      const response = await ipService.deleteIp(deviceId);
      if (response.success) {
        // 장치 목록 업데이트
        const updatedDevices = devices.filter(device => device.id !== deviceId);
        setDevices(updatedDevices);
        
        // 통계 업데이트
        const activeDevices = updatedDevices.filter(d => d.is_active).length;
        setStats({
          totalDevices: updatedDevices.length,
          activeDevices
        });
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 삭제에 실패했습니다.';
        setError(errorMessage);
        alert(errorMessage);
      }
    } catch (err) {
      setError('장치 삭제 중 오류가 발생했습니다.');
      console.error('Delete device error:', err);
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
        
        alert(`${deviceIds.length}개의 기기 상태가 변경되었습니다.`);
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
      const promises = deviceIds.map(deviceId => ipService.deleteIp(deviceId));
      const results = await Promise.all(promises);
      const success = results.every((result: any) => result.success);
      
      if (success) {
        // 장치 목록에서 삭제된 장치들 제거
        const updatedDevices = devices.filter(device => !deviceIds.includes(device.id));
        setDevices(updatedDevices);
        
        // 통계 업데이트
        setStats(prev => ({
          totalDevices: updatedDevices.length,
          activeDevices: updatedDevices.filter(d => d.is_active).length
        }));
        
        alert(`${deviceIds.length}개의 기기가 삭제되었습니다.`);
        setSelectedDevices([]); // 선택 초기화
      } else {
        setError('일부 기기 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('기기 일괄 삭제 중 오류가 발생했습니다.');
      console.error('Bulk delete devices error:', err);
    }
  };

  // 장치 다중 선택 처리 함수
  const handleDeviceSelection = (deviceId: number, event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) => {
    // Ctrl/Cmd 키를 누른 상태로 클릭 (개별 항목 토글)
    if (event.ctrlKey || event.metaKey) {
      setSelectedDevices(prev => {
        if (prev.includes(deviceId)) {
          return prev.filter(id => id !== deviceId);
        } else {
          return [...prev, deviceId];
        }
      });
    } 
    // Shift 키를 누른 상태로 클릭 (범위 선택)
    else if (event.shiftKey && lastSelectedDevice !== null) {
      const deviceIds = devices.map(device => device.id);
      const currentIndex = deviceIds.indexOf(deviceId);
      const lastIndex = deviceIds.indexOf(lastSelectedDevice);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        
        const rangeIds = deviceIds.slice(start, end + 1);
        
        // 기존 선택에 범위 추가
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
    // 일반 클릭 (다른 선택 초기화 후 현재 항목만 선택)
    else {
      setSelectedDevices([deviceId]);
    }
    
    setLastSelectedDevice(deviceId);
  };

  // 검색 필터링
  const filteredDevices = devices.filter(device => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (device.device_name && device.device_name.toLowerCase().includes(searchLower)) ||
      (device.mac_address && device.mac_address.toLowerCase().includes(searchLower)) ||
      (device.assigned_ip && device.assigned_ip.toLowerCase().includes(searchLower))
    );
  });

  /**
   * MAC 주소 가져오기
   */
  const fetchCurrentMac = async () => {
    console.log('🔍 fetchCurrentMac 함수 시작');
    try {
      // 로딩 상태 설정
      setMacLoading(true);
      setMacError(null);

      // MAC 주소 조회 요청
      const response = await ipService.getCurrentMac();
      console.log('🔍 서버 응답 전체:', response);

      // 응답 성공 확인
      if (response.success && response.data) {
        console.log('🔍 응답 데이터 구조:', response.data);
        
        // 변경된 백엔드 구조에 맞게 데이터 직접 접근
        const macAddress = response.data.mac_address;
        const ipAddress = response.data.ip_address;
        
        console.log(`🔍 추출된 MAC 주소: ${macAddress}, IP 주소: ${ipAddress}`);

        if (macAddress && macAddress !== '00:00:00:00:00:00') {
          // MAC 주소 설정
          setMacAddress(macAddress);
          
          // MAC 주소를 파트별로 분리 (콜론으로 구분된 경우)
          let parts;
          if (macAddress.includes(':')) {
            parts = macAddress.split(':');
          } else if (macAddress.includes('-')) {
            parts = macAddress.split('-');
          } else if (macAddress.length === 12) {
            // 구분자 없는 12자리 MAC 주소 처리
            parts = [];
            for (let i = 0; i < 12; i += 2) {
              parts.push(macAddress.substring(i, i + 2));
            }
          } else {
            console.error('🔍 지원되지 않는 MAC 주소 형식:', macAddress);
            setMacError('지원되지 않는 MAC 주소 형식입니다.');
            setMacLoading(false);
            return;
          }
          
          console.log('🔍 MAC 주소 파트:', parts);
          
          // 수동 입력 모드로 전환
          setIsManualInput(true);
          
          // 각 입력 필드에 MAC 주소 파트 설정
          setMacParts(parts);
          
          // 기기 이름 자동 설정 (IP 주소가 있는 경우)
          if (ipAddress && deviceName === '') {
            setDeviceName(`내 기기 (${ipAddress})`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/dashboard/teacher')}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">내 IP 관리</h1>
          </div>
        </div>
        

        
        {/* 기기 통계 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">기기 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-700 mb-2">총 등록 기기</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalDevices}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-700 mb-2">활성 기기</h3>
              <p className="text-2xl font-bold text-green-600">{stats.activeDevices}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-700 mb-2">비활성 기기</h3>
              <p className="text-2xl font-bold text-red-600">{stats.totalDevices - stats.activeDevices}</p>
            </div>
          </div>
        </div>
        
        {/* 기기 관리 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">내 기기 목록</h2>
            
            <div className="flex space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="기기 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button
                onClick={openRegisterModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{ fontWeight: 700 }}
              >
                <Plus className="w-4 h-4 mr-2" />
                기기 IP 등록
              </button>
            </div>
          </div>
          
          {/* 다중 선택 안내 */}
          <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">기기 다중 선택 기능</span>
            </div>
            <ul className="list-disc ml-8 mt-1">
              <li><strong>Ctrl/⌘ + 클릭</strong>: 개별 기기 선택/해제 토글</li>
              <li><strong>Shift + 클릭</strong>: 마지막으로 선택한 기기와 현재 기기 사이의 모든 기기 선택</li>
            </ul>
          </div>
          
          {/* 선택된 기기에 대한 일괄 작업 버튼 */}
          {selectedDevices.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{selectedDevices.length}개</span>의 기기가 선택됨
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (confirm(`선택한 ${selectedDevices.length}개의 기기를 활성화하시겠습니까?`)) {
                      handleBulkToggleDeviceActive(selectedDevices, true);
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  일괄 활성화
                </button>
                <button
                  onClick={() => {
                    if (confirm(`선택한 ${selectedDevices.length}개의 기기를 비활성화하시겠습니까?`)) {
                      handleBulkToggleDeviceActive(selectedDevices, false);
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  일괄 비활성화
                </button>
                <button
                  onClick={() => {
                    if (confirm(`정말로 선택한 ${selectedDevices.length}개의 기기를 삭제하시겠습니까?`)) {
                      handleBulkDeleteDevices(selectedDevices);
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  선택 기기 삭제
                </button>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기기 정보
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MAC 주소
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP 주소
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 접속
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDevices.map((device) => {
                  const isSelected = selectedDevices.includes(device.id);
                  return (
                    <tr 
                      key={device.id} 
                      className={`${isSelected ? 'bg-blue-200 border-l-4 border-blue-500' : ''} hover:bg-gray-100 cursor-pointer`}
                      onClick={(e) => handleDeviceSelection(device.id, e)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Laptop className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{device.device_name || '이름 없음'}</div>
                            <div className="text-sm text-gray-500">
                              {device.mac_address ? `MAC: ${device.mac_address.substring(0, 8)}...` : '정보 없음'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.mac_address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="text-gray-900 font-medium">{device.assigned_ip || '-'}</div>
                          {device.assigned_ip && (() => {
                            const dnsInfo = getDnsInfo(device);
                            if (dnsInfo.status === 'approved') {
                              return (
                                <div className="text-green-600 text-xs">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    등록된 도메인
                                  </span>
                                  <div className="mt-1">({dnsInfo.domain})</div>
                                </div>
                              );
                            } else if (dnsInfo.status === '거절') {
                              return (
                                <div className="text-red-600 text-xs">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRejectReasonDialog({
                                        open: true,
                                        reason: dnsInfo.reject_reason || '거절 사유 없음',
                                        domain: dnsInfo.domain || '',
                                        ip: device.assigned_ip || ''
                                      });
                                    }}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer"
                                  >
                                    거절된 도메인
                                  </button>
                                  <div className="mt-1">({dnsInfo.domain})</div>
                                </div>
                              );
                            } else if (dnsInfo.status === '대기') {
                              return (
                                <div className="text-yellow-600 text-xs">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    신청 대기 중
                                  </span>
                                  <div className="mt-1">({dnsInfo.domain})</div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {device.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.last_seen || '기록 없음'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                                                  {device.assigned_ip && (() => {
                            const dnsInfo = getDnsInfo(device);
                            if (dnsInfo.status === 'approved') {
                            // 승인된 도메인에 대해 삭제 버튼 표시
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`정말로 도메인 "${dnsInfo.domain}"을(를) 삭제하시겠습니까?`)) {
                                    handleDeleteDomain(dnsInfo.record_id!);
                                  }
                                }}
                                className="ml-2 px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs font-semibold"
                              >
                                도메인 삭제
                              </button>
                            );
                          } else if (dnsInfo.status === '거절') {
                            // 거절된 경우 재신청 버튼
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDnsDialog({ 
                                    open: true, 
                                    ip: device.assigned_ip || '', 
                                    mac: device.mac_address, 
                                    deviceName: device.device_name,
                                    isResubmit: true,
                                    requestId: dnsInfo.request_id
                                  });
                                }}
                                className="ml-2 px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-xs font-semibold"
                              >
                                DNS 재신청
                              </button>
                            );
                          } else if (dnsInfo.status === '대기') {
                            // 대기 중인 경우 버튼 비활성화
                            return (
                              <button
                                disabled
                                className="ml-2 px-3 py-1 rounded bg-gray-400 text-white text-xs font-semibold cursor-not-allowed"
                              >
                                신청 대기 중
                              </button>
                            );
                          } else {
                            // 신청한 적이 없는 경우 일반 신청 버튼
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDnsDialog({ open: true, ip: device.assigned_ip || '', mac: device.mac_address, deviceName: device.device_name });
                                }}
                                className="ml-2 px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs font-semibold"
                              >
                                DNS 등록 신청
                              </button>
                            );
                          }
                        })()}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDeviceActive(device.id, device.is_active);
                          }}
                          className={`mr-2 px-2 py-1 rounded text-xs font-medium ${device.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                          title={device.is_active ? '비활성화' : '활성화'}
                        >
                          {device.is_active ? '비활성화' : '활성화'}
                        </button>
                        <Link
                          href={`/dashboard/teacher/my-devices/${device.id}/edit`}
                          className="mr-2 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="h-3 w-3 inline mr-1" />
                          수정
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDevice(device.id);
                          }}
                          className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100"
                        >
                          <Trash2 className="h-3 w-3 inline mr-1" />
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      등록된 기기가 없거나 검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* 장치 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h2 className="text-xl text-gray-900 font-bold mb-4">기기 IP 등록</h2>
                
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleRegisterDevice}>
                  <div className="mb-4">
                    <label className="block text-gray-900 text-sm font-bold mb-2">
                      MAC 주소
                    </label>
                    
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={fetchCurrentMac}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm py-1 px-3 rounded inline-flex items-center"
                        disabled={macLoading}
                      >
                        {macLoading ? (
                          <span className="inline-flex items-center">
                            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2"></span>
                            로딩 중...
                          </span>
                        ) : (
                          <span className="font-medium">현재 MAC 주소 가져오기</span>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex space-x-2">
                      {macParts.map((part, idx) => (
                        <div key={idx} className="w-12">
                          <input
                            id={`macPart-${idx}`}
                            type="text"
                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-center font-mono uppercase text-gray-900 font-semibold"
                            value={part}
                            onChange={(e) => handleMacPartChange(idx, e.target.value)}
                            onKeyDown={(e) => handleMacPartKeyDown(idx, e)}
                            maxLength={2}
                            disabled={registering}
                          />
                        </div>
                      ))}
                    </div>
                    
                    {macError && (
                      <p className="text-red-500 text-xs mt-1">{macError}</p>
                    )}
                    
                    <div className="mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600"
                          checked={isManualInput}
                          onChange={(e) => setIsManualInput(e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-900 font-medium">수동으로 MAC 주소 입력</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-900 text-sm font-bold mb-2">
                      기기 이름
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 font-medium placeholder-gray-600"
                      placeholder="기기 이름 입력 (예: 내 노트북)"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      disabled={registering}
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowModal(false)}
                      disabled={registering}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={registering}
                    >
                      {registering ? (
                        <span className="inline-flex items-center">
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                          처리 중...
                        </span>
                      ) : (
                        '등록하기'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DNS 등록 신청 다이얼로그 */}
      {dnsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {dnsDialog?.isResubmit ? 'DNS 재신청' : 'DNS 등록 신청'}
            </h3>
            
            {/* 도메인 형식 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📝 도메인 형식 안내</h4>
              <div className="text-sm text-blue-700 space-y-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  도메인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dnsForm.domain}
                  onChange={e => setDnsForm({ ...dnsForm, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="예: example.com, 사이트.kr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IP 주소</label>
                <input
                  type="text"
                  value={dnsDialog?.ip || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">이 기기의 IP 주소가 자동으로 설정됩니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신청 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={dnsForm.reason}
                  onChange={e => setDnsForm({ ...dnsForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="도메인이 필요한 이유를 간단히 설명해주세요"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setDnsDialog(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
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
                    setDnsSnackbar({ open: true, message, severity: 'success' });
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
                    setDnsSnackbar({ open: true, message: errorMessage, severity: 'error' });
                  } finally {
                    setDnsSubmitting(false);
                  }
                }}
                disabled={dnsSubmitting || !dnsForm.domain || !dnsForm.reason}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {dnsSubmitting ? '처리 중...' : '신청'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Snackbar open={dnsSnackbar.open} autoHideDuration={3000} onClose={() => setDnsSnackbar({ ...dnsSnackbar, open: false })}>
        <Alert severity={dnsSnackbar.severity} sx={{ width: '100%' }}>{dnsSnackbar.message}</Alert>
      </Snackbar>

      {/* 거절 사유 보기 다이얼로그 */}
      {rejectReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">거절 사유</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">도메인</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {rejectReasonDialog.domain}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP 주소</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {rejectReasonDialog.ip}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">거절 사유</label>
                <div className="text-sm text-gray-900 bg-red-50 p-3 rounded border border-red-200">
                  {rejectReasonDialog.reason || '거절 사유가 없습니다.'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setRejectReasonDialog(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
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