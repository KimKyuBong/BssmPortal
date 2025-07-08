'use client';

import React from 'react';
import BroadcastDashboard from '../../../../components/broadcast/BroadcastDashboard';
import TeacherPermissionGuard from '../../../../components/admin/TeacherPermissionGuard';

export default function BroadcastPage() {
  return (
    <TeacherPermissionGuard>
      <div className="page-container">
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-flex">
              <div>
                <h1 className="page-title">방송 시스템</h1>
                <p className="page-subtitle">
                  텍스트 및 오디오 방송을 관리하고 시스템 상태를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
          
          <BroadcastDashboard />
        </div>
      </div>
    </TeacherPermissionGuard>
  );
} 