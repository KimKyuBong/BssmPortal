import React, { useState, useEffect } from 'react';
import { X, User, Settings } from 'lucide-react';
import { User as AdminUser } from '@/services/admin';
import { Modal, Heading, Text, Input, Button } from '@/components/ui/StyledComponents';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditUser: (userId: number, userData: Partial<AdminUser>) => Promise<void>;
  user: AdminUser | null;
}

export default function EditUserModal({ isOpen, onClose, onEditUser, user }: EditUserModalProps) {
  const [editedUser, setEditedUser] = useState<Partial<AdminUser>>({
    username: '',
    email: '',
    user_name: '',
    is_staff: false,
    is_superuser: false,
    device_limit: 3,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditedUser({
        username: user.username,
        email: user.email || '',
        user_name: user.user_name || '',
        is_staff: user.is_staff,
        is_superuser: user.is_superuser,
        device_limit: user.device_limit,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // 공백 값 필터링
      const filteredData: Partial<AdminUser> = {};
      Object.entries(editedUser).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          filteredData[key as keyof AdminUser] = value as any;
        }
      });

      await onEditUser(user.id, filteredData);
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
      setEditedUser(prev => ({
        ...prev,
        [name]: value
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