import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { User, CreateUserRequest } from '@/services/admin';
import { Modal, Heading, Text, Input, Button } from '@/components/ui/StyledComponents';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (userData: CreateUserRequest) => Promise<void>;
}

export default function CreateUserModal({ isOpen, onClose, onCreateUser }: CreateUserModalProps) {
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    user_name: '',
    is_staff: false,
    is_superuser: false,
    device_limit: 3,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // 사용자 생성 요청 데이터 준비
      const userData = {
        username: newUser.username,
        password: newUser.password,
        email: newUser.email || undefined,
        user_name: newUser.user_name || undefined,
        is_staff: newUser.is_staff,
        is_superuser: newUser.is_superuser,
        device_limit: newUser.device_limit
      };
      
      await onCreateUser(userData);
      
      // 성공적으로 생성되면 폼 초기화
      setNewUser({
        username: '',
        password: '',
        email: '',
        user_name: '',
        is_staff: false,
        is_superuser: false,
        device_limit: 3,
      });
      
      // 모달 닫기
      onClose();
    } catch (err) {
      setError('사용자 생성 중 오류가 발생했습니다.');
      console.error('Create user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setNewUser(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setNewUser(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between mb-4">
        <Heading level={3} className="flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          사용자 추가
        </Heading>
        <button
          type="button"
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
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="아이디 *"
            type="text"
            name="username"
            id="username"
            required
            value={newUser.username}
            onChange={handleInputChange}
          />
          
          <Input
            label="비밀번호 *"
            type="password"
            name="password"
            id="password"
            required
            value={newUser.password}
            onChange={handleInputChange}
          />
          
          <Input
            label="이름 *"
            type="text"
            name="user_name"
            id="user_name"
            required
            value={newUser.user_name}
            onChange={handleInputChange}
          />
          
          <Input
            label="이메일"
            type="email"
            name="email"
            id="email"
            value={newUser.email}
            onChange={handleInputChange}
          />
          
          <Input
            label="장치 등록 제한"
            type="number"
            name="device_limit"
            id="device_limit"
            min="1"
            max="10"
            required
            value={newUser.device_limit}
            onChange={handleInputChange}
          />
          <Text className="mt-1 text-sm text-gray-500">사용자가 등록할 수 있는 최대 장치 수 (1-10)</Text>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="is_staff"
                name="is_staff"
                type="checkbox"
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                checked={newUser.is_staff}
                onChange={handleInputChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <Text className="font-medium text-gray-900 dark:text-white">교사 권한 (is_staff: {newUser.is_staff ? "true" : "false"})</Text>
              <Text className="text-gray-700">교사 대시보드 접근 권한을 부여합니다.</Text>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="is_superuser"
                name="is_superuser"
                type="checkbox"
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                checked={newUser.is_superuser}
                onChange={handleInputChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <Text className="font-medium text-gray-900 dark:text-white">관리자 권한 (is_superuser: {newUser.is_superuser ? "true" : "false"})</Text>
              <Text className="text-gray-700">관리자 페이지 접근 권한을 부여합니다.</Text>
            </div>
          </div>
        </div>
        
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:col-start-2"
          >
            {loading ? '처리중...' : '사용자 추가'}
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
      </form>
    </Modal>
  );
} 