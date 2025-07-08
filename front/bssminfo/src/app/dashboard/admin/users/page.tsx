'use client';

import React, { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/useUsers';
import authService from '@/services/auth';
import { userService, type User, type Student, type Class } from '@/services/userService';
import ResetPasswordModal from '@/components/admin/ResetPasswordModal';
import EditUserModal from '@/components/admin/EditUserModal';
import { User as AdminUser } from '@/services/admin';
import adminService from '@/services/admin';
import UserRentalModal from '@/components/admin/UserRentalModal';
import { Card, Heading, Text, Spinner as SpinnerComponent, Alert, Button, Input } from '@/components/ui/StyledComponents';
import { useToastContext } from '@/contexts/ToastContext';
import { Search, Download, Upload, Users, GraduationCap, User as UserIcon, Trash2, Key, Settings, Eye } from 'lucide-react';
import TemplateModal from '@/components/admin/TemplateModal';
import UserManagementTabs from '@/components/admin/users/UserManagementTabs';
import ExcelManagement from '@/components/admin/ExcelManagement';
import CreateUserModal from '@/components/admin/CreateUserModal';
import AdminPermissionGuard from '@/components/admin/AdminPermissionGuard';

// User 타입 확장
interface ExtendedUser extends User {
  is_superuser: boolean;
  is_initial_password: boolean;
  email: string;
  user_name: string;
  is_staff: boolean;
  ip_count: number;
  rental_count: number;
  id: number;
  username: string;
  created_at: string;
  is_active: boolean;
}

interface ExtendedStudent extends Student {
  is_superuser: boolean;
  is_initial_password: boolean;
  email: string;
  user_name: string;
  is_staff: boolean;
  ip_count: number;
  rental_count: number;
  id: number;
  username: string;
  created_at: string;
  is_active: boolean;
  class_name?: string;
}

interface RentalDetail {
  id: number;
  user: number;
  username: string;
  device_name?: string;
  ip_address?: string;
  created_at: string;
  returned_at?: string;
  status: string;
}

type TabType = 'all' | 'teachers' | 'students';

export default function UserManagementPage() {
  const { showError, showSuccess } = useToastContext();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [teachers, setTeachers] = useState<ExtendedUser[]>([]);
  const [students, setStudents] = useState<ExtendedStudent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<ExtendedUser | ExtendedStudent | null>(null);
  const [modalType, setModalType] = useState<'ip' | 'device' | null>(null);
  const [ipRentals, setIpRentals] = useState<RentalDetail[]>([]);
  const [deviceRentals, setDeviceRentals] = useState<RentalDetail[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  
  // 탭 및 검색 상태
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<string>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // 파일 업로드 상태
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 사용자 추가 모달 상태
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // 검색 옵션 정의
  const searchOptions: any[] = [
    { value: 'all', label: '전체' },
    { value: 'username', label: '아이디' },
    { value: 'user_name', label: '이름' },
    { value: 'email', label: '이메일' },
    { value: 'class_name', label: '학반' }
  ];

  const {
    handleCreateUser,
    handleDeleteUser,
    handleResetPassword,
    downloadUserTemplate,
    exportUsersToExcel,
    fetchUsers,
    totalUsers,
    goToNextPage,
    goToPrevPage,
    goToPage,
    nextPageUrl: useUsersNextPageUrl,
    prevPageUrl: useUsersPrevPageUrl,
  } = useUsers();

  const fetchData = async () => {
    try {
      const [teachersData, classesData] = await Promise.all([
        userService.getTeachers(),
        userService.getClasses()
      ]);
      setTeachers(teachersData.results || teachersData);
      setClasses(classesData.results || classesData);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 권한 체크
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          const user = response.data;
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

  useEffect(() => {
    fetchData();
  }, []);

  // 학생 탭에서 기본적으로 전체 학생 목록을 가져옵니다.
  useEffect(() => {
    // 전체 학생 목록은 페이지네이션 없이 한 번에 불러오기
    const fetchAllStudents = async () => {
      try {
        const response = await userService.getStudentsByClass(0, 1, 1000); // 큰 숫자로 설정하여 모든 학생을 한 번에 가져옴
        console.log('[DEBUG] 학생 데이터 원본:', response.results);
        
        // classes 데이터가 있을 때 class_name 생성
        const processedStudents = response.results.map((student: Student) => {
          let class_name = '-';
          
          // current_class가 있고 classes 데이터가 있을 때 학반명 생성
          if (student.current_class && classes.length > 0) {
            const classInfo = classes.find(c => c.id === student.current_class);
            if (classInfo) {
              class_name = `${classInfo.grade}학년 ${classInfo.class_number}반`;
            }
          }
          
          return {
            ...student,
            device_limit: student.device_limit || 0,
            class_name: class_name
          };
        });
        
        console.log('[DEBUG] 처리된 학생 데이터:', processedStudents);
        setStudents(processedStudents);
      } catch (error) {
        console.error('학생 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // classes 데이터가 로드된 후에만 학생 데이터 가져오기
    if (classes.length > 0) {
      fetchAllStudents();
    }
  }, [classes]); // classes 의존성 추가

  // 검색 필터링된 데이터
  const filteredTeachers = React.useMemo(() => {
    if (!searchTerm.trim()) return teachers;
    
    const searchLower = searchTerm.toLowerCase();
    return teachers.filter(teacher => {
      switch (searchField) {
        case 'username':
          return teacher.username.toLowerCase().includes(searchLower);
        case 'user_name':
          return (teacher.user_name || '').toLowerCase().includes(searchLower);
        case 'email':
          return (teacher.email || '').toLowerCase().includes(searchLower);
        default:
          return teacher.username.toLowerCase().includes(searchLower) ||
                 (teacher.user_name || '').toLowerCase().includes(searchLower) ||
                 (teacher.email || '').toLowerCase().includes(searchLower);
      }
    });
  }, [teachers, searchTerm, searchField]);

  const filteredStudents = React.useMemo(() => {
    if (!searchTerm.trim()) return students;
    
    const searchLower = searchTerm.toLowerCase();
    return students.filter(student => {
      switch (searchField) {
        case 'username':
          return student.username.toLowerCase().includes(searchLower);
        case 'user_name':
          return (student.user_name || '').toLowerCase().includes(searchLower);
        case 'email':
          return (student.email || '').toLowerCase().includes(searchLower);
        case 'class_name':
          return (student.class_name || '').toLowerCase().includes(searchLower);
        default:
          return student.username.toLowerCase().includes(searchLower) ||
                 (student.user_name || '').toLowerCase().includes(searchLower) ||
                 (student.email || '').toLowerCase().includes(searchLower) ||
                 (student.class_name || '').toLowerCase().includes(searchLower);
      }
    });
  }, [students, searchTerm, searchField]);

  const handleBulkTeacherAction = async (action: 'delete' | 'reset') => {
    if (selectedTeachers.length === 0) {
      showError('선택된 교사가 없습니다.');
      return;
    }

    try {
      if (action === 'delete') {
        const promises = selectedTeachers.map(id => handleDeleteUser(id));
        await Promise.all(promises);
        showSuccess(`${selectedTeachers.length}명의 교사가 삭제되었습니다.`);
        setSelectedTeachers([]);
        await fetchData();
      } else if (action === 'reset') {
        // 일괄 비밀번호 초기화는 개별적으로 처리
        showError('일괄 비밀번호 초기화는 지원하지 않습니다. 개별적으로 처리해주세요.');
      }
    } catch (error) {
      console.error('일괄 작업 오류:', error);
      showError('일괄 작업 중 오류가 발생했습니다.');
    }
  };

  const handleBulkStudentAction = async (action: 'delete' | 'reset') => {
    if (selectedStudents.length === 0) {
      showError('선택된 학생이 없습니다.');
      return;
    }

    try {
      if (action === 'delete') {
        const promises = selectedStudents.map(id => handleDeleteUser(id));
        await Promise.all(promises);
        showSuccess(`${selectedStudents.length}명의 학생이 삭제되었습니다.`);
        setSelectedStudents([]);
        await fetchData();
      } else if (action === 'reset') {
        // 일괄 비밀번호 초기화는 개별적으로 처리
        showError('일괄 비밀번호 초기화는 지원하지 않습니다. 개별적으로 처리해주세요.');
      }
    } catch (error) {
      console.error('일괄 작업 오류:', error);
      showError('일괄 작업 중 오류가 발생했습니다.');
    }
  };

  const handleResetPasswordClick = (id: number, username: string) => {
    console.log('[DEBUG] handleResetPasswordClick 호출:', { id, username });
    setSelectedUser({ id, username });
    setIsResetModalOpen(true);
  };

  const handleResetPasswordConfirm = async (password: string) => {
    if (!selectedUser) return;

    try {
      await handleResetPassword(selectedUser.id, password);
      showSuccess('비밀번호가 성공적으로 초기화되었습니다.');
      setIsResetModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('비밀번호 초기화 오류:', error);
      showError('비밀번호 초기화에 실패했습니다.');
    }
  };

  const handleDeviceLimitClick = (user: any) => {
    setSelectedUserForEdit(user);
    setIsEditUserModalOpen(true);
  };

  const handleEditUser = async (userId: number, userData: Partial<AdminUser>) => {
    try {
      const response = await adminService.updateUser(userId, userData);
      if (response.success) {
        showSuccess('사용자 정보가 성공적으로 수정되었습니다.');
        setIsEditUserModalOpen(false);
        setSelectedUserForEdit(null);
        await fetchData();
      } else {
        showError('사용자 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 정보 수정 오류:', error);
      showError('사용자 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleRentalClick = async (user: any, type: 'ip' | 'device') => {
    const userId = 'user' in user ? user.user : user.id;
    const username = 'username' in user ? user.username : '';
    
    setSelectedUser({ id: userId, username });
    setModalType(type);
    setLoadingRentals(true);
    
    try {
      let response;
      if (type === 'ip') {
        response = await adminService.getIpRentals(userId);
      } else {
        response = await adminService.getDeviceRentals(userId);
      }
      
      if (response.success && response.data) {
        if (type === 'ip') {
          setIpRentals(response.data);
        } else {
          setDeviceRentals(response.data);
        }
      }
    } catch (error) {
      console.error('대여 내역 조회 실패:', error);
    } finally {
      setLoadingRentals(false);
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setIpRentals([]);
    setDeviceRentals([]);
    setSelectedUser(null);
  };

  // 활성 대여 수 계산
  const activeRentalsCount = teachers.reduce((sum, t) => sum + (t.rental_count || 0), 0) + 
                             students.reduce((sum, s) => sum + (s.rental_count || 0), 0);

  // 엑셀 관련 핸들러들
  const handleDownloadTemplate = async (count: number) => {
    try {
      await downloadUserTemplate(count);
      showSuccess('템플릿이 성공적으로 다운로드되었습니다.');
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error);
      showError('템플릿 다운로드에 실패했습니다.');
    }
  };

  const handleExportToExcel = async () => {
    try {
      await exportUsersToExcel();
      showSuccess('엑셀 파일이 성공적으로 내보내기되었습니다.');
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      showError('엑셀 내보내기에 실패했습니다.');
    }
  };

  const handleImportUsers = async (file: File): Promise<{ success: boolean; message: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchData(); // 데이터 새로고침
        return { success: true, message: result.message || '사용자가 성공적으로 추가되었습니다.' };
      } else {
        const error = await response.json();
        return { success: false, message: error.message || '파일 업로드에 실패했습니다.' };
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      return { success: false, message: '파일 업로드 중 오류가 발생했습니다.' };
    }
  };

  // CreateUserModal용 래핑 함수
  const handleCreateUserForModal = async (userData: any): Promise<void> => {
    const result = await handleCreateUser(userData);
    if (result.success) {
      await fetchData(); // 데이터 새로고침
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerComponent size="lg" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center p-8">
          <Heading level={2} className="text-red-600 mb-4">접근 권한이 없습니다</Heading>
          <Text>관리자 권한이 필요합니다.</Text>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerComponent size="lg" />
      </div>
    );
  }

  return (
    <AdminPermissionGuard>
      <div className="page-container">
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-flex">
              <div>
                <Heading level={1} className="text-xl sm:text-2xl lg:text-3xl">사용자 관리</Heading>
                <Text className="page-subtitle text-xs sm:text-sm">
                  교사와 학생 계정을 관리하고, 비밀번호 초기화, 기기 제한 설정 등을 수행할 수 있습니다.
                </Text>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  variant="primary"
                  className="flex items-center text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">사용자 </span>추가
                </Button>
              </div>
            </div>
          </div>

          {/* 알림 표시 */}
          {notification && (
            <div className="mb-6">
              <Alert
                type={notification.type}
                message={notification.message}
                onClose={() => setNotification(null)}
              />
            </div>
          )}

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <div className="flex items-center">
                <div className="bg-blue-500 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                  <Users className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">총 사용자</Text>
                  <Heading level={3} className="text-lg sm:text-xl">{teachers.length + students.length}명</Heading>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="bg-green-500 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                  <GraduationCap className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">교사/학생</Text>
                  <Heading level={3} className="text-lg sm:text-xl">{teachers.length}/{students.length}</Heading>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="bg-purple-500 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                  <UserIcon className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">총 반</Text>
                  <Heading level={3} className="text-lg sm:text-xl">{classes.length}개</Heading>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="bg-orange-500 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                  <Eye className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">활성 대여</Text>
                  <Heading level={3} className="text-lg sm:text-xl">{activeRentalsCount}개</Heading>
                </div>
              </div>
            </Card>
          </div>

          {/* 엑셀 관련 컴포넌트 */}
          <ExcelManagement
            onDownloadTemplate={handleDownloadTemplate}
            onExportToExcel={handleExportToExcel}
            onImportUsers={handleImportUsers}
            className="mb-8"
          />

          {/* 사용자 관리 탭 */}
          <UserManagementTabs
            teachers={filteredTeachers}
            students={filteredStudents as any}
            classes={classes}
            selectedTeachers={selectedTeachers}
            selectedStudents={selectedStudents}
            onTeacherSelectionChange={setSelectedTeachers}
            onStudentSelectionChange={setSelectedStudents}
            onBulkTeacherAction={handleBulkTeacherAction}
            onBulkStudentAction={handleBulkStudentAction}
            onDeviceLimitClick={handleDeviceLimitClick}
            onResetPasswordClick={handleResetPasswordClick}
            onRentalClick={handleRentalClick}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
            searchTerm={searchTerm}
            searchField={searchField}
            onSearchChange={setSearchTerm}
            onSearchFieldChange={setSearchField}
            onSearch={() => {}}
          />

          {/* 사용자 정보 수정 모달 */}
          {isEditUserModalOpen && selectedUserForEdit && (
            <EditUserModal
              isOpen={isEditUserModalOpen}
              onClose={() => {
                setIsEditUserModalOpen(false);
                setSelectedUserForEdit(null);
              }}
              onEditUser={handleEditUser}
              user={{
                id: selectedUserForEdit.id,
                username: selectedUserForEdit.username,
                email: 'email' in selectedUserForEdit ? selectedUserForEdit.email || null : null,
                user_name: 'user_name' in selectedUserForEdit ? selectedUserForEdit.user_name || null : null,
                is_staff: 'is_staff' in selectedUserForEdit ? selectedUserForEdit.is_staff || false : false,
                is_superuser: 'is_superuser' in selectedUserForEdit ? selectedUserForEdit.is_superuser || false : false,
                device_limit: selectedUserForEdit.device_limit,
                is_initial_password: 'is_initial_password' in selectedUserForEdit ? selectedUserForEdit.is_initial_password || false : false,
                is_active: true,
                created_at: new Date().toISOString()
              }}
            />
          )}

          {/* 비밀번호 초기화 모달 */}
          {isResetModalOpen && selectedUser && (
            <ResetPasswordModal
              isOpen={isResetModalOpen}
              onClose={() => {
                setIsResetModalOpen(false);
                setSelectedUser(null);
              }}
              onSubmit={handleResetPasswordConfirm}
              username={selectedUser.username}
            />
          )}

          {/* 대여 내역 모달 */}
          <UserRentalModal
            isOpen={modalType !== null}
            onClose={handleCloseModal}
            selectedUser={selectedUser}
            modalType={modalType}
            rentals={modalType === 'ip' ? ipRentals : deviceRentals}
            loading={loadingRentals}
          />

          {/* 템플릿 다운로드 모달 */}
          <TemplateModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onDownload={handleDownloadTemplate}
          />

          {/* 사용자 추가 모달 */}
          <CreateUserModal
            isOpen={isCreateUserModalOpen}
            onClose={() => setIsCreateUserModalOpen(false)}
            onCreateUser={handleCreateUserForModal}
          />
        </div>
      </div>
    </AdminPermissionGuard>
  );
} 