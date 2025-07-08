'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, Heading, Text, Spinner as SpinnerComponent } from '@/components/ui/StyledComponents';

interface TeacherPermissionGuardProps {
  children: React.ReactNode;
}

export default function TeacherPermissionGuard({ children }: TeacherPermissionGuardProps) {
  const { checkTeacherPermission, loading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const result = await checkTeacherPermission();
        
        if (result.success) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          if (result.redirect) {
            router.replace('/dashboard');
          }
        }
      } catch (error) {
        console.error('권한 확인 중 오류:', error);
        setAuthorized(false);
        router.replace('/dashboard');
      } finally {
        setAuthChecking(false);
      }
    };

    if (!loading) {
      checkAuthorization();
    }
  }, [checkTeacherPermission, loading, router]);

  if (loading || authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerComponent size="lg" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center p-8">
          <Heading level={2} className="text-red-600 mb-4">접근 권한이 없습니다</Heading>
          <Text>교사 권한이 필요합니다.</Text>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
} 