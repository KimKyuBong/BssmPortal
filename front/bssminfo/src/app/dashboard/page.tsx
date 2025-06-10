'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Laptop, Wifi, Shield, UserCog, Server, DatabaseIcon, BarChart, Users, User, History, Network, Ban, BookOpen, Home, Settings } from 'lucide-react';
import authService from '@/services/auth';
import adminService from '@/services/admin';
import api from '@/services/api';

// 시스템 상태 타입 정의
interface SystemStatusDetails {
  cpu?: string;
  memory?: string;
  disk?: string;
  network?: string;
  boot_time?: string;
  load_avg?: {
    '1min'?: number;
    '5min'?: number;
    '15min'?: number;
  };
  active_processes?: number;
  last_check?: string;
}

interface SystemStatus {
  success?: boolean;
  status?: string;
  timestamp?: string;
  details?: SystemStatusDetails;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (!response.success || !response.data) {
          router.push('/login');
          return;
        }
        
        setUser(response.data);
      } catch (err) {
        console.error('사용자 정보 조회 중 오류 발생:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // 시스템 상태 불러오기
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        // API 직접 호출 (api.get 사용)
        const statusResponse = await api.get('/system/status');
        if (statusResponse.success && statusResponse.data) {
          // API 응답 데이터를 SystemStatus 타입으로 변환
          const data = statusResponse.data as any;
          const systemStatusData: SystemStatus = {
            success: data.success || false,
            status: data.status || '상태 정보 없음',
            timestamp: data.timestamp || new Date().toISOString(),
            details: data.details || {}
          };
          setSystemStatus(systemStatusData);
        }
      } catch (error) {
        console.error('시스템 상태 조회 중 오류 발생:', error);
      }
    };

    // 관리자만 시스템 상태 조회
    if (user && user.is_superuser) {
      fetchSystemStatus();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 페이지 제목 가져오기
  const getDashboardTitle = () => {
    if (user.is_superuser) {
      return '관리자 대시보드';
    } else if (user.is_staff) {
      return '교사 대시보드';
    } else {
      return '학생 대시보드';
    }
  };
  
  return (
    <div>
      {/* 간단한 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{getDashboardTitle()}</h1>
        <p className="text-gray-600 mt-1">환영합니다, {user.username} 님!</p>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 메뉴 바로가기 카드 (모든 사용자에게 표시) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link 
          href="/dashboard"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <Home className="w-8 h-8 text-blue-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">대시보드</h2>
            <p className="text-sm text-gray-500">홈 화면으로 이동</p>
          </div>
        </Link>
        
        <Link 
          href="/dashboard/user"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <User className="w-8 h-8 text-indigo-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">내 정보</h2>
            <p className="text-sm text-gray-500">사용자 정보 관리</p>
          </div>
        </Link>
        
        <Link 
          href="/dashboard/user/my-devices"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <Laptop className="w-8 h-8 text-blue-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">내 IP 관리</h2>
            <p className="text-sm text-gray-500">IP 주소 등록 및 관리</p>
          </div>
        </Link>
        
        <Link 
          href="/dashboard/user/ip-assignments"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <Network className="w-8 h-8 text-green-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">내 IP 발급 내역</h2>
            <p className="text-sm text-gray-500">IP 발급 내역 조회</p>
          </div>
        </Link>
        
        <Link 
          href="/dashboard/user/rentals"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <BookOpen className="w-8 h-8 text-orange-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">장비 대여</h2>
            <p className="text-sm text-gray-500">장비 대여 신청</p>
          </div>
        </Link>
        
        <Link 
          href="/dashboard/user/rental-history"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <History className="w-8 h-8 text-purple-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">장비 대여 내역</h2>
            <p className="text-sm text-gray-500">장비 대여 기록 확인</p>
          </div>
        </Link>
        
        <Link 
          href="/dashboard/user/change-password"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
        >
          <Settings className="w-8 h-8 text-gray-500 mr-4" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">비밀번호 변경</h2>
            <p className="text-sm text-gray-500">계정 비밀번호 변경</p>
          </div>
        </Link>
      </div>
      
      {/* 교사 전용 메뉴 */}
      {user.is_staff && !user.is_superuser && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-4">교사 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link 
              href="/dashboard/admin"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Users className="w-8 h-8 text-orange-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">사용자 관리</h2>
                <p className="text-sm text-gray-500">사용자 계정 관리</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/ip-assignments"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Network className="w-8 h-8 text-blue-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">IP 할당 내역</h2>
                <p className="text-sm text-gray-500">사용자 IP 할당 내역 조회</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/equipment"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Shield className="w-8 h-8 text-green-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">장비 관리</h2>
                <p className="text-sm text-gray-500">대여 가능한 장비 관리</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/rental-requests"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <BookOpen className="w-8 h-8 text-purple-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">대여 요청 관리</h2>
                <p className="text-sm text-gray-500">장비 대여 요청 관리</p>
              </div>
            </Link>
          </div>
        </>
      )}
      
      {/* 관리자 전용 메뉴 */}
      {user.is_superuser && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-4">관리자 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link 
              href="/dashboard/admin"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Users className="w-8 h-8 text-orange-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">사용자 관리</h2>
                <p className="text-sm text-gray-500">사용자 계정 관리</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/ip-management"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Ban className="w-8 h-8 text-red-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">IP 관리</h2>
                <p className="text-sm text-gray-500">장치 및 IP 블랙리스트 관리</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/ip-assignments"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Network className="w-8 h-8 text-blue-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">IP 할당 내역</h2>
                <p className="text-sm text-gray-500">사용자 IP 할당 내역 조회</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/equipment"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <Shield className="w-8 h-8 text-green-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">장비 관리</h2>
                <p className="text-sm text-gray-500">대여 가능한 장비 관리</p>
              </div>
            </Link>
            
            <Link 
              href="/dashboard/admin/rental-requests"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex items-center"
            >
              <BookOpen className="w-8 h-8 text-purple-500 mr-4" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">대여 요청 관리</h2>
                <p className="text-sm text-gray-500">장비 대여 요청 관리</p>
              </div>
            </Link>
          </div>
          
          {/* 시스템 상태 섹션 (관리자만 볼 수 있음) */}
          {systemStatus && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">시스템 상태</h2>
              
              <div className="flex items-center mb-4">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  systemStatus.status?.includes('정상') ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <p className="text-gray-700 font-medium">{systemStatus.status}</p>
                <p className="text-gray-500 text-sm ml-4">마지막 업데이트: {new Date(systemStatus.timestamp || '').toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* CPU 사용량 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Server className="w-5 h-5 text-blue-500 mr-2" />
                    <h3 className="text-md font-medium text-gray-700">CPU 사용량</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{systemStatus.details?.cpu || 'N/A'}</p>
                </div>
                
                {/* 메모리 사용량 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <BarChart className="w-5 h-5 text-green-500 mr-2" />
                    <h3 className="text-md font-medium text-gray-700">메모리 사용량</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{systemStatus.details?.memory || 'N/A'}</p>
                </div>
                
                {/* 디스크 사용량 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <DatabaseIcon className="w-5 h-5 text-yellow-500 mr-2" />
                    <h3 className="text-md font-medium text-gray-700">디스크 사용량</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{systemStatus.details?.disk || 'N/A'}</p>
                </div>
                
                {/* 네트워크 상태 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Wifi className="w-5 h-5 text-purple-500 mr-2" />
                    <h3 className="text-md font-medium text-gray-700">네트워크 상태</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {systemStatus.details?.network === 'online' ? '정상' : '오프라인'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 