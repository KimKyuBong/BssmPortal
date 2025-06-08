import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { User, CreateUserRequest } from '@/services/admin';

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
    last_name: '',
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
        last_name: newUser.last_name || undefined,
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
        last_name: '',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              사용자 추가
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-900">
                  아이디 *
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 font-medium"
                  value={newUser.username}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                  비밀번호 *
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 font-medium"
                  value={newUser.password}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-900">
                  이름
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 font-medium"
                  value={newUser.last_name}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                  이메일
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 font-medium"
                  value={newUser.email}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="device_limit" className="block text-sm font-medium text-gray-900">
                  장치 등록 제한
                </label>
                <input
                  type="number"
                  name="device_limit"
                  id="device_limit"
                  min="1"
                  max="10"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 font-medium"
                  value={newUser.device_limit}
                  onChange={handleInputChange}
                />
                <p className="mt-1 text-sm text-gray-500">사용자가 등록할 수 있는 최대 장치 수 (1-10)</p>
              </div>
              
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
                  <label htmlFor="is_staff" className="font-medium text-gray-900">교사 권한 (is_staff: {newUser.is_staff ? "true" : "false"})</label>
                  <p className="text-gray-700">교사 대시보드 접근 권한을 부여합니다.</p>
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
                  <label htmlFor="is_superuser" className="font-medium text-gray-900">관리자 권한 (is_superuser: {newUser.is_superuser ? "true" : "false"})</label>
                  <p className="text-gray-700">관리자 페이지 접근 권한을 부여합니다.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
              >
                {loading ? '처리중...' : '사용자 추가'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 