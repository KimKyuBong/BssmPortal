'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import ThemeToggle from '@/components/ThemeToggle';
import { Card, Heading, Text, Input, Button } from '@/components/ui/StyledComponents';
import { AlertTriangle, Download, Info, X } from 'lucide-react';
import dnsService from '@/services/dns';

// SSL 인증서 설치 안내 모달 컴포넌트
function SSLCertificateModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              SSL 인증서 설치 안내
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* 컨텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* 경고 메시지 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    보안 경고가 나타났나요?
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    교내 CA 인증서를 설치하면 안전한 연결이 완성됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 기기별 설치 방법 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                기기별 인증서 설치 방법
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 윈도우 노트북 */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0V0z" fill="none"/>
                      <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z"/>
                    </svg>
                    윈도우 노트북
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                    <li>아래 링크에서 CA 인증서를 다운로드합니다.</li>
                    <li>다운로드한 인증서 파일을 더블클릭합니다.</li>
                    <li>"인증서 저장소"에서 "신뢰할 수 있는 루트 인증 기관"을 선택합니다.</li>
                    <li>"다음"을 클릭하여 설치를 완료합니다.</li>
                    <li>브라우저를 재시작합니다.</li>
                  </ol>
                </div>

                {/* 맥북 */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    맥북 (macOS)
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                    <li>아래 링크에서 CA 인증서를 다운로드합니다.</li>
                    <li>다운로드한 인증서 파일을 더블클릭합니다.</li>
                    <li>키체인 접근 앱이 열리면 "시스템" 키체인을 선택합니다.</li>
                    <li>인증서를 더블클릭하고 "항상 신뢰"로 설정합니다.</li>
                    <li>브라우저를 재시작합니다.</li>
                  </ol>
                </div>

                {/* 안드로이드 */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.6 11.48L19.44 8.3a1.63 1.63 0 0 0-1.09-2.27l-1.95-.49a1.63 1.63 0 0 0-1.09.49L13.64 8.3A4.49 4.49 0 0 0 12 8a4.49 4.49 0 0 0-1.64.3L8.69 6.03a1.63 1.63 0 0 0-1.09-.49l-1.95.49A1.63 1.63 0 0 0 4.56 8.3L6.4 11.48A4.49 4.49 0 0 0 6 12a4.49 4.49 0 0 0 .4.52L4.56 15.7a1.63 1.63 0 0 0 1.09 2.27l1.95.49a1.63 1.63 0 0 0 1.09-.49L10.36 15.7A4.49 4.49 0 0 0 12 16a4.49 4.49 0 0 0 1.64-.3l2.27 2.27a1.63 1.63 0 0 0 1.09.49l1.95-.49a1.63 1.63 0 0 0 1.09-2.27L17.6 11.48zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                    </svg>
                    안드로이드
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                    <li>아래 링크에서 CA 인증서를 다운로드합니다.</li>
                    <li>설정 → 보안 → 암호화 및 자격 증명으로 이동합니다.</li>
                    <li>"CA 인증서 설치" 또는 "인증서 저장소"를 선택합니다.</li>
                    <li>다운로드한 인증서 파일을 선택하여 설치합니다.</li>
                    <li>브라우저를 재시작합니다.</li>
                  </ol>
                </div>

                {/* 핸드폰 (iOS) */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-4 20c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5.25-4H6.75V4h10.5v13z"/>
                    </svg>
                    핸드폰 (iOS)
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                    <li>아래 링크에서 CA 인증서를 다운로드합니다.</li>
                    <li>설정 → 일반 → VPN 및 기기 관리로 이동합니다.</li>
                    <li>"프로필 다운로드됨" 또는 "기업용 앱"에서 인증서를 찾습니다.</li>
                    <li>인증서를 탭하여 설치하고 "신뢰"를 선택합니다.</li>
                    <li>설정 → 일반 → 정보 → 인증서 신뢰 설정에서 활성화합니다.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 다운로드 링크 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    CA 인증서 다운로드
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    교내 CA 인증서를 다운로드하여 설치해주세요.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const response = await dnsService.downloadCaCertificate();
                      
                      if (response.success && response.data) {
                        // 인증서를 파일로 다운로드
                        const blob = new Blob([response.data], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'bssm_root_ca.crt';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } else {
                        throw new Error('CA 인증서 다운로드에 실패했습니다.');
                      }
                    } catch (error) {
                      console.error('CA 인증서 다운로드 실패:', error);
                      alert('CA 인증서 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
                    }
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  다운로드
                </button>
              </div>
            </div>

            {/* 주의사항 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    주의사항
                  </h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                    <li>인증서 설치 후 브라우저를 반드시 재시작해주세요.</li>
                    <li>인증서는 교내 네트워크에서만 유효합니다.</li>
                    <li>설치 중 문제가 발생하면 학교 IT 관리자에게 문의하세요.</li>
                    <li>모바일 기기의 경우 브라우저 설정에서 추가 확인이 필요할 수 있습니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSSLCertificateModal, setShowSSLCertificateModal] = useState(false);

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
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      {/* 다크모드 토글 버튼 */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <Card>
          <Heading level={1} className="text-center mb-6 text-blue-600 dark:text-blue-400">
            BSSM 정보 포털
          </Heading>
          
          {/* SSL 인증서 설치 안내 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  혹시 들어오실 때 보안 경고가 뜨셨나요?
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  아래 방법에 따라 교내 CA 인증서를 등록해주시면 안전한 연결이 완성됩니다.
                </p>
                <button
                  onClick={() => setShowSSLCertificateModal(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline"
                >
                  자세한 설치 방법 보기
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="아이디"
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              disabled={isLoading}
            />
            
            <Input
              label="비밀번호"
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              disabled={isLoading}
            />
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              계정이 없으신가요? 학교 관리자에게 문의하세요.
            </Text>
          </div>
        </Card>
      </div>

      {/* SSL 인증서 설치 안내 모달 */}
      <SSLCertificateModal 
        isOpen={showSSLCertificateModal} 
        onClose={() => setShowSSLCertificateModal(false)} 
      />
    </div>
  );
} 