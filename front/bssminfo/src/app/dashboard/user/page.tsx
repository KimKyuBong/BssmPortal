'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import ipService from '@/services/ip';
import rentalService from '@/services/rental';
import { Device } from '@/services/ip';
import Link from 'next/link';
import { User as UserIcon, LogOut, Mail, Key, Calendar, Package, NetworkIcon, Users, Shield, Database, Laptop, Server, HardDrive, Cpu, BarChart } from 'lucide-react';
import api from '@/services/api';

// Device 타입 확장
interface ExtendedDevice extends Device {
  last_seen?: string;
}

// 대여 타입 정의
interface Rental {
  id: number;
  equipment: {
    id: number;
    name: string;
    equipment_type: string;
    equipment_type_display: string;
    serial_number: string;
  };
  rental_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  status_display: string;
}

// 시스템 상태 타입 정의
interface SystemStatusDetails {
  cpu: string;
  memory: string;
  disk: string;
  network: string;
  boot_time: string;
  load_avg: {
    '1min': number;
    '5min': number;
    '15min': number;
  };
  active_processes: number;
  last_check: string;
}

interface SystemStatus {
  success: boolean;
  status: string;
  timestamp: string;
  details: SystemStatusDetails;
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<ExtendedDevice[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // useEffect 내에서 사용하는 함수들을 useCallback으로 감싸서 안정성 보장
  const fetchUserData = useCallback(async () => {
    try {
      // 사용자 정보 가져오기
      const userResponse = await authService.getCurrentUser();
      
      if (!userResponse.success) {
        router.push('/login');
        return;
      }
      
      if (userResponse.data) {
        setUser(userResponse.data);
        
        // 관리자인 경우 관리자 버튼 표시
        if (userResponse.data.is_superuser) {
          setIsAdmin(true);
        }
        
        // 사용자의 장치 정보 가져오기
        const devicesResponse = await ipService.getMyIps();
        if (devicesResponse.success) {
          setDevices(devicesResponse.data || []);
        }
        
        // 사용자의 대여 정보 가져오기
        const rentalsResponse = await rentalService.getMyRentals();
        if (rentalsResponse.success) {
          // response.data가 배열인지 PaginatedResponse인지 확인
          if (Array.isArray(rentalsResponse.data)) {
            setRentals(rentalsResponse.data || []);
          } else if (rentalsResponse.data && 'results' in rentalsResponse.data) {
            setRentals(rentalsResponse.data.results || []);
          } else {
            setRentals([]);
          }
        }
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('Dashboard error:', err);
    }
  }, [router]);
  
  const fetchSystemStatus = useCallback(async () => {
    if (!user?.is_superuser) return;
    
    try {
      const statusResponse = await api.get('/system/status');
      if (statusResponse.success && statusResponse.data) {
        // API 응답 데이터를 명시적으로 SystemStatus 타입으로 변환
        const data = statusResponse.data as any;
        const systemStatusData: SystemStatus = {
          success: data.success || false,
          status: data.status || '상태 정보 없음',
          timestamp: data.timestamp || new Date().toISOString(),
          details: data.details || {}
        };
        setSystemStatus(systemStatusData);
      }
    } catch (err) {
      console.error('시스템 상태 가져오기 오류:', err);
    }
  }, [user?.is_superuser]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchUserData();
        
        // 나머지 코드는 fetchUserData와 fetchSystemStatus에서 처리
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [fetchUserData]);
  
  // 사용자 정보가 로드된 후 시스템 상태 가져오기
  useEffect(() => {
    if (user?.is_superuser) {
      fetchSystemStatus();
    }
  }, [user?.is_superuser, fetchSystemStatus]);
  
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
      <div className="max-w-7xl mx-auto">
        {/* 사용자 정보 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">내 정보</h2>
          
          {user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-4">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">이름</p>
                    <p className="font-medium text-gray-900">{user.username}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-4">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">아이디</p>
                    <p className="font-medium text-gray-900">{user.username}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">이메일</p>
                    <p className="font-medium text-gray-900">{user.email || '등록된 이메일이 없습니다.'}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mr-4">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">가입일</p>
                    <p className="font-medium text-gray-900">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 발급받은 IP 정보 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-gray-900">발급받은 IP</h2>
            <Link 
              href="/dashboard/user/my-devices" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              전체 보기 &rarr;
            </Link>
          </div>
          
          {devices.length > 0 ? (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {device.device_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.mac_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.assigned_ip || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {device.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <NetworkIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>등록된 IP가 없습니다.</p>
              <Link 
                href="/dashboard/user/my-devices" 
                className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
              >
                IP 관리로 이동
              </Link>
            </div>
          )}
        </div>
        
        {/* 대여한 장비 현황 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-gray-900">대여한 장비 현황</h2>
            <Link 
              href="/dashboard/user/rentals" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              전체 보기 &rarr;
            </Link>
          </div>
          
          {rentals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      장비명
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대여일
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      반납 예정일
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rentals.map((rental) => (
                    <tr key={rental.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rental.equipment.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(rental.rental_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(rental.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rental.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                          rental.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rental.status_display}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>대여한 장비가 없습니다.</p>
              <Link 
                href="/dashboard/user/rentals" 
                className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
              >
                장비 대여 페이지로 이동
              </Link>
            </div>
          )}
        </div>
        
        {/* 관리 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link 
            href="/dashboard/user/my-devices"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
          >
            <Laptop className="w-8 h-8 text-blue-500 mr-4" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">내 IP 관리</h2>
              <p className="text-sm text-gray-500">내 기기 등록 및 IP 관리</p>
            </div>
          </Link>
          
          {isAdmin && (
            <Link 
              href="/dashboard/user/admin"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Shield className="w-8 h-8 text-purple-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">관리자 페이지</h2>
                <p className="text-sm text-gray-500">계정 현황 및 시스템 설정</p>
              </div>
            </Link>
          )}
        </div>
        
        {/* 시스템 상태 - 관리자만 볼 수 있음 */}
        {isAdmin && systemStatus && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">시스템 상태</h2>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            {systemStatus && (
              <div>
                <div className="flex items-center mb-4">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    systemStatus.status.includes('정상') ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-gray-700 font-medium">{systemStatus.status}</p>
                  <p className="text-gray-500 text-sm ml-4">마지막 업데이트: {new Date(systemStatus.timestamp).toLocaleString()}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* CPU 사용량 */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Cpu className="w-5 h-5 text-blue-500 mr-2" />
                      <h3 className="text-md font-medium text-gray-700">CPU 사용량</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{systemStatus.details.cpu}</p>
                  </div>
                  
                  {/* 메모리 사용량 */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <BarChart className="w-5 h-5 text-green-500 mr-2" />
                      <h3 className="text-md font-medium text-gray-700">메모리 사용량</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{systemStatus.details.memory}</p>
                  </div>
                  
                  {/* 디스크 사용량 */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <HardDrive className="w-5 h-5 text-yellow-500 mr-2" />
                      <h3 className="text-md font-medium text-gray-700">디스크 사용량</h3>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{systemStatus.details.disk}</p>
                  </div>
                  
                  {/* 네트워크 상태 */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Server className="w-5 h-5 text-purple-500 mr-2" />
                      <h3 className="text-md font-medium text-gray-700">네트워크 상태</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {systemStatus.details.network === 'online' ? '정상' : '오프라인'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 시스템 로드 */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-md font-medium text-gray-700 mb-2">시스템 로드</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-sm text-gray-500">1분</p>
                        <p className="font-medium">{systemStatus.details.load_avg['1min'].toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">5분</p>
                        <p className="font-medium">{systemStatus.details.load_avg['5min'].toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">15분</p>
                        <p className="font-medium">{systemStatus.details.load_avg['15min'].toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 기타 정보 */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-md font-medium text-gray-700 mb-2">기타 정보</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-gray-500">활성 프로세스</p>
                        <p className="font-medium">{systemStatus.details.active_processes}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">부팅 시간</p>
                        <p className="font-medium text-xs">{systemStatus.details.boot_time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 