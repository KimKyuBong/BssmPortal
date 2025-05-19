import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import authService, { User } from '@/services/auth';

/**
 * 인증 관련 기능을 제공하는 커스텀 훅
 * 사용자 로그인 상태 관리, 로그인/로그아웃 기능, 권한 확인 등을 제공합니다.
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 현재 사용자 정보 가져오기
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      
      if (response.success && response.data) {
        setUser(response.data);
        return response.data;
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error('사용자 정보 가져오기 오류:', err);
      setError('사용자 정보를 가져오는 중 오류가 발생했습니다.');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그인 시도
  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login({ username, password });
      
      if (response.success) {
        setUser(response.data || null);
        return { success: true, data: response.data };
      } else {
        setError(response.message || '로그인에 실패했습니다.');
        return { success: false, message: response.message };
      }
    } catch (err: any) {
      const errorMessage = err.message || '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || '로그아웃 중 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [router]);

  // 권한 확인
  const isAdmin = useCallback(() => {
    return user?.is_superuser === true;
  }, [user]);

  const isTeacher = useCallback(() => {
    return user?.is_staff === true && user?.is_superuser !== true;
  }, [user]);

  const isStudent = useCallback(() => {
    return user?.is_staff !== true && user?.is_superuser !== true;
  }, [user]);

  // 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin,
    isTeacher,
    isStudent,
    login,
    logout,
    fetchCurrentUser,
  };
};

export default useAuth; 