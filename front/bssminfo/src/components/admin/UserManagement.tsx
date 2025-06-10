import React, { useState, useRef } from 'react';
import { 
  Search, Download, UserPlus, X, Key, Trash2, User,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Settings
} from 'lucide-react';
import { User as AdminUser, CreateUserRequest } from '@/services/admin';
import adminService from '@/services/admin';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import TemplateModal from './TemplateModal';
import ResetPasswordModal from './ResetPasswordModal';

interface UserManagementProps {
  users: AdminUser[];
  loading?: boolean;
  error?: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedUsers: Record<number, boolean>;
  selectedCount?: number;
  selectedList?: AdminUser[];
  onSelectUser: (userId: number, event: React.MouseEvent) => void;
  onDeleteUser: (userId: number) => Promise<{ success: boolean; message: string }>;
  onResetPassword: (userId: number) => Promise<any>;
  onCreateUser: (userData: CreateUserRequest) => Promise<{ success: boolean; message: string }>;
  onExportToExcel: () => boolean;
  onDownloadTemplate: (count: number) => Promise<boolean>;
  onBulkDelete: () => Promise<boolean>;
  onBulkResetPasswords: () => Promise<any>;
  fetchUsers?: () => Promise<void>;
  currentPage?: number;
  totalItems?: number;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onGoToPage?: (page: number) => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onUpdateDeviceLimit: (userId: number, deviceLimit: number) => Promise<void>;
}

export default function UserManagement({
  users,
  loading,
  error,
  searchTerm,
  onSearchChange,
  selectedUsers,
  selectedCount,
  selectedList,
  onSelectUser,
  onDeleteUser,
  onResetPassword,
  onCreateUser,
  onExportToExcel,
  onDownloadTemplate,
  onBulkDelete,
  onBulkResetPasswords,
  fetchUsers,
  currentPage = 1,
  totalItems = 0,
  onNextPage,
  onPrevPage,
  onGoToPage,
  hasNextPage,
  hasPrevPage,
  onUpdateDeviceLimit
}: UserManagementProps) {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  
  // 피드백 메시지 상태 추가
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // 피드백 메시지 표시 함수
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackMessage({ type, message });
    // 5초 후 메시지 사라지게 하기
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportError(null);
      setImportSuccess(null);
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) {
      setImportError('업로드할 파일을 선택해주세요.');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const response = await adminService.importUsersFromExcel(importFile);
      if (response.success && response.data) {
        setImportSuccess(`${response.data.total_created || 0}명의 사용자가 성공적으로 추가되었습니다.`);
        // 사용자 목록 새로고침
        fetchUsers && fetchUsers();
        // 파일 입력 초기화
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.detail || '파일 업로드 중 오류가 발생했습니다.';
        setImportError(errorMessage);
      }
    } catch (error) {
      setImportError('파일 업로드 중 오류가 발생했습니다.');
      console.error('File upload error:', error);
    } finally {
      setImportLoading(false);
    }
  };

  // 페이지네이션 계산
  const SERVER_PAGE_SIZE = 100; // 서버의 페이지당 항목 수
  const PAGE_SIZE = 10; // UI에 표시할 페이지당 항목 수 (페이지 버튼용)
  const totalPages = Math.ceil(totalItems / SERVER_PAGE_SIZE);
  
  // 페이지 번호 계산
  const getPageNumbers = () => {
    const pages = [];
    const maxPageButtons = 5;
    
    // 총 페이지가 0인 경우 빈 배열 반환
    if (totalPages <= 0) {
      return [];
    }
    
    // 최대 페이지 버튼 수보다 총 페이지 수가 적은 경우
    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 주변의 버튼만 표시
      let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
      let endPage = startPage + maxPageButtons - 1;
      
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPageButtons + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };
  
  // 사용자 생성 처리 핸들러
  const handleCreateUserSubmit = async (userData: CreateUserRequest) => {
    const result = await onCreateUser(userData);
    if (result.success) {
      setShowCreateUserModal(false);
      showFeedback('success', result.message);
    } else {
      showFeedback('error', result.message);
    }
  };
  
  // 사용자 삭제 처리 핸들러
  const handleDeleteUserClick = async (userId: number) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      const result = await onDeleteUser(userId);
      if (result.success) {
        showFeedback('success', result.message);
      } else {
        showFeedback('error', result.message);
      }
    }
  };

  // 비밀번호 초기화 핸들러
  const handleResetPasswordClick = (userId: number) => {
    setSelectedUserId(userId);
    setShowResetPasswordModal(true);
  };

  // 비밀번호 초기화 모달 제출 핸들러
  const handleResetPasswordSubmit = async (newPassword: string) => {
    if (!selectedUserId) return;
    
    try {
      await onResetPassword(selectedUserId);
      setShowResetPasswordModal(false);
      setSelectedUserId(null);
      showFeedback('success', '비밀번호가 성공적으로 초기화되었습니다.');
      if (fetchUsers) {
        await fetchUsers();
      }
    } catch (error) {
      showFeedback('error', '비밀번호 초기화 중 오류가 발생했습니다.');
    }
  };

  const handleEditUser = async (userId: number, userData: Partial<AdminUser>) => {
    try {
      const result = await adminService.updateUser(userId, {
        email: userData.email,
        user_name: userData.user_name,
        is_staff: userData.is_staff,
        is_superuser: userData.is_superuser,
        device_limit: userData.device_limit
      });
      
      if (result.success) {
        showFeedback('success', '사용자 정보가 성공적으로 수정되었습니다.');
        if (fetchUsers) {
          await fetchUsers();
        }
      } else {
        showFeedback('error', '사용자 정보 수정 중 오류가 발생했습니다.');
      }
    } catch (error) {
      showFeedback('error', '사용자 정보 수정 중 오류가 발생했습니다.');
      console.error('Edit user error:', error);
    }
  };

  const handleEditUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* 피드백 메시지 표시 */}
      {feedbackMessage && (
        <div 
          className={`mb-4 p-4 rounded-md ${
            feedbackMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          } flex items-start`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">{feedbackMessage.message}</p>
          </div>
        </div>
      )}
      
      <div className="flex justify-end items-center mb-6">
        <div className="flex space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="사용자 검색..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          <button
            onClick={onExportToExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            엑셀로 내보내기
          </button>
          
          <button
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="w-4 h-4 mr-2" />
            템플릿 받기
          </button>
          
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            사용자 추가
          </button>
        </div>
      </div>
      
      {/* 엑셀 파일 업로드 섹션 */}
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">엑셀 파일로 일괄 사용자 추가</h3>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleFileUpload}
            disabled={!importFile || importLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {importLoading ? '업로드 중...' : '파일 업로드'}
          </button>
        </div>
        {importFile && (
          <p className="mt-1 text-xs text-gray-500">선택된 파일: {importFile.name}</p>
        )}
        {importError && (
          <div className="mt-2 text-sm text-red-600">
            {typeof importError === 'string' ? importError : JSON.stringify(importError)}
          </div>
        )}
        {importSuccess && (
          <div className="mt-2 text-sm text-green-600">{importSuccess}</div>
        )}
      </div>
      
      {/* 다중 선택 안내 */}
      <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">사용자 다중 선택 기능</span>
        </div>
        <ul className="list-disc ml-8 mt-1">
          <li><strong>Ctrl/⌘ + 클릭</strong>: 개별 사용자 선택/해제 토글</li>
          <li><strong>Shift + 클릭</strong>: 마지막으로 선택한 사용자와 현재 사용자 사이의 모든 사용자 선택</li>
        </ul>
      </div>
      
      {/* 선택된 사용자에 대한 일괄 작업 버튼 */}
      {selectedCount && (
        <div className="bg-gray-50 p-3 rounded-md mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{selectedCount}명</span>의 사용자가 선택됨
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onBulkResetPasswords}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Key className="w-3 h-3 mr-1" />
              일괄 비밀번호 초기화
            </button>
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              선택 사용자 삭제
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                아이디
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                실명
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이메일
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                권한
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                초기 비밀번호 상태
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const isSelected = selectedUsers[user.id] === true;
              return (
                <tr 
                  key={user.id} 
                  className={`${isSelected ? 'bg-blue-200 border-l-4 border-blue-500' : ''} hover:bg-gray-100 cursor-pointer`}
                  onClick={(e) => onSelectUser(user.id, e)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.user_name || '이름 없음'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.is_superuser ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        관리자
                      </span>
                    ) : user.is_staff ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        교사
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        학생
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_initial_password ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.is_initial_password ? '초기 상태' : '변경됨'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditUserClick(user);
                      }}
                      className="mr-2 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <Settings className="h-3 w-3 inline mr-1" />
                      정보 수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetPasswordClick(user.id);
                      }}
                      className="mr-2 px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    >
                      <Key className="h-3 w-3 inline mr-1" />
                      비밀번호 초기화
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUserClick(user.id);
                      }}
                      className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3 inline mr-1" />
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 사용자가 없거나 검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 컴포넌트 */}
      {totalItems > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                hasPrevPage ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              이전
            </button>
            <button
              onClick={onNextPage}
              disabled={!hasNextPage}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                hasNextPage ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              다음
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {totalItems > 0 ? (
                  <>
                    전체 <span className="font-medium">{totalItems}</span> 명 중{' '}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * SERVER_PAGE_SIZE + 1, totalItems)}
                    </span> 부터{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * SERVER_PAGE_SIZE, totalItems)}
                    </span> 까지 조회 중
                  </>
                ) : (
                  '데이터가 없습니다'
                )}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={onPrevPage}
                  disabled={!hasPrevPage}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 ${
                    hasPrevPage ? 'bg-white text-gray-500 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className="sr-only">이전</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    onClick={() => onGoToPage && onGoToPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } text-sm font-medium`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={onNextPage}
                  disabled={!hasNextPage}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 ${
                    hasNextPage ? 'bg-white text-gray-500 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className="sr-only">다음</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 추가 모달 */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onCreateUser={handleCreateUserSubmit}
      />

      {/* 사용자 정보 수정 모달 */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        onEditUser={handleEditUser}
        user={selectedUser}
      />

      {/* 템플릿 다운로드 모달 */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onDownload={async (count) => {
          await onDownloadTemplate(count);
        }}
      />

      {/* 비밀번호 초기화 모달 */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUserId(null);
        }}
        onSubmit={handleResetPasswordSubmit}
        username={selectedUserId ? users.find(u => u.id === selectedUserId)?.username || '' : ''}
      />
    </div>
  );
} 