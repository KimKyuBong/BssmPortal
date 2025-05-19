import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import authService, { User } from '@/services/auth';

/**
 * 애플리케이션 전역 상태를 관리하는 커스텀 훅
 * 사용자 인증, 상태 로딩, 네비게이션 활성화 등을 처리합니다.
 */
export const useAppState = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 경로 활성화 상태 확인 함수
  const isActive = useCallback((href: string, currentPath: string) => {
    // 대시보드 홈 페이지 처리
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/dashboard/';
    }
    
    // 특정 관리자 페이지 처리
    if (href === '/dashboard/user/admin') {
      return currentPath === '/dashboard/user/admin' || currentPath === '/dashboard/user/admin/';
    }
    
    // 메인 경로(/dashboard/user)와 하위 경로(/dashboard/user/my-devices)를 명확히 구분
    if (href === '/dashboard/user') {
      return currentPath === '/dashboard/user' || currentPath === '/dashboard/user/';
    }
    
    // 정확한 경로 매칭 (하위 경로는 별도로 처리)
    return currentPath === href || currentPath === href + '/';
  }, []);

  // 현재 사용자 정보 가져오기
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      
      if (response.success && response.data) {
        setUser(response.data);
        return true;
      } else {
        setUser(null);
        setError('사용자 정보를 가져오는데 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('사용자 정보 가져오기 오류:', err);
      setError('사용자 정보를 가져오는 중 오류가 발생했습니다.');
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그아웃 처리
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/');
      return true;
    } catch (err) {
      console.error('로그아웃 오류:', err);
      setError('로그아웃 중 오류가 발생했습니다.');
      return false;
    }
  }, [router]);

  // 사용자 권한 확인 함수들
  const isAdmin = useCallback(() => {
    return user?.is_superuser === true;
  }, [user]);

  const isTeacher = useCallback(() => {
    return user?.is_staff === true && user?.is_superuser !== true;
  }, [user]);

  const isStudent = useCallback(() => {
    return user?.is_staff !== true && user?.is_superuser !== true;
  }, [user]);

  // 사용자 권한에 따른 헤더 텍스트
  const getHeaderTitle = useCallback(() => {
    if (user?.is_superuser) {
      return '부산소프트웨어마이스터고 관리자 포털';
    } else if (user?.is_staff) {
      return '부산소프트웨어마이스터고 교사 포털';
    } else {
      return '부산소프트웨어마이스터고 학생 포털';
    }
  }, [user]);

  // 사이드바 토글
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    user,
    loading,
    error,
    pathname,
    sidebarOpen,
    isActive,
    isAdmin,
    isTeacher,
    isStudent,
    fetchCurrentUser,
    handleLogout,
    getHeaderTitle,
    toggleSidebar,
    setSidebarOpen,
  };
};

export default useAppState; 