"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 루트 페이지에 접근하면 로그인 페이지로 리디렉션
    router.replace('/login');
  }, [router]);

  // 리디렉션 중에 표시할 최소한의 화면 - 로딩 스피너나 아무것도 표시하지 않음
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">리디렉션 중...</p>
      </div>
    </div>
  );
}