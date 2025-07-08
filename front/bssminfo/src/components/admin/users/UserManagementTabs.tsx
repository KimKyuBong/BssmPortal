import React from 'react';
import { Card, Heading, Text, Button, Badge } from '@/components/ui/StyledComponents';
import { Trash2, Key, Download, Upload } from 'lucide-react';
import UserTable from './UserTable';
import SearchBar, { SearchOption } from '@/components/ui/SearchBar';

interface User {
  id: number;
  username: string;
  user_name?: string;
  email?: string;
  class_name?: string;
  device_limit: number;
  ip_count: number;
  rental_count: number;
  created_at?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_initial_password?: boolean;
  current_class?: number; // 추가된 필드
}

interface Class {
  id: number;
  grade: number;
  class_number: number;
}

interface UserManagementTabsProps {
  teachers: User[];
  students: User[];
  classes?: Class[];
  selectedTeachers: number[];
  selectedStudents: number[];
  onTeacherSelectionChange: (selectedIds: number[]) => void;
  onStudentSelectionChange: (selectedIds: number[]) => void;
  onBulkTeacherAction: (action: 'delete' | 'reset') => void;
  onBulkStudentAction: (action: 'delete' | 'reset') => void;
  onDeviceLimitClick: (user: User) => void;
  onResetPasswordClick: (id: number, username: string) => void;
  onRentalClick: (user: User, type: 'ip' | 'device') => void;
  onDeleteUser: (userId: number) => void;
  onResetPassword: (userId: number, password: string) => void;
  searchTerm: string;
  searchField: string;
  onSearchChange: (term: string) => void;
  onSearchFieldChange: (field: string) => void;
  onSearch: () => void;
}

export default function UserManagementTabs({
  teachers,
  students,
  classes = [],
  selectedTeachers,
  selectedStudents,
  onTeacherSelectionChange,
  onStudentSelectionChange,
  onBulkTeacherAction,
  onBulkStudentAction,
  onDeviceLimitClick,
  onResetPasswordClick,
  onRentalClick,
  onDeleteUser,
  onResetPassword,
  searchTerm,
  searchField,
  onSearchChange,
  onSearchFieldChange,
  onSearch
}: UserManagementTabsProps) {
  const [activeTab, setActiveTab] = React.useState<'teachers' | 'students'>('teachers');
  const [selectedClass, setSelectedClass] = React.useState<number>(0); // 0은 전체 학반

  const searchOptions: SearchOption[] = [
    { value: 'all', label: '전체' },
    { value: 'username', label: '아이디' },
    { value: 'user_name', label: '이름' },
    { value: 'email', label: '이메일' },
    { value: 'class_name', label: '학반' }
  ];

  // 학반별로 필터링된 학생 목록
  const filteredStudentsByClass = React.useMemo(() => {
    console.log('[DEBUG] 학반 필터링 시작:', {
      selectedClass,
      totalStudents: students.length,
      classes: classes,
      sampleStudent: students[0]
    });

    if (selectedClass === 0) {
      console.log('[DEBUG] 전체 학반 선택됨, 모든 학생 반환');
      return students; // 전체 학반
    }
    
    const selectedClassInfo = classes.find(c => c.id === selectedClass);
    console.log('[DEBUG] 선택된 학반 정보:', selectedClassInfo);
    
    if (!selectedClassInfo) {
      console.log('[DEBUG] 선택된 학반 정보를 찾을 수 없음');
      return students;
    }
    
    // 학반 ID로 직접 매칭하거나, 학반 이름으로 매칭
    const filtered = students.filter(student => {
      // 학생의 current_class가 있는 경우 ID로 매칭
      if (student.current_class) {
        const match = student.current_class === selectedClassInfo.id;
        console.log('[DEBUG] 학생 학반 ID 매칭:', {
          studentName: student.user_name,
          studentClassId: student.current_class,
          targetClassId: selectedClassInfo.id,
          match
        });
        return match;
      }
      
      // current_class가 없는 경우 class_name으로 매칭
      if (student.class_name) {
        const classDisplayName = `${selectedClassInfo.grade}학년 ${selectedClassInfo.class_number}반`;
        const match = student.class_name === classDisplayName;
        console.log('[DEBUG] 학생 학반 이름 매칭:', {
          studentName: student.user_name,
          studentClassName: student.class_name,
          targetClassName: classDisplayName,
          match
        });
        return match;
      }
      
      return false;
    });
    
    console.log('[DEBUG] 필터링된 학생 수:', filtered.length);
    return filtered;
  }, [students, selectedClass, classes]);

  // 학반 옵션 생성
  const classOptions = React.useMemo(() => {
    const options = [{ id: 0, name: '전체 학반' }];
    classes.forEach(cls => {
      options.push({
        id: cls.id,
        name: `${cls.grade}학년 ${cls.class_number}반`
      });
    });
    return options;
  }, [classes]);

  const handleTeacherSelection = (userId: number, event: React.MouseEvent<HTMLTableRowElement>) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    if (isCtrlPressed) {
      onTeacherSelectionChange(
        selectedTeachers.includes(userId) 
          ? selectedTeachers.filter(id => id !== userId)
          : [...selectedTeachers, userId]
      );
    } else if (isShiftPressed && selectedTeachers.length > 0) {
      const lastSelected = selectedTeachers[selectedTeachers.length - 1];
      const lastIndex = teachers.findIndex(t => t.id === lastSelected);
      const currentIndex = teachers.findIndex(t => t.id === userId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeIds = teachers.slice(startIndex, endIndex + 1).map(t => t.id);
        
        const newSelection = [...selectedTeachers];
        rangeIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        onTeacherSelectionChange(newSelection);
      }
    } else {
      onTeacherSelectionChange([userId]);
    }
  };

  const handleStudentSelection = (userId: number, event: React.MouseEvent<HTMLTableRowElement>) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    if (isCtrlPressed) {
      onStudentSelectionChange(
        selectedStudents.includes(userId) 
          ? selectedStudents.filter(id => id !== userId)
          : [...selectedStudents, userId]
      );
    } else if (isShiftPressed && selectedStudents.length > 0) {
      const lastSelected = selectedStudents[selectedStudents.length - 1];
      const lastIndex = filteredStudentsByClass.findIndex(s => s.id === lastSelected);
      const currentIndex = filteredStudentsByClass.findIndex(s => s.id === userId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeIds = filteredStudentsByClass.slice(startIndex, endIndex + 1).map(s => s.id);
        
        const newSelection = [...selectedStudents];
        rangeIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        onStudentSelectionChange(newSelection);
      }
    } else {
      onStudentSelectionChange([userId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${
              activeTab === 'teachers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            교사 ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-sm sm:text-base ${
              activeTab === 'students'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            학생 ({students.length})
          </button>
        </nav>
      </div>

      <Card>
        <div className="p-3 sm:p-4">
          <Heading level={4} className="text-base sm:text-lg mb-3 sm:mb-4">
            {activeTab === 'teachers' ? '교사' : '학생'} 검색
          </Heading>
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            onSearch={onSearch}
            searchField={searchField}
            onSearchFieldChange={onSearchFieldChange}
            searchOptions={searchOptions}
            placeholder={`${activeTab === 'teachers' ? '교사' : '학생'}를 검색하세요`}
            className="w-full"
          />
        </div>
      </Card>

      {activeTab === 'teachers' && (
        <div className="space-y-4 sm:space-y-6">
          <Card className="mb-4 sm:mb-6">
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <span className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                <strong>다중 선택:</strong> Ctrl/⌘ + 클릭: 개별 선택 | Shift + 클릭: 범위 선택
              </span>
            </div>
            <UserTable
              users={teachers}
              selectedUsers={selectedTeachers}
              onUserSelect={handleTeacherSelection}
              onDeviceLimitClick={onDeviceLimitClick}
              onResetPassword={onResetPasswordClick}
              onRentalClick={onRentalClick}
              onDelete={onDeleteUser}
              userType="teacher"
              className="mb-4 sm:mb-6"
            />
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-4 sm:space-y-6">
          {/* 학반 선택 드롭다운 */}
          <Card>
            <div className="p-3 sm:p-4">
              <Heading level={4} className="text-base sm:text-lg mb-3 sm:mb-4">학반 선택</Heading>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label htmlFor="class-select" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  학반:
                </label>
                <select
                  id="class-select"
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(Number(e.target.value));
                    // 학반 변경 시 선택된 학생들 초기화
                    onStudentSelectionChange([]);
                  }}
                  className="block px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  {classOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <Badge variant="info" className="ml-0 sm:ml-2 text-xs">
                  {filteredStudentsByClass.length}명
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="mb-4 sm:mb-6">
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <span className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                <strong>다중 선택:</strong> Ctrl/⌘ + 클릭: 개별 선택 | Shift + 클릭: 범위 선택
              </span>
            </div>
            <UserTable
              users={filteredStudentsByClass}
              selectedUsers={selectedStudents}
              onUserSelect={handleStudentSelection}
              onDeviceLimitClick={onDeviceLimitClick}
              onResetPassword={onResetPasswordClick}
              onRentalClick={onRentalClick}
              onDelete={onDeleteUser}
              userType="student"
              classes={classes}
              className="mb-4 sm:mb-6"
            />
          </Card>
        </div>
      )}
    </div>
  );
} 