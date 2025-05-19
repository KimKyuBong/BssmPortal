'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, Plus, Search, RefreshCw, Power, Trash2, Edit } from 'lucide-react';
import authService from '@/services/auth';
import deviceService from '@/services/device';
import { Device, CurrentMacResponse } from '@/services/device';

export default function DeviceManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 장치 등록 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [macAddress, setMacAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [currentMac, setCurrentMac] = useState<CurrentMacResponse | null>(null);
  const [loadingCurrentMac, setLoadingCurrentMac] = useState(false);
  const [isManualRegistration, setIsManualRegistration] = useState(false);
  const [macAddressError, setMacAddressError] = useState<string | null>(null);
  
  // 장치 수정 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // 상태 추가
  const [macParts, setMacParts] = useState<string[]>(['', '', '', '', '', '']);
  
  // MAC 주소 부분 변경 핸들러
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
        setMacAddressError('올바른 MAC 주소 형식이 아닙니다.');
      } else {
        setMacAddressError(null);
      }
    } else if (fullMac.replace(/:/g, '').length > 0) {
      setMacAddressError('MAC 주소를 완성해주세요.');
    } else {
      setMacAddressError(null);
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
    // 백스페이스 키를 누르고 현재 입력 필드가 비어있을 때 이전 필드로 이동
    if (e.key === 'Backspace' && macParts[index] === '' && index > 0) {
      const prevInput = document.getElementById(`macPart-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };
  
  // 장치 등록 모달 열기 시 MAC 부분 초기화
  const openRegisterModal = () => {
    setShowModal(true);
    setMacAddress('');
    setMacParts(['', '', '', '', '', '']);
    setDeviceName('');
    setCurrentMac(null);
    setIsManualRegistration(false);
    fetchCurrentMac();
  };
  
  // 현재 MAC 주소 설정 시 MAC 부분 업데이트
  useEffect(() => {
    if (currentMac && currentMac.mac_address) {
      const parts = currentMac.mac_address.split(':');
      if (parts.length === 6) {
        setMacParts(parts);
      }
    }
  }, [currentMac]);
  
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
        
        // 장치 목록 가져오기
        await fetchDevices();
        
        // URL 쿼리 파라미터 확인
        const action = searchParams.get('action');
        if (action === 'add') {
          openRegisterModal();
        }
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        console.error('Device management error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router, searchParams]);
  
  // 장치 목록 가져오기 함수
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const devicesResponse = await deviceService.getMyDevices();
      if (devicesResponse.success) {
        setDevices(devicesResponse.data || []);
      } else {
        const errorMessage = typeof devicesResponse.error === 'string' 
          ? devicesResponse.error 
          : devicesResponse.error?.detail || '장치 목록을 불러오는데 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('장치 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('Fetch devices error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // MAC 주소 유효성 검사 함수
  const validateMacAddress = (mac: string): boolean => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  };
  
  // 장치 등록 처리
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!macAddress || !deviceName) {
      setError('MAC 주소와 장치 이름을 모두 입력해주세요.');
      return;
    }
    
    if (!validateMacAddress(macAddress)) {
      setError('올바른 MAC 주소 형식이 아닙니다. (예: 00:11:22:33:44:55)');
      return;
    }
    
    try {
      setRegistering(true);
      let response;
      
      if (isManualRegistration) {
        response = await deviceService.registerManualDevice(macAddress, deviceName);
      } else {
        response = await deviceService.registerDevice({ mac_address: macAddress, device_name: deviceName });
      }
      
      if (response.success) {
        // 장치 등록 성공
        setShowModal(false);
        setMacAddress('');
        setDeviceName('');
        setMacAddressError(null);
        
        // 장치 목록 새로고침
        await fetchDevices();
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 등록에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('장치 등록 중 오류가 발생했습니다.');
      console.error('Register device error:', err);
    } finally {
      setRegistering(false);
    }
  };
  
  // 장치 삭제 처리
  const handleDeleteDevice = async (deviceId: number) => {
    if (!confirm('정말로 이 장치를 삭제하시겠습니까?')) return;
    
    try {
      const response = await deviceService.deleteDevice(deviceId);
      
      if (response.success) {
        // 장치 목록에서 삭제된 장치 제거
        setDevices(devices.filter(device => device.id !== deviceId));
        setError(null);
        alert('장치가 성공적으로 삭제되었습니다.');
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 삭제에 실패했습니다.';
        setError(errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('장치 삭제 오류:', error);
      setError('장치 삭제 중 오류가 발생했습니다.');
      alert('장치 삭제 중 오류가 발생했습니다.');
    }
  };
  
  // 장치 활성화/비활성화 토글 처리
  const handleToggleDeviceActive = async (deviceId: number, currentStatus: boolean) => {
    try {
      const response = await deviceService.toggleDeviceActive(deviceId);
      
      if (response.success) {
        // 장치 목록 업데이트
        setDevices(devices.map(device => 
          device.id === deviceId 
            ? { ...device, is_active: !currentStatus } 
            : device
        ));
        
        // 성공 메시지 표시
        if (response.message) {
          alert(response.message);
          setError(null);
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
  
  // IP 재할당 처리
  const handleReassignIp = async (deviceId: number) => {
    try {
      const response = await deviceService.reassignIp(deviceId);
      
      if (response.success && response.data) {
        // 장치 목록 업데이트
        const newIp = response.data.assigned_ip || null;
        setDevices(devices.map(device => 
          device.id === deviceId 
            ? { ...device, assigned_ip: newIp } 
            : device
        ));
        setError(null);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || 'IP 재할당에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('IP 재할당 중 오류가 발생했습니다.');
      console.error('Reassign IP error:', err);
    }
  };
  
  // 장치 수정 모달 열기
  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setEditDeviceName(device.device_name);
    setShowEditModal(true);
  };
  
  // 장치 수정 처리
  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDevice || !editDeviceName) {
      setError('장치 이름을 입력해주세요.');
      return;
    }
    
    try {
      setUpdating(true);
      const response = await deviceService.updateDevice(editingDevice.id, editDeviceName);
      
      if (response.success) {
        // 장치 수정 성공
        setShowEditModal(false);
        setEditingDevice(null);
        setEditDeviceName('');
        
        // 장치 목록 업데이트
        setDevices(devices.map(device => 
          device.id === editingDevice.id 
            ? { ...device, device_name: editDeviceName } 
            : device
        ));
        setError(null);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '장치 수정에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('장치 수정 중 오류가 발생했습니다.');
      console.error('Update device error:', err);
    } finally {
      setUpdating(false);
    }
  };
  
  // 검색어에 따른 필터링된 장치 목록
  const filteredDevices = devices.filter(device => 
    device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.mac_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (device.assigned_ip && device.assigned_ip.includes(searchTerm))
  );

  // 현재 MAC 주소 가져오기
  const fetchCurrentMac = async () => {
    try {
      setLoadingCurrentMac(true);
      const response = await deviceService.getCurrentMac();
      
      if (response.success && response.data) {
        setCurrentMac(response.data);
        setMacAddress(response.data.mac_address);
        
        // MAC 주소 부분 업데이트
        const parts = response.data.mac_address.split(':');
        if (parts.length === 6) {
          setMacParts(parts);
        }
        
        if (response.message) {
          setError(response.message);
        }
      } else {
        setCurrentMac(null);
        setError(response.message || '현재 MAC 주소를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      setError('현재 MAC 주소를 가져오는 중 오류가 발생했습니다.');
      console.error('Fetch current MAC error:', err);
    } finally {
      setLoadingCurrentMac(false);
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
        {/* 페이지 제목 */}
        <div className="flex items-center mb-6">
          <Link href="/dashboard/teacher" className="text-gray-500 hover:text-gray-700 mr-4">
            &larr; 대시보드
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">IP 관리</h1>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <span className="text-red-500">&times;</span>
            </button>
          </div>
        )}
        
        {/* 장치 관리 툴바 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 md:mb-0">내 장치 목록</h2>
            
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="장치 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button
                onClick={openRegisterModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                장치 등록
              </button>
            </div>
          </div>
          
          {/* 장치 목록 테이블 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    장치 이름
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
                {filteredDevices.length > 0 ? (
                  filteredDevices.map((device) => (
                    <tr key={device.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{device.device_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{device.mac_address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {device.assigned_ip || '-'}
                          {device.is_active && (
                            <button
                              onClick={() => handleReassignIp(device.id)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="IP 재할당"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {device.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(device.last_access).toLocaleString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(device)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="수정"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleDeviceActive(device.id, device.is_active)}
                          className={`${device.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'} mr-3`}
                          title={device.is_active ? '비활성화' : '활성화'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="text-red-600 hover:text-red-900"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? '검색 결과가 없습니다.' : '등록된 장치가 없습니다.'}
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">새 장치 등록</h3>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-4">
                <button
                  type="button"
                  className={`px-3 py-1 text-sm font-medium rounded-md ${!isManualRegistration ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setIsManualRegistration(false)}
                >
                  현재 장치 등록
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-sm font-medium rounded-md ${isManualRegistration ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setIsManualRegistration(true)}
                >
                  수동 등록
                </button>
              </div>
              
              {!isManualRegistration && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">현재 장치 정보</h4>
                  {loadingCurrentMac ? (
                    <p className="text-sm text-gray-500">MAC 주소 가져오는 중...</p>
                  ) : currentMac ? (
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">IP 주소:</span> {currentMac.ip_address}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">MAC 주소:</span> {currentMac.mac_address}
                      </p>
                      {currentMac.mac_address === '00:00:00:00:00:00' && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                          <p>보안상의 이유로 브라우저에서는 MAC 주소를 자동으로 가져올 수 없습니다.</p>
                          <p>아래 방법 중 하나를 선택해주세요:</p>
                          <ul className="list-disc ml-4 mt-1">
                            <li>수동 등록 모드로 전환하여 MAC 주소를 직접 입력</li>
                            <li>터미널에서 'ipconfig /all' (Windows) 또는 'ifconfig' (Mac/Linux) 명령어로 MAC 주소 확인</li>
                          </ul>
                          <button
                            type="button"
                            className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium"
                            onClick={() => setIsManualRegistration(true)}
                          >
                            수동 등록으로 전환
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500">MAC 주소를 가져올 수 없습니다.</p>
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                        <p>보안상의 이유로 브라우저에서는 MAC 주소를 자동으로 가져올 수 없습니다.</p>
                        <p>아래 방법 중 하나를 선택해주세요:</p>
                        <ul className="list-disc ml-4 mt-1">
                          <li>수동 등록 모드로 전환하여 MAC 주소를 직접 입력</li>
                          <li>터미널에서 'ipconfig /all' (Windows) 또는 'ifconfig' (Mac/Linux) 명령어로 MAC 주소 확인</li>
                        </ul>
                        <button
                          type="button"
                          className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium"
                          onClick={() => setIsManualRegistration(true)}
                        >
                          수동 등록으로 전환
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <form onSubmit={handleRegisterDevice}>
              <div className="mb-4">
                <label htmlFor="macAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  MAC 주소
                </label>
                <div className="flex items-center space-x-2">
                  {macParts.map((part, index) => (
                    <React.Fragment key={index}>
                      <input
                        type="text"
                        id={`macPart-${index}`}
                        className={`block w-12 px-2 py-2 border ${macAddressError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm text-black text-center font-mono focus:outline-none focus:ring-2 ${macAddressError ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} sm:text-sm`}
                        placeholder="00"
                        value={part}
                        onChange={(e) => handleMacPartChange(index, e.target.value)}
                        onKeyDown={(e) => handleMacPartKeyDown(index, e)}
                        maxLength={2}
                        readOnly={!isManualRegistration && currentMac !== null}
                        required
                        style={{ color: 'black', fontWeight: 600 }}
                      />
                      {index < 5 && <span className="text-gray-800 font-medium">:</span>}
                    </React.Fragment>
                  ))}
                </div>
                {macAddressError && (
                  <p className="mt-1 text-xs text-red-600">
                    {macAddressError}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-700 font-medium">
                  MAC 주소 형식: XX:XX:XX:XX:XX:XX (16진수)
                </p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-1">
                  장치 이름
                </label>
                <input
                  type="text"
                  id="deviceName"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="예: 내 노트북"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                  style={{ color: 'black', fontWeight: 500 }}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={() => {
                    setShowModal(false);
                    setMacAddress('');
                    setDeviceName('');
                  }}
                  disabled={registering}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={registering}
                  style={{ fontWeight: 600 }}
                >
                  {registering ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 장치 수정 모달 */}
      {showEditModal && editingDevice && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">장치 정보 수정</h3>
            
            <form onSubmit={handleUpdateDevice}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MAC 주소
                </label>
                <div className="block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm sm:text-sm">
                  {editingDevice.mac_address}
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="editDeviceName" className="block text-sm font-medium text-gray-700 mb-1">
                  장치 이름
                </label>
                <input
                  type="text"
                  id="editDeviceName"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDevice(null);
                    setEditDeviceName('');
                  }}
                  disabled={updating}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={updating}
                >
                  {updating ? '수정 중...' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 