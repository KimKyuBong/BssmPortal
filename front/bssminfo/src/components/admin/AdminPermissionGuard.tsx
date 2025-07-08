'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, Heading, Text, Spinner } from '@/components/ui/StyledComponents';
import { AlertTriangle, Shield } from 'lucide-react';

interface AdminPermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AdminPermissionGuard({ 
  children, 
  fallback 
}: AdminPermissionGuardProps) {
  const router = useRouter();
  const { user, loading, checkAdminPermission } = useAuth();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifyPermission = async () => {
      if (loading) return;

      // 로그인하지 않은 경우
      if (!user) {
        router.push('/login');
        return;
      }

      // 프론트엔드에서 기본 권한 확인
      if (!user.is_superuser) {
        setHasPermission(false);
        setPermissionChecked(true);
        setChecking(false);
        return;
      }

      // 백엔드에서 권한 재확인
      try {
        setChecking(true);
        const result = await checkAdminPermission();
        
        if (result.success) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          if (result.redirect) {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('권한 확인 중 오류:', error);
        setHasPermission(false);
      } finally {
        setPermissionChecked(true);
        setChecking(false);
      }
    };

    verifyPermission();
  }, [user, loading, checkAdminPermission, router]);

  // 로딩 중
  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <Text className="mt-4">권한을 확인하고 있습니다...</Text>
        </div>
      </div>
    );
  }

  // 권한이 없는 경우
  if (permissionChecked && !hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <Heading level={2} className="text-red-600 mb-4">
            접근 권한이 없습니다
          </Heading>
          <Text className="text-gray-600 mb-6">
            이 페이지에 접근하려면 관리자 권한이 필요합니다.
          </Text>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </Card>
      </div>
    );
  }

  // 권한이 있는 경우
  return <>{children}</>;
} 