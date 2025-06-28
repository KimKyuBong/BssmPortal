'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 컴포넌트 마운트 시 로컬 스토리지에서 이전에 입력한 사용자 이름과 에러 로드
  useEffect(() => {
    const savedUsername = localStorage.getItem('lastUsername');
    const savedError = localStorage.getItem('loginError');
    
    if (savedUsername) {
      setUsername(savedUsername);
    }
    
    if (savedError) {
      setError(savedError);
      // 에러는 읽고 난 후 삭제
      localStorage.removeItem('loginError');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 사용자 이름을 로컬 스토리지에 저장
    localStorage.setItem('lastUsername', username);

    try {
      // 통합된 로그인 메소드 사용
      const response = await authService.login({ username, password });
      
      if (response.success) {
        console.log('로그인 성공:', response.data);
        
        // 로그인 성공 후 사용자 정보 가져오기
        const userResponse = await authService.getCurrentUser();
        
        // 초기 비밀번호 상태 확인
        if (userResponse.success && userResponse.data && userResponse.data.is_initial_password) {
          console.log('초기 비밀번호 상태입니다. 비밀번호 변경 페이지로 이동합니다.');
          router.push('/dashboard/user/change-password');
        } else {
          router.push('/dashboard');
        }
      } else {
        console.error('로그인 실패:', response.message);
        setError(response.message || '로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: any) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">BSSM 정보 포털</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-800 mb-1">
                아이디
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="아이디를 입력하세요"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-700">
              계정이 없으신가요? 학교 관리자에게 문의하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 