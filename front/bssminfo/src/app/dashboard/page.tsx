'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Laptop, Wifi, Shield, UserCog, Server, DatabaseIcon, BarChart, Users, User, History, Network, Ban, BookOpen, Home, Settings, Volume2, GraduationCap, Crown, Monitor, FileText, Radio, Mic, Headphones, Database, Globe, Activity } from 'lucide-react';
import authService from '@/services/auth';
import adminService from '@/services/admin';
import api from '@/services/api';
import { Card, CardLink, Heading, Text } from '@/components/ui/StyledComponents';

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
      <div className="loading-container">
        <div className="loading-spinner"></div>
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
    <div className="page-container">
      <div className="page-content">
        {/* 간단한 헤더 */}
        <div className="page-header">
          <div className="page-header-flex">
            <div>
              <Heading level={1} className="page-title">{getDashboardTitle()}</Heading>
              <Text className="page-subtitle">환영합니다, {user.username} 님!</Text>
            </div>
          </div>
        </div>
        
        {/* 에러 메시지 */}
        {error && (
          <div className="error-message">
            <div className="error-content">
              <Text className="error-text">{error}</Text>
            </div>
          </div>
        )}
        
        {/* 공통 메뉴 */}
        <div className="mb-8">
          <Heading level={2} className="mb-4 flex items-center">
            <Home className="w-6 h-6 mr-2 text-blue-500" />
            공통 메뉴
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <CardLink href="/dashboard">
              <Home className="icon-large text-blue-500 mr-4" />
              <div>
                <Heading level={3}>대시보드</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">홈 화면으로 이동</Text>
              </div>
            </CardLink>
            
            <CardLink href="/dashboard/user">
              <User className="icon-large text-indigo-500 mr-4" />
              <div>
                <Heading level={3}>내 정보</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">사용자 정보 관리</Text>
              </div>
            </CardLink>
            
            <CardLink href="/dashboard/user/my-ips">
              <Laptop className="icon-large text-blue-500 mr-4" />
              <div>
                <Heading level={3}>내 IP 관리</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">IP 주소 등록 및 관리</Text>
              </div>
            </CardLink>
            
            <CardLink href="/dashboard/user/ip-assignments">
              <Network className="icon-large text-green-500 mr-4" />
              <div>
                <Heading level={3}>내 IP 발급 내역</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">IP 발급 내역 조회</Text>
              </div>
            </CardLink>
            
            <CardLink href="/dashboard/user/rentals">
              <BookOpen className="icon-large text-orange-500 mr-4" />
              <div>
                <Heading level={3}>장비 대여</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">장비 대여 신청</Text>
              </div>
            </CardLink>
            
            <CardLink href="/dashboard/user/rental-history">
              <History className="icon-large text-purple-500 mr-4" />
              <div>
                <Heading level={3}>장비 대여 내역</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">장비 대여 기록 확인</Text>
              </div>
            </CardLink>
            
            <CardLink href="/dashboard/user/change-password">
              <Settings className="icon-large text-gray-500 mr-4" />
              <div>
                <Heading level={3}>비밀번호 변경</Heading>
                <Text className="text-sm text-gray-500 dark:text-gray-400">계정 비밀번호 변경</Text>
              </div>
            </CardLink>
          </div>
        </div>
        
        {/* 교사 전용 메뉴 */}
        {user.is_staff && (
          <div className="mb-8">
            <Heading level={2} className="mb-4 flex items-center">
              <GraduationCap className="w-6 h-6 mr-2 text-indigo-500" />
              교사 기능
            </Heading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <CardLink href="/dashboard/teacher/broadcast">
                <Volume2 className="icon-large text-indigo-500 mr-4" />
                <div>
                  <Heading level={3}>방송하기</Heading>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">텍스트 및 오디오 방송</Text>
                </div>
              </CardLink>
            </div>
          </div>
        )}
        
        {/* 관리자 전용 메뉴 */}
        {user.is_superuser && (
          <>
            <div className="mb-8">
              <Heading level={2} className="mb-4 flex items-center">
                <Crown className="w-6 h-6 mr-2 text-yellow-500" />
                관리자 기능
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <CardLink href="/dashboard/admin/users">
                  <Users className="icon-large text-orange-500 mr-4" />
                  <div>
                    <Heading level={3}>사용자 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">사용자 계정 관리</Text>
                  </div>
                </CardLink>
                
                <CardLink href="/dashboard/admin/ip-management">
                  <Ban className="icon-large text-red-500 mr-4" />
                  <div>
                    <Heading level={3}>IP 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">장치 및 IP 블랙리스트 관리</Text>
                  </div>
                </CardLink>
                
                <CardLink href="/dashboard/admin/ip-assignments">
                  <Network className="icon-large text-blue-500 mr-4" />
                  <div>
                    <Heading level={3}>IP 발급 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">전체 IP 발급 내역 관리</Text>
                  </div>
                </CardLink>
                
                <CardLink href="/dashboard/admin/equipment">
                  <Laptop className="icon-large text-green-500 mr-4" />
                  <div>
                    <Heading level={3}>장비 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">장비 등록 및 관리</Text>
                  </div>
                </CardLink>
                
                <CardLink href="/dashboard/admin/rentals">
                  <BookOpen className="icon-large text-purple-500 mr-4" />
                  <div>
                    <Heading level={3}>대여 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">장비 대여 신청 관리</Text>
                  </div>
                </CardLink>
                
                <CardLink href="/dashboard/admin/broadcast-management">
                  <Volume2 className="icon-large text-indigo-500 mr-4" />
                  <div>
                    <Heading level={3}>방송 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">전체 방송 이력 및 프리뷰 관리</Text>
                  </div>
                </CardLink>
                
                <CardLink href="/dashboard/admin/dns">
                  <Server className="icon-large text-cyan-500 mr-4" />
                  <div>
                    <Heading level={3}>DNS 관리</Heading>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">DNS 설정 관리</Text>
                  </div>
                </CardLink>
              </div>
            </div>
            
            {/* 시스템 상태 (관리자만) */}
            {systemStatus && (
              <div className="mb-8">
                <Heading level={2} className="mb-4 flex items-center">
                  <Activity className="w-6 h-6 mr-2 text-green-500" />
                  시스템 상태
                </Heading>
                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {systemStatus.details?.cpu || 'N/A'}
                      </div>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">CPU 사용률</Text>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {systemStatus.details?.memory || 'N/A'}
                      </div>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">메모리 사용률</Text>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {systemStatus.details?.disk || 'N/A'}
                      </div>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">디스크 사용률</Text>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {systemStatus.details?.active_processes || 'N/A'}
                      </div>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">활성 프로세스</Text>
                    </div>
                  </div>
                  <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    마지막 업데이트: {systemStatus.timestamp ? new Date(systemStatus.timestamp).toLocaleString('ko-KR') : 'N/A'}
                  </Text>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 