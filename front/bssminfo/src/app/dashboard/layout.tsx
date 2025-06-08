'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, Menu, X } from 'lucide-react';
import useAppState from '@/hooks/useAppState';
import useMenuItems from '@/hooks/useMenuItems';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 애플리케이션 상태 관리 훅 사용
  const {
    user,
    loading,
    pathname,
    sidebarOpen,
    setSidebarOpen,
    isActive,
    handleLogout,
    getHeaderTitle
  } = useAppState();

  // 메뉴 아이템 관리 훅 사용
  const { menuItems, teacherMenuItems, adminMenuItems, showTeacherMenu, showAdminMenu } = useMenuItems(user, isActive);

  // 로딩 중일 때 스피너 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 사이드바 토글 버튼 */}
      <div className="lg:hidden fixed top-0 left-0 w-full bg-white z-10 p-4 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center">
          <Image 
            src="/logo.png" 
            alt="BSSM Logo" 
            width={32} 
            height={32} 
            className="mr-2"
          />
          <span className="font-semibold text-gray-900">BSSM 정보포털</span>
        </div>
      </div>

      {/* 사이드바 */}
      <div className={`lg:block fixed inset-y-0 left-0 z-20 w-64 bg-white shadow transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="h-full flex flex-col">
          {/* 사이드바 헤더 */}
          <div className="flex items-center justify-center p-6 border-b">
            <Image 
              src="/logo.png" 
              alt="BSSM Logo" 
              width={40} 
              height={40} 
              className="mr-3"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">BSSM 정보포털</h1>
              <p className="text-xs text-gray-500">Made by KKB</p>
            </div>
          </div>
          
          {/* 사이드바 메뉴 */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {/* 공통 메뉴 */}
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    item.isActive(pathname || '') 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              
              {/* 교사 전용 메뉴 */}
              {showTeacherMenu && (
                <>
                  <div className="pt-4 pb-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                      교사 메뉴
                    </div>
                  </div>
                  
                  {teacherMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        item.isActive(pathname || '') 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </>
              )}

              {/* 관리자 전용 메뉴 */}
              {showAdminMenu && adminMenuItems.length > 0 && (
                <>
                  <div className="pt-4 pb-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                      관리자 메뉴
                    </div>
                  </div>
                  
                  {adminMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        item.isActive(pathname || '') 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          
          {/* 로그아웃 버튼 */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-700 hover:bg-red-50 w-full"
            >
              <LogOut className="mr-3 h-5 w-5" />
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className={`lg:pl-64 pt-16 lg:pt-0 min-h-screen`}>
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
} 