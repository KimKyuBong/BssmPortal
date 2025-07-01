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
}

interface UserManagementTabsProps {
  teachers: User[];
  students: User[];
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

  const searchOptions: SearchOption[] = [
    { value: 'all', label: '전체' },
    { value: 'username', label: '아이디' },
    { value: 'user_name', label: '이름' },
    { value: 'email', label: '이메일' },
    { value: 'class_name', label: '학반' }
  ];

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
      const lastIndex = students.findIndex(s => s.id === lastSelected);
      const currentIndex = students.findIndex(s => s.id === userId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeIds = students.slice(startIndex, endIndex + 1).map(s => s.id);
        
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
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`py-3 px-1 border-b-2 font-medium text-lg ${
              activeTab === 'teachers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            교사 ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-1 border-b-2 font-medium text-lg ${
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
        <div className="p-4">
          <Heading level={4} className="text-lg mb-4">
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
        <div className="space-y-6">
          <Card className="mb-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <span className="text-lg text-blue-800 dark:text-blue-300">
                <strong>다중 선택 기능:</strong> Ctrl/⌘ + 클릭: 개별 선택/해제 토글 | Shift + 클릭: 마지막으로 선택한 항목과 현재 항목 사이의 모든 항목 선택
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
              className="mb-6"
            />
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <Card className="mb-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <span className="text-lg text-blue-800 dark:text-blue-300">
                <strong>다중 선택 기능:</strong> Ctrl/⌘ + 클릭: 개별 선택/해제 토글 | Shift + 클릭: 마지막으로 선택한 항목과 현재 항목 사이의 모든 항목 선택
              </span>
            </div>
            <UserTable
              users={students}
              selectedUsers={selectedStudents}
              onUserSelect={handleStudentSelection}
              onDeviceLimitClick={onDeviceLimitClick}
              onResetPassword={onResetPasswordClick}
              onRentalClick={onRentalClick}
              onDelete={onDeleteUser}
              userType="student"
              className="mb-6"
            />
          </Card>
        </div>
      )}
    </div>
  );
} 