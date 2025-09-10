'use client';

import React from 'react';
import Link from 'next/link';

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                BSSM 장비 관리 시스템
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                공개 서비스
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            장비 정보 조회 서비스
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            일련번호를 입력하여 장비의 상태, 대여이력, 관리 이력을 확인할 수 있습니다.
            인증 없이 누구나 이용 가능한 공개 서비스입니다.
          </p>
        </div>

        {/* 서비스 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* 장비 조회 서비스 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                장비 정보 조회
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                일련번호로 장비의 상세 정보와 대여이력을 확인하세요
              </p>
              <Link
                href="/public/equipment"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                조회하기
              </Link>
            </div>
          </div>

          {/* 빠른 상태 확인 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                빠른 상태 확인
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                장비의 현재 상태와 대여 여부를 빠르게 확인하세요
              </p>
              <Link
                href="/public/equipment"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                상태 확인
              </Link>
            </div>
          </div>

          {/* 대여이력 조회 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                대여이력 조회
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                장비의 전체 대여이력과 관리 기록을 확인하세요
              </p>
              <Link
                href="/public/equipment"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                이력 보기
              </Link>
            </div>
          </div>
        </div>

        {/* 사용 방법 안내 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            사용 방법
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                일련번호 입력
              </h4>
              <p className="text-sm text-gray-600">
                조회하고 싶은 장비의 일련번호를 입력하세요
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                정보 확인
              </h4>
              <p className="text-sm text-gray-600">
                장비의 상태, 대여이력, 관리 기록을 확인하세요
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                상세 정보 보기
              </h4>
              <p className="text-sm text-gray-600">
                더 자세한 정보가 필요하면 상세보기를 클릭하세요
              </p>
            </div>
          </div>
        </div>

        {/* 주의사항 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                주의사항
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>이 서비스는 공개 API를 통해 제공되며 인증이 필요하지 않습니다.</li>
                  <li>개인정보 보호를 위해 사용자 정보는 제한적으로 제공됩니다.</li>
                  <li>일련번호는 대소문자를 구분하므로 정확히 입력해주세요.</li>
                  <li>존재하지 않는 일련번호로 조회할 경우 오류가 발생합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 BSSM 장비 관리 시스템. 모든 권리 보유.</p>
            <p className="mt-1">
              이 서비스는 공개 API를 통해 제공됩니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
