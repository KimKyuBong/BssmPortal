'use client';

import React from 'react';

interface ErrorMessageProps {
  title: string;
  message: string;
  serialNumber?: string;
  className?: string;
}

export default function ErrorMessage({ 
  title, 
  message, 
  serialNumber, 
  className = '' 
}: ErrorMessageProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-red-200 p-6 ${className}`}>
      <div className="text-center">
        {/* 아이콘 */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg
            className="h-6 w-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* 제목 */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>

        {/* 메시지 */}
        <p className="text-sm text-gray-600 mb-4">
          {message}
        </p>

        {/* 일련번호 표시 */}
        {serialNumber && (
          <div className="bg-gray-50 rounded-md px-3 py-2 mb-4">
            <p className="text-xs text-gray-500 mb-1">조회한 일련번호:</p>
            <p className="text-sm font-mono text-gray-900">{serialNumber}</p>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="text-xs text-gray-500">
          <p>일련번호를 다시 확인해주세요.</p>
          <p className="mt-1">문제가 지속되면 관리자에게 문의하세요.</p>
        </div>
      </div>
    </div>
  );
}
