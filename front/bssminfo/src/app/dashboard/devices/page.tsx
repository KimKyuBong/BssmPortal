'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, RefreshCw, Power, Trash2, Edit } from 'lucide-react';
import authService from '@/services/auth';
import ipService from '@/services/ip';
import { Device, CurrentMacResponse } from '@/services/ip';

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
  
  // 현재 MAC 주소 가져오기
  const fetchCurrentMac = async () => {
    try {
      setLoadingCurrentMac(true);
      const response = await ipService.getCurrentMac();
      if (response.success && response.data) {
        setCurrentMac(response.data);
        setMacAddress(response.data.mac_address || '');
      }
    } catch (err) {
      console.error('Fetch current MAC error:', err);
    } finally {
      setLoadingCurrentMac(false);
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
  
  // URL 쿼리 파라미터 처리
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      openRegisterModal();
    }
  }, [searchParams]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자 정보 가져오기
        const userResponse = await authService.getCurrentUser();
        if (!userResponse.success) {
          router.push('/login');
          return;
        }
        
        // 교사 계정이 아닌 경우 접근 제한
        if (!userResponse.data?.is_staff) {
          router.push('/dashboard');
          return;
        }
        
        setUser(userResponse.data);
        
        // 장치 목록 가져오기
        await fetchDevices();
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
      let devicesResponse;
      
      // 교사 계정과 일반 사용자 구분하여 다른 API 호출
      if (user?.is_staff) {
        // 교사는 모든 장치 목록을 볼 수 있음
        devicesResponse = await ipService.getAllIps();
      } else {
        // 일반 사용자는 자신의 장치만 볼 수 있음
        devicesResponse = await ipService.getMyIps();
      }
      
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
        response = await ipService.registerManualIp(macAddress, deviceName);
      } else {
        response = await ipService.registerIp({ mac_address: macAddress, device_name: deviceName });
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
          : response.error?.detail || '기기 IP 등록에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('기기 IP 등록 중 오류가 발생했습니다.');
      console.error('Register device error:', err);
    } finally {
      setRegistering(false);
    }
  };
  
  // 장치 삭제 처리
  const handleDeleteDevice = async (deviceId: number) => {
    if (!confirm('정말로 이 장치를 삭제하시겠습니까?')) return;
    
    try {
      const response = await ipService.deleteIp(deviceId);
      
      if (response.success) {
        // 장치 목록에서 삭제된 장치 제거
        setDevices(devices.filter(device => device.id !== deviceId));
        alert('장치가 성공적으로 삭제되었습니다.');
      } else {
        console.error('장치 삭제 실패 응답:', response.error);
        // 에러 메시지 처리 개선
        let errorMessage = '장치 삭제에 실패했습니다.';
        if (response.error) {
          if (typeof response.error === 'string') {
            errorMessage = response.error;
          } else if (typeof response.error === 'object') {
            errorMessage = JSON.stringify(response.error);
          }
        }
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
      console.log(`장치 ${deviceId} 상태 변경 시작: ${currentStatus ? '활성화->비활성화' : '비활성화->활성화'}`);
      
      const response = await ipService.toggleIpActive(deviceId);
      
      console.log('토글 응답:', response);
      
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
        } else {
          alert(currentStatus ? '장치가 비활성화되었습니다.' : '장치가 활성화되었습니다.');
        }
      } else {
        console.error('장치 상태 변경 실패 응답:', response);
        
        // 에러 메시지 처리 개선
        let errorMessage = '장치 상태 변경에 실패했습니다.';
        if (response.error) {
          if (typeof response.error === 'string') {
            errorMessage = response.error;
          } else if (typeof response.error === 'object') {
            try {
              errorMessage = JSON.stringify(response.error);
            } catch (e) {
              console.error('에러 메시지 문자열 변환 실패:', e);
            }
          }
          console.error('에러 원본:', response.error);
        }
        
        setError(errorMessage);
        alert(`장치 상태 변경 실패: ${errorMessage}`);
        
        // 실패한 경우 장치 목록 새로고침
        await fetchDevices();
      }
    } catch (error) {
      console.error('장치 상태 변경 오류:', error);
      setError('장치 상태 변경 중 오류가 발생했습니다.');
      alert('장치 상태 변경 중 오류가 발생했습니다.');
      
      // 오류 발생 시 장치 목록 새로고침
      await fetchDevices();
    }
  };
  
  // 장치 수정 모달 열기
  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setEditDeviceName(device.device_name);
    setShowEditModal(true);
  };
  
  // 장치 수정 저장
  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDevice || !editDeviceName) return;
    
    try {
      setUpdating(true);
      const response = await ipService.updateIp(editingDevice.id, editDeviceName);
      
      if (response.success) {
        // 장치 목록 업데이트
        setDevices(devices.map(device => 
          device.id === editingDevice.id 
            ? { ...device, device_name: editDeviceName } 
            : device
        ));
        
        // 모달 닫기
        setShowEditModal(false);
        setEditingDevice(null);
        setEditDeviceName('');
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
  
  // 검색 기능을 위한 필터링된 장치 목록
  const filteredDevices = devices.filter(device => 
    device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    device.mac_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (device.username && device.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // 로딩 중 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-4">IP 관리</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <button 
              onClick={openRegisterModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
              style={{ fontWeight: 700 }}
            >
              <Plus className="w-4 h-4 mr-1" /> 기기 IP 등록
            </button>
            
            <button
              onClick={fetchDevices}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
            </button>
          </div>
          
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                  장치 이름
                </th>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                  MAC 주소
                </th>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                  등록일
                </th>
                <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    등록된 장치가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredDevices.map(device => (
                  <tr key={device.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{device.device_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm">{device.mac_address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {device.is_active ? '활성화' : '비활성화'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(device.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleToggleDeviceActive(device.id, device.is_active)}
                        className={`${device.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} inline-flex items-center`}
                      >
                        <Power className="w-4 h-4 mr-1" />
                        {device.is_active ? '비활성화' : '활성화'}
                      </button>
                      
                      <button
                        onClick={() => openEditModal(device)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center ml-2"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        수정
                      </button>
                      
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center ml-2"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 장치 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h2 className="text-xl font-bold mb-4">기기 IP 등록</h2>
                
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleRegisterDevice}>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      MAC 주소
                    </label>
                    
                    {!isManualRegistration && (
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={fetchCurrentMac}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm py-1 px-3 rounded inline-flex items-center"
                          disabled={loadingCurrentMac}
                        >
                          {loadingCurrentMac ? (
                            <span className="inline-flex items-center">
                              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2"></span>
                              로딩 중...
                            </span>
                          ) : (
                            <span>현재 MAC 주소 가져오기</span>
                          )}
                        </button>
                        {currentMac && (
                          <p className="text-sm text-green-600 mt-1">
                            MAC 주소를 자동으로 가져왔습니다.
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {macParts.map((part, idx) => (
                        <div key={idx} className="w-12">
                          <input
                            id={`macPart-${idx}`}
                            type="text"
                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-center font-mono uppercase"
                            value={part}
                            onChange={(e) => handleMacPartChange(idx, e.target.value)}
                            onKeyDown={(e) => handleMacPartKeyDown(idx, e)}
                            maxLength={2}
                            disabled={registering || (!isManualRegistration && Boolean(currentMac?.mac_address) && !macAddressError)}
                          />
                        </div>
                      ))}
                    </div>
                    
                    {macAddressError && (
                      <p className="text-red-500 text-xs mt-1">{macAddressError}</p>
                    )}
                    
                    <div className="mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600"
                          checked={isManualRegistration}
                          onChange={(e) => setIsManualRegistration(e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">수동으로 MAC 주소 입력</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      장치 이름
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="장치 이름 입력"
                      required
                      disabled={registering}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                      disabled={registering}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className={`${
                        registering ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                      } text-white font-bold py-2 px-4 rounded flex items-center justify-center min-w-[80px]`}
                      disabled={registering || !!macAddressError}
                    >
                      {registering ? (
                        <span className="inline-flex items-center">
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                          등록 중...
                        </span>
                      ) : (
                        '등록'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 장치 수정 모달 */}
      {showEditModal && editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">장치 수정</h2>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleUpdateDevice}>
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    MAC 주소
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    value={editingDevice.mac_address}
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">MAC 주소는 변경할 수 없습니다.</p>
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    장치 이름
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editDeviceName}
                    onChange={(e) => setEditDeviceName(e.target.value)}
                    placeholder="장치 이름 입력"
                    required
                    disabled={updating}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                    disabled={updating}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className={`${
                      updating ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    } text-white font-bold py-2 px-4 rounded flex items-center justify-center min-w-[80px]`}
                    disabled={updating}
                  >
                    {updating ? (
                      <span className="inline-flex items-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                        수정 중...
                      </span>
                    ) : (
                      '저장'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 