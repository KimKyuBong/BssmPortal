'use client';

import React from 'react';
import BroadcastDashboard from '../../../../components/broadcast/BroadcastDashboard';

export default function BroadcastPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">방송 시스템</h1>
          <p className="mt-2 text-sm text-gray-600">
            텍스트 및 오디오 방송을 관리하고 시스템 상태를 확인할 수 있습니다.
          </p>
        </div>
        
        <BroadcastDashboard />
      </div>
    </div>
  );
} 