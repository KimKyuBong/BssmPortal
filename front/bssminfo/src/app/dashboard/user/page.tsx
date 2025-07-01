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
import type { Equipment, Rental, RentalRequest } from '@/services/api';
import DeviceTable from '@/components/ui/DeviceTable';
import { formatDateToKorean } from '@/utils/dateUtils';

// Device 타입 확장
interface ExtendedDevice extends Device {
  last_seen?: string;
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
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto">
        {/* 사용자 정보 */}
        <div className="card mb-6">
          <h2 className="text-xl font-medium text-primary mb-4">내 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-secondary mb-2">기본 정보</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">아이디:</span>
                  <p className="font-medium text-primary">{user.username}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">이름:</span>
                  <p className="font-medium text-primary">{user.username}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">권한:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_superuser ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    user.is_staff ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {user.is_superuser ? '관리자' : user.is_staff ? '교사' : '학생'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-secondary mb-2">연락처 정보</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">이메일:</span>
                  <p className="font-medium text-primary">{user.email || '등록된 이메일이 없습니다.'}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">가입일:</span>
                  <p className="font-medium text-primary">{user.date_joined ? formatDateToKorean(user.date_joined) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 발급받은 IP 정보 */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-primary">발급받은 IP</h2>
            <Link 
              href="/dashboard/user/my-ips" 
              className="link text-sm"
            >
              전체 보기 &rarr;
            </Link>
          </div>
          
          {devices.length > 0 ? (
            <DeviceTable
              devices={devices}
              showActions={false}
            />
          ) : (
            <div className="text-center py-4 text-muted">
              <NetworkIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>등록된 IP가 없습니다.</p>
              <Link 
                href="/dashboard/user/my-ips" 
                className="link mt-2 inline-block text-sm"
              >
                IP 관리로 이동
              </Link>
            </div>
          )}
        </div>
        
        {/* 대여한 장비 현황 */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-primary">대여한 장비 현황</h2>
            <Link 
              href="/dashboard/user/rentals" 
              className="link text-sm"
            >
              전체 보기 &rarr;
            </Link>
          </div>
          
          {rentals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">
                      장비명
                    </th>
                    <th scope="col">
                      대여일
                    </th>
                    <th scope="col">
                      반납 예정일
                    </th>
                    <th scope="col">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((rental) => (
                    <tr key={rental.id}>
                      <td className="whitespace-nowrap text-sm font-medium text-primary">
                        {rental.equipment.asset_number}
                      </td>
                      <td className="whitespace-nowrap text-sm text-secondary">
                        {rental.rental_date ? formatDateToKorean(rental.rental_date) : '-'}
                      </td>
                      <td className="whitespace-nowrap text-sm text-secondary">
                        {rental.due_date ? formatDateToKorean(rental.due_date) : '-'}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rental.status === 'RENTED' ? 'status-completed' : 'status-pending'
                        }`}>
                          {rental.status === 'RENTED' ? '대여 중' : rental.status_display}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>대여한 장비가 없습니다.</p>
              <Link 
                href="/dashboard/user/rentals" 
                className="link mt-2 inline-block text-sm"
              >
                장비 대여 페이지로 이동
              </Link>
            </div>
          )}
        </div>
        
        {/* 관리 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link 
            href="/dashboard/user/my-ips"
            className="card-hover"
          >
            <Laptop className="w-8 h-8 text-blue-500 mr-4" />
            <div>
              <h2 className="text-lg font-medium text-primary">내 IP 관리</h2>
              <p className="text-sm text-secondary">내 기기 등록 및 IP 관리</p>
            </div>
          </Link>
          
          {isAdmin && (
            <Link 
              href="/dashboard/admin/users"
              className="card-hover"
            >
              <Shield className="w-8 h-8 text-purple-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-primary">관리자 페이지</h2>
                <p className="text-sm text-secondary">계정 현황 및 시스템 설정</p>
              </div>
            </Link>
          )}
        </div>
        
        {/* 시스템 상태 - 관리자만 볼 수 있음 */}
        {isAdmin && systemStatus && (
          <div className="card mb-8">
            <h2 className="text-lg font-medium text-primary mb-4">시스템 상태</h2>
            
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            {systemStatus && (
              <div>
                <div className="flex items-center mb-4">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    systemStatus.status.includes('정상') ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-secondary font-medium">{systemStatus.status}</p>
                  <p className="text-muted text-sm ml-4">마지막 업데이트: {new Date(systemStatus.timestamp).toLocaleString()}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* CPU 사용량 */}
                  <div className="border rounded-lg p-4 dark:border-gray-600">
                    <div className="flex items-center mb-2">
                      <Cpu className="w-5 h-5 text-blue-500 mr-2" />
                      <h3 className="text-md font-medium text-secondary">CPU 사용량</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{systemStatus.details.cpu}</p>
                  </div>
                  
                  {/* 메모리 사용량 */}
                  <div className="border rounded-lg p-4 dark:border-gray-600">
                    <div className="flex items-center mb-2">
                      <BarChart className="w-5 h-5 text-green-500 mr-2" />
                      <h3 className="text-md font-medium text-secondary">메모리 사용량</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{systemStatus.details.memory}</p>
                  </div>
                  
                  {/* 디스크 사용량 */}
                  <div className="border rounded-lg p-4 dark:border-gray-600">
                    <div className="flex items-center mb-2">
                      <HardDrive className="w-5 h-5 text-yellow-500 mr-2" />
                      <h3 className="text-md font-medium text-secondary">디스크 사용량</h3>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{systemStatus.details.disk}</p>
                  </div>
                  
                  {/* 네트워크 상태 */}
                  <div className="border rounded-lg p-4 dark:border-gray-600">
                    <div className="flex items-center mb-2">
                      <Server className="w-5 h-5 text-purple-500 mr-2" />
                      <h3 className="text-md font-medium text-secondary">네트워크 상태</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {systemStatus.details.network === 'online' ? '정상' : '오프라인'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 시스템 로드 */}
                  <div className="border rounded-lg p-4 dark:border-gray-600">
                    <h3 className="text-md font-medium text-secondary mb-2">시스템 로드</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-sm text-muted">1분</p>
                        <p className="font-medium text-primary">
                          {systemStatus.details.load_avg?.['1min'] !== undefined 
                            ? systemStatus.details.load_avg['1min'].toFixed(2) 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">5분</p>
                        <p className="font-medium text-primary">
                          {systemStatus.details.load_avg?.['5min'] !== undefined 
                            ? systemStatus.details.load_avg['5min'].toFixed(2) 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">15분</p>
                        <p className="font-medium text-primary">
                          {systemStatus.details.load_avg?.['15min'] !== undefined 
                            ? systemStatus.details.load_avg['15min'].toFixed(2) 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 기타 정보 */}
                  <div className="border rounded-lg p-4 dark:border-gray-600">
                    <h3 className="text-md font-medium text-secondary mb-2">기타 정보</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted">활성 프로세스</p>
                        <p className="font-medium text-primary">{systemStatus.details.active_processes}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">부팅 시간</p>
                        <p className="font-medium text-primary text-xs">{systemStatus.details.boot_time}</p>
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