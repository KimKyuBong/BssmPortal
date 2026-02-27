import React, { useState, useEffect } from 'react';
import { X, User, Settings } from 'lucide-react';
import { User as AdminUser } from '@/services/admin';
import { Modal, Heading, Text, Input, Button } from '@/components/ui/StyledComponents';

interface ClassOption {
  id: number;
  grade: number;
  class_number: number;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditUser: (userId: number, userData: Partial<AdminUser>) => Promise<void>;
  user: AdminUser | null;
  classes?: ClassOption[];
  current_class?: number;
  onChangeClass?: (studentId: number, classId: number) => Promise<void>;
}

export default function EditUserModal({ isOpen, onClose, onEditUser, user, classes = [], current_class, onChangeClass }: EditUserModalProps) {
  const [editedUser, setEditedUser] = useState<Partial<AdminUser> & { current_class?: number }>({
    username: '',
    email: '',
    user_name: '',
    is_staff: false,
    is_superuser: false,
    device_limit: 3,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStudent = !!(user as any)?.user;

  useEffect(() => {
    if (user) {
      setEditedUser({
        username: user.username,
        email: user.email || '',
        user_name: user.user_name || '',
        is_staff: user.is_staff,
        is_superuser: user.is_superuser,
        device_limit: user.device_limit,
        current_class: current_class ?? (user as any).current_class,
      });
    }
  }, [user, current_class]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // 공백 값 필터링 (current_class는 Student 모델용이므로 제외)
      const filteredData: Partial<AdminUser> = {};
      Object.entries(editedUser).forEach(([key, value]) => {
        if (key === 'current_class') return;
        if (value !== null && value !== undefined && value !== '') {
          filteredData[key as keyof AdminUser] = value as any;
        }
      });

      // 학생의 경우 user.user (실제 User ID)를 사용하고, 교사의 경우 user.id를 사용
      const targetUserId = (user as any).user ? (user as any).user : user.id;
      const studentId = user.id;

      // 학생 학반 변경 (학생이고 학반이 유효하게 변경된 경우)
      if (isStudent && onChangeClass && editedUser.current_class && editedUser.current_class > 0) {
        const originalClass = current_class ?? (user as any).current_class;
        if (Number(editedUser.current_class) !== Number(originalClass)) {
          await onChangeClass(studentId, Number(editedUser.current_class));
        }
      }

      await onEditUser(targetUserId, filteredData);
    } catch (err) {
      setError('사용자 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setEditedUser(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      const numValue = (name === 'current_class' || name === 'device_limit') ? (value ? Number(value) : undefined) : value;
      setEditedUser(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex items-center justify-between mb-4">
        <Heading level={3} className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          사용자 정보 수정
        </Heading>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="아이디"
          type="text"
          value={editedUser.username}
          disabled
          className="bg-gray-100 dark:bg-gray-600"
        />
        
        <Input
          label="이름 *"
          type="text"
          id="user_name"
          name="user_name"
          value={editedUser.user_name ?? ''}
          onChange={handleInputChange}
          required
        />
        
        <Input
          label="이메일"
          type="email"
          id="email"
          name="email"
          value={editedUser.email ?? ''}
          onChange={handleInputChange}
        />
        
        <Input
          label="기기 제한 수"
          type="number"
          id="device_limit"
          name="device_limit"
          value={editedUser.device_limit}
          onChange={handleInputChange}
          min="0"
        />

        {isStudent && classes.length > 0 && (
          <div>
            <label htmlFor="current_class" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              학반
            </label>
            <select
              id="current_class"
              name="current_class"
              value={editedUser.current_class ?? ''}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">선택 안 함</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.grade}학년 {cls.class_number}반
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_staff"
              name="is_staff"
              checked={editedUser.is_staff}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Text className="font-medium text-gray-900 dark:text-white ml-2">교사 권한 (is_staff: {editedUser.is_staff ? "true" : "false"})</Text>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_superuser"
              name="is_superuser"
              checked={editedUser.is_superuser}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Text className="font-medium text-gray-900 dark:text-white ml-2">관리자 권한 (is_superuser: {editedUser.is_superuser ? "true" : "false"})</Text>
          </div>
        </div>
      </form>
      
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:col-start-2"
          onClick={handleSubmit}
        >
          {loading ? '처리중...' : '수정'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="mt-3 w-full sm:mt-0 sm:col-start-1"
        >
          취소
        </Button>
      </div>
    </Modal>
  );
} 