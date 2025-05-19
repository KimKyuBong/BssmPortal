'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import useUsers from '@/hooks/useUsers';
import authService from '@/services/auth';

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // 사용자 관리 훅
  const {
    users,
    filteredUsers,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedUsers,
    selectedUserCount,
    selectedList,
    handleUserSelection,
    handleDeleteUser,
    handleResetPassword,
    handleCreateUser,
    handleBulkDeleteUsers,
    handleBulkResetPasswords,
    downloadUserTemplate,
    exportUsersToExcel,
    fetchUsers,
    currentPage,
    totalUsers,
    goToNextPage,
    goToPrevPage,
    goToPage,
    nextPageUrl,
    prevPageUrl,
  } = useUsers();

  // 권한 체크
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          const user = response.data;
          // 관리자 또는 교사인지 확인
          if (user.is_staff || user.is_superuser) {
            setAuthorized(true);
          } else {
            setAuthorized(false);
          }
        } else {
          setAuthorized(false);
        }
      } catch (error) {
        console.error('권한 체크 중 오류:', error);
        setAuthorized(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuthorization();
  }, []);

  // 권한 체크 중이라면 로딩 표시
  if (authChecking) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 권한이 없다면 접근 거부 메시지 표시
  if (!authorized) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">접근 거부</p>
        <p>이 페이지에 접근할 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center mb-6">
        <User className="h-6 w-6 text-indigo-500 mr-2" />
        <h1 className="text-xl font-semibold">사용자 관리</h1>
      </div>

      <div className="mb-6">
        <p className="text-gray-600">
          사용자 계정을 관리하고 비밀번호 초기화, 사용자 추가 등의 작업을 수행할 수 있습니다.
        </p>
      </div>

      <UserManagement
        users={filteredUsers}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedUsers={selectedUsers}
        selectedCount={selectedUserCount}
        selectedList={selectedList}
        onSelectUser={handleUserSelection}
        onDeleteUser={handleDeleteUser}
        onResetPassword={handleResetPassword}
        onCreateUser={handleCreateUser}
        onExportToExcel={exportUsersToExcel}
        onDownloadTemplate={downloadUserTemplate}
        onBulkDelete={handleBulkDeleteUsers}
        onBulkResetPasswords={handleBulkResetPasswords}
        fetchUsers={fetchUsers}
        currentPage={currentPage}
        totalItems={totalUsers}
        onNextPage={goToNextPage}
        onPrevPage={goToPrevPage}
        onGoToPage={goToPage}
        hasNextPage={nextPageUrl !== null}
        hasPrevPage={prevPageUrl !== null}
      />
    </div>
  );
} 