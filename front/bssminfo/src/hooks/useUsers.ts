import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import adminService from '@/services/admin';
import { User, CreateUserRequest, PaginatedResponse } from '@/services/admin';

// API 응답 타입
interface PasswordResetResponse {
  password?: string;
  new_password?: string;
  message?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<number, boolean>>({});
  const [lastSelectedUser, setLastSelectedUser] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // 검색어로 필터링된 사용자 목록
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    return users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.user_name && user.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  // 선택된 사용자 목록
  const selectedList = useMemo(() => {
    return users.filter(user => selectedUsers[user.id]);
  }, [users, selectedUsers]);

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 검색어가 있는 경우, 서버에 검색 쿼리 파라미터를 추가합니다.
      const response = await adminService.getAllUsers(currentPage, searchTerm.trim() || undefined);
      
      // 응답 데이터 검증
      if (!response || !response.results) {
        console.error('API 응답이 올바르지 않습니다:', response);
        setError('사용자 데이터를 불러오는데 실패했습니다.');
        return;
      }
      
      // PaginatedResponse 타입으로 처리
      setUsers(response.results);
      setTotalUsers(response.count);
      setNextPageUrl(response.next);
      setPrevPageUrl(response.previous);
      
      // 현재 페이지가 유효 범위를 벗어나면 1페이지로 리셋
      const maxPage = Math.ceil(response.count / 100);
      if (currentPage > maxPage && maxPage > 0) {
        console.warn(`현재 페이지(${currentPage})가 최대 페이지(${maxPage})를 초과하여 1페이지로 이동합니다.`);
        setCurrentPage(1);
        // 1페이지 데이터 다시 요청
        const firstPageResponse = await adminService.getAllUsers(1, searchTerm.trim() || undefined);
        if (firstPageResponse && firstPageResponse.results) {
          setUsers(firstPageResponse.results);
          setNextPageUrl(firstPageResponse.next);
          setPrevPageUrl(firstPageResponse.previous);
        }
      }
    } catch (err) {
      console.error('사용자 목록 조회 중 오류:', err);
      setError('사용자 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  // 다음 페이지 이동
  const goToNextPage = useCallback(async () => {
    if (!nextPageUrl) return;
    
    setLoading(true);
    try {
      const response = await adminService.getUsersWithUrl(nextPageUrl);
      
      if (!response) {
        setError('다음 페이지를 불러오는데 실패했습니다.');
        return;
      }
      
      // PaginatedResponse 타입으로 처리
      setUsers(response.results);
      setTotalUsers(response.count);
      setNextPageUrl(response.next);
      setPrevPageUrl(response.previous);
      setCurrentPage(prev => prev + 1);
    } catch (error) {
      console.error('다음 페이지 불러오기 실패:', error);
      setError('다음 페이지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [nextPageUrl]);

  // 이전 페이지 이동
  const goToPrevPage = useCallback(async () => {
    if (!prevPageUrl) return;
    
    setLoading(true);
    try {
      const response = await adminService.getUsersWithUrl(prevPageUrl);
      
      if (!response) {
        setError('이전 페이지를 불러오는데 실패했습니다.');
        return;
      }
      
      // PaginatedResponse 타입으로 처리
      setUsers(response.results);
      setTotalUsers(response.count);
      setNextPageUrl(response.next);
      setPrevPageUrl(response.previous);
      setCurrentPage(prev => prev - 1);
    } catch (error) {
      console.error('이전 페이지 불러오기 실패:', error);
      setError('이전 페이지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [prevPageUrl]);

  // 특정 페이지로 이동
  const goToPage = useCallback(async (page: number) => {
    if (page === currentPage) return;
    
    // 유효한 페이지 번호 검증
    const maxPage = Math.ceil(totalUsers / 100); // 서버 페이지 크기는 100
    if (page < 1 || page > maxPage) {
      setError(`유효하지 않은 페이지입니다. (1-${maxPage} 범위 내에서 선택해주세요)`);
      return;
    }
    
    setLoading(true);
    try {
      const response = await adminService.getAllUsers(page);
      
      if (!response) {
        setError('페이지를 불러오는데 실패했습니다.');
        return;
      }
      
      // PaginatedResponse 타입으로 처리
      setUsers(response.results);
      setTotalUsers(response.count);
      setNextPageUrl(response.next);
      setPrevPageUrl(response.previous);
      setCurrentPage(page);
    } catch (error) {
      console.error('특정 페이지 불러오기 실패:', error);
      setError('페이지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, totalUsers]);

  // 컴포넌트 마운트 시 사용자 목록 조회
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (userData: CreateUserRequest) => {
    try {
      setLoading(true);
      const response = await adminService.createUser(userData);
      if (response.success) {
        await fetchUsers();
        return { success: true, message: '사용자가 성공적으로 생성되었습니다.' };
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '사용자 생성 중 오류가 발생했습니다.';
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, message: '사용자 생성 중 오류가 발생했습니다.' };
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.deleteUser(id);
      if (response.success) {
        // UI에서 사용자 제거
        setUsers(prev => prev.filter(user => user.id !== id));
        setSelectedUsers(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        // 성공 메시지 반환
        return { 
          success: true, 
          message: response.data?.message || '사용자가 성공적으로 삭제되었습니다.' 
        };
      } else {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '사용자 삭제에 실패했습니다.';
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '사용자 삭제에 실패했습니다.';
      setError(errorMsg);
      console.error(err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = async (id: number, newPassword?: string): Promise<{ success: boolean; password: string | null }> => {
    console.log('[DEBUG] useUsers.resetPassword 호출:', { id, newPassword: newPassword ? '제공됨' : '제공되지 않음' });
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.resetUserPassword(id, newPassword);
      console.log('[DEBUG] resetPassword API 응답:', response);
      if (response.success) {
        const resetData = response.data as PasswordResetResponse;
        return { 
          success: true, 
          password: resetData?.new_password || resetData?.password || null 
        };
      } else {
        setError(response.message || '비밀번호 초기화에 실패했습니다.');
        return { success: false, password: null };
      }
    } catch (error: any) {
      console.error('[DEBUG] resetPassword 오류:', error);
      setError(error.message || '비밀번호 초기화 중 오류가 발생했습니다.');
      return { success: false, password: null };
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedIds = Object.entries(selectedUsers)
        .filter(([_, selected]) => selected)
        .map(([id, _]) => parseInt(id));
      
      if (selectedIds.length === 0) {
        setError('선택된 사용자가 없습니다.');
        setLoading(false);
        return false;
      }

      const results = await Promise.all(
        selectedIds.map(async id => {
          const response = await adminService.deleteUser(id);
          return response.success;
        })
      );

      // 모든 작업이 성공했는지 확인
      const allSucceeded = results.every(success => success);
      
      if (allSucceeded) {
        // 사용자 목록 새로고침
        await fetchUsers();
        setSelectedUsers({});
        return true;
      } else {
        setError('일부 사용자의 삭제에 실패했습니다.');
        await fetchUsers();
        return false;
      }
    } catch (err) {
      setError('사용자 삭제에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, fetchUsers]);

  const handleBulkResetPasswords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedIds = Object.entries(selectedUsers)
        .filter(([_, selected]) => selected)
        .map(([id, _]) => parseInt(id));
      
      if (selectedIds.length === 0) {
        setError('선택된 사용자가 없습니다.');
        setLoading(false);
        return { success: false, results: [] };
      }

      const results = await Promise.all(
        selectedIds.map(async id => {
          const user = users.find(u => u.id === id);
          const response = await adminService.resetUserPassword(id);
          const resetData = response.data as PasswordResetResponse;
          return {
            id,
            username: user?.username || '알 수 없음',
            success: response.success,
            password: resetData?.password || null
          };
        })
      );

      // 성공한 결과만 필터링
      const successResults = results.filter(result => result.success);
      
      if (successResults.length > 0) {
        return { success: true, results: successResults };
      } else {
        setError('모든 비밀번호 초기화에 실패했습니다.');
        return { success: false, results: [] };
      }
    } catch (err) {
      setError('비밀번호 초기화에 실패했습니다.');
      console.error(err);
      return { success: false, results: [] };
    } finally {
      setLoading(false);
    }
  }, [users, selectedUsers]);

  const downloadUserTemplate = useCallback(async (count: number) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await adminService.getUserImportTemplate(count);
      if (blob) {
        // Blob URL 생성 및 다운로드 링크 클릭 시뮬레이션
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `사용자_등록_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
      } else {
        setError('템플릿 다운로드에 실패했습니다.');
        return false;
      }
    } catch (err) {
      setError('템플릿 다운로드에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportUsersToExcel = useCallback(async () => {
    try {
      const response = await adminService.exportUsersToExcel();
      if (response instanceof Blob) {
        // Blob URL 생성 및 다운로드 링크 클릭 시뮬레이션
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = `사용자_목록_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
      } else {
        setError('엑셀 파일 다운로드에 실패했습니다.');
        return false;
      }
    } catch (err) {
      setError('엑셀 파일 다운로드에 실패했습니다.');
      console.error(err);
      return false;
    }
  }, []);

  const handleUserSelection = useCallback((id: number, event: React.MouseEvent) => {
    setSelectedUsers(prev => {
      const newSelectedUsers = { ...prev };
      
      // Shift 키를 누른 경우, 마지막 선택된 항목부터 현재 항목까지 범위 선택
      if (event.shiftKey && lastSelectedUser !== null) {
        const userIds = users.map(user => user.id);
        const startIdx = userIds.indexOf(lastSelectedUser);
        const endIdx = userIds.indexOf(id);
        
        if (startIdx !== -1 && endIdx !== -1) {
          const start = Math.min(startIdx, endIdx);
          const end = Math.max(startIdx, endIdx);
          
          for (let i = start; i <= end; i++) {
            newSelectedUsers[userIds[i]] = true;
          }
        }
      } 
      // Ctrl/Cmd 키를 누른 경우, 개별 토글
      else if (event.ctrlKey || event.metaKey) {
        newSelectedUsers[id] = !newSelectedUsers[id];
        setLastSelectedUser(id);
      } 
      // 아무 키도 누르지 않은 경우, 기존 선택을 취소하고 새로 선택
      else {
        Object.keys(newSelectedUsers).forEach(key => {
          newSelectedUsers[parseInt(key)] = false;
        });
        newSelectedUsers[id] = true;
        setLastSelectedUser(id);
      }
      
      return newSelectedUsers;
    });
  }, [users, lastSelectedUser]);

  // 사용자 역할 확인 함수들
  const isAdmin = useCallback((user: User) => {
    return user.is_superuser === true;
  }, []);

  const isTeacher = useCallback((user: User) => {
    return user.is_staff === true && user.is_superuser !== true;
  }, []);

  // 선택된 사용자 수
  const selectedUserCount = Object.values(selectedUsers).filter(selected => selected).length;

  // 이전 이름과의 호환성을 위해 resetPassword를 handleResetPassword로도 제공
  const handleResetPassword = resetPassword;

  return {
    users,
    filteredUsers,
    loading,
    error,
    selectedUsers,
    selectedUserCount,
    selectedList,
    searchTerm,
    setSearchTerm,
    fetchUsers,
    handleCreateUser,
    handleDeleteUser,
    resetPassword,
    handleResetPassword, // 이전 이름과의 호환성을 위해 추가
    handleBulkDeleteUsers,
    handleBulkResetPasswords,
    downloadUserTemplate,
    exportUsersToExcel,
    handleUserSelection,
    isAdmin,
    isTeacher,
    // 페이지네이션 관련 상태와 함수 추가
    currentPage,
    totalUsers,
    nextPageUrl,
    prevPageUrl,
    goToNextPage,
    goToPrevPage,
    goToPage
  };
};

export default useUsers; 