'use client';

import React, { useState, useEffect } from 'react';
import { User as UserIcon, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import { useUsers } from '@/hooks/useUsers';
import authService from '@/services/auth';
import { Tab } from '@headlessui/react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { userService, type User, type Student, type Class } from '@/services/userService';
import ResetPasswordModal from '@/components/admin/ResetPasswordModal';
import EditUserModal from '@/components/admin/EditUserModal';
import { User as AdminUser } from '@/services/admin';

// User 타입 확장
interface ExtendedUser extends User {
  is_superuser: boolean;
  is_initial_password: boolean;
  email: string;
  last_name: string;
  is_staff: boolean;
  ip_count: number;
  rental_count: number;
  id: number;
  username: string;
  created_at: string;
  is_active: boolean;
}

// Student 타입 확장
interface ExtendedStudent extends Student {
  user: number;
  device_limit: number;
  email: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_initial_password: boolean;
  ip_count: number;
  rental_count: number;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [teachers, setTeachers] = useState<ExtendedUser[]>([]);
  const [students, setStudents] = useState<ExtendedStudent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<ExtendedUser | ExtendedStudent | null>(null);

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

  const handleClassChange = async (classId: number) => {
    setSelectedClass(classId);
    setCurrentPage(1);
    try {
      if (classId === 0) {
        // 전체 학생 목록은 페이지네이션 없이 한 번에 불러오기
        const response = await userService.getStudentsByClass(classId, 1, 1000); // 큰 숫자로 설정하여 모든 학생을 한 번에 가져옴
        setStudents(response.results);
        setTotalPages(1); // 전체 목록에서는 페이지네이션 비활성화
      } else {
        // 학반별 보기에서는 페이지네이션 적용
        const response = await userService.getStudentsByClass(classId, 1);
        setStudents(response.results);
        setTotalPages(Math.ceil(response.count / response.results.length));
      }
    } catch (error) {
      console.error('학생 목록 조회 실패:', error);
    }
  };

  // 학생 탭에서 기본적으로 전체 학생 목록을 가져옵니다.
  useEffect(() => {
    handleClassChange(0);
  }, []);

  const handleTeacherSelection = (teacherId: number) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleBulkTeacherAction = async (action: 'delete' | 'reset') => {
    if (selectedTeachers.length === 0) return;
    
    if (action === 'delete' && !confirm('선택한 교사를 모두 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      if (action === 'delete') {
        await Promise.all(selectedTeachers.map(id => handleDeleteUser(id)));
      } else {
        await Promise.all(selectedTeachers.map(id => handleResetPassword(id)));
      }
      setSelectedTeachers([]);
      fetchData();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const handleBulkStudentAction = async (action: 'delete' | 'reset') => {
    if (selectedStudents.length === 0) return;
    
    if (action === 'delete' && !confirm('선택한 학생을 모두 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      if (action === 'delete') {
        await Promise.all(selectedStudents.map(id => {
          const student = students.find(s => s.id === id);
          if (student) {
            return handleDeleteUser(student.user);
          }
        }));
      } else {
        await Promise.all(selectedStudents.map(id => handleResetPassword(id)));
      }
      setSelectedStudents([]);
      fetchData();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages) return;
    
    try {
      const response = await userService.getStudentsByClass(selectedClass || 0, page);
      setStudents(response.results);
      setCurrentPage(page);
    } catch (error) {
      console.error('페이지 변경 실패:', error);
    }
  };

  const handleResetPasswordClick = (id: number, username: string) => {
    setSelectedUser({ id, username });
    setIsResetModalOpen(true);
  };

  const handleResetPasswordConfirm = async (password: string) => {
    if (!selectedUser) return;
    
    try {
      // 학생인 경우 실제 user ID를 사용
      const student = students.find(s => s.id === selectedUser.id);
      const userId = student ? student.user : selectedUser.id;
      await handleResetPassword(userId, password);
      setIsResetModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('비밀번호 초기화 실패:', error);
    }
  };

  // 학반 이동 함수
  const moveToNextClass = () => {
    if (!selectedClass) return;
    const currentClassIndex = classes.findIndex(c => c.id === selectedClass);
    if (currentClassIndex < classes.length - 1) {
      handleClassChange(classes[currentClassIndex + 1].id);
    }
  };

  const moveToPrevClass = () => {
    if (!selectedClass) return;
    const currentClassIndex = classes.findIndex(c => c.id === selectedClass);
    if (currentClassIndex > 0) {
      handleClassChange(classes[currentClassIndex - 1].id);
    }
  };

  const handleDeviceLimitClick = (user: ExtendedUser | ExtendedStudent) => {
    setSelectedUserForEdit(user);
    setIsEditUserModalOpen(true);
  };

  const handleEditUser = async (userId: number, userData: Partial<AdminUser>) => {
    try {
      const result = await userService.updateUser(userId, userData);
      if (result.success) {
        setIsEditUserModalOpen(false);
        setSelectedUserForEdit(null);
        alert(result.message);
        fetchData(); // 사용자 목록 새로고침
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('사용자 정보 수정 실패:', error);
      alert('사용자 정보 수정 중 오류가 발생했습니다.');
    }
  };

  if (authChecking || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">접근 거부</p>
        <p>이 페이지에 접근할 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => handleCreateUser({
              username: '',
              password: '',
              is_staff: true
            })}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            사용자 추가
          </button>
          <button
            onClick={() => downloadUserTemplate(1)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            템플릿 다운로드
          </button>
          <button
            onClick={async () => await exportUsersToExcel()}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            엑셀 내보내기
          </button>
        </div>
      </div>
      
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }: { selected: boolean }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            교사
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            학생
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-6">
          <Tab.Panel>
            {selectedTeachers.length > 0 && (
              <div className="mb-4 flex space-x-4">
                <button
                  onClick={() => handleBulkTeacherAction('reset')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
                >
                  선택한 교사 비밀번호 초기화
                </button>
                <button
                  onClick={() => handleBulkTeacherAction('delete')}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  선택한 교사 삭제
                </button>
              </div>
            )}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedTeachers.length === teachers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeachers(teachers.map(t => t.id));
                          } else {
                            setSelectedTeachers([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      IP 대여 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      기기 대여 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      장치 제한
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className={teacher.rental_count === 0 ? 'bg-pink-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={() => handleTeacherSelection(teacher.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{teacher.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.ip_count || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.rental_count || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(teacher.created_at), 'PPP', { locale: ko })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          teacher.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {teacher.device_limit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleDeviceLimitClick(teacher)}
                          className="mr-2 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <UserIcon className="h-3 w-3 inline mr-1" />
                          사용자 정보 수정
                        </button>
                        <button
                          onClick={() => handleResetPasswordClick(teacher.id, teacher.username)}
                          className="mr-2 px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        >
                          비밀번호 초기화
                        </button>
                        <button
                          onClick={() => handleDeleteUser(teacher.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tab.Panel>
          <Tab.Panel>
            {selectedStudents.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkStudentAction('reset')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 flex-1 sm:flex-none"
                >
                  선택한 학생 비밀번호 초기화
                </button>
                <button
                  onClick={() => handleBulkStudentAction('delete')}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex-1 sm:flex-none"
                >
                  선택한 학생 삭제
                </button>
              </div>
            )}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={moveToPrevClass}
                  disabled={!selectedClass || classes.findIndex(c => c.id === selectedClass) === 0}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <select
                  className="flex-1 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900"
                  value={selectedClass || 0}
                  onChange={(e) => handleClassChange(Number(e.target.value))}
                >
                  <option value="0">전체</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.grade}학년 {cls.class_number}반
                    </option>
                  ))}
                </select>
                <button
                  onClick={moveToNextClass}
                  disabled={!selectedClass || classes.findIndex(c => c.id === selectedClass) === classes.length - 1}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedStudents.length === students.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(students.map(s => s.id));
                            } else {
                              setSelectedStudents([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        아이디
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        IP 대여 수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        IP 대여 수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        학반
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        장치 제한
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => {
                      const studentClass = classes.find(c => c.id === student.current_class);
                      return (
                        <tr key={student.id} className={student.rental_count === 0 ? 'bg-pink-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleStudentSelection(student.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.user_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.ip_count || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.rental_count || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {studentClass ? `${studentClass.grade}학년 ${studentClass.class_number}반` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.device_limit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => handleDeviceLimitClick(student)}
                                className="mr-2 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                              >
                                <UserIcon className="h-3 w-3 inline mr-1" />
                                사용자 정보 수정
                              </button>
                              <button
                                onClick={() => handleResetPasswordClick(student.id, student.username)}
                                className="text-yellow-600 hover:text-yellow-900 px-3 py-1 rounded-md border border-yellow-600 hover:bg-yellow-50"
                              >
                                비밀번호 초기화
                              </button>
                              <button
                                onClick={() => {
                                  const currentStudent = students.find(s => s.id === student.id);
                                  if (currentStudent) {
                                    handleDeleteUser(currentStudent.user);
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-600 hover:bg-red-50"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {selectedClass !== 0 && students.length > 0 && (
              <div className="mt-4 flex justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`px-4 py-2 rounded-md ${
                    currentPage > 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  이전
                </button>
                <span className="px-4 py-2 text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={`px-4 py-2 rounded-md ${
                    currentPage < totalPages
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  다음
                </button>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

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
            last_name: 'last_name' in selectedUserForEdit ? selectedUserForEdit.last_name || null : null,
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
    </div>
  );
} 