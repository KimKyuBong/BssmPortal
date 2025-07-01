import React, { useMemo } from 'react';
import { Home, UserCog, Laptop, Settings, History, Users, Shield, BookOpen, Network, Ban, Volume2 } from 'lucide-react';
import { User } from '@/services/auth';

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  isActive: (pathname: string) => boolean;
}

/**
 * 애플리케이션의 메뉴 아이템을 관리하는 커스텀 훅
 * 사용자 권한에 따라 적절한 메뉴를 제공합니다.
 */
const useMenuItems = (user: User | null, isActive: (href: string, pathname: string) => boolean) => {
  // 기본 메뉴 아이템 (모든 사용자에게 보이는 메뉴)
  const menuItems = useMemo(() => [
    { 
      name: '대시보드', 
      icon: <Home className="mr-3 h-5 w-5" />, 
      href: '/dashboard',
      isActive: (pathname: string) => isActive('/dashboard', pathname)
    },
    { 
      name: '내 정보', 
      icon: <UserCog className="mr-3 h-5 w-5" />, 
      href: '/dashboard/user',
      isActive: (pathname: string) => isActive('/dashboard/user', pathname)
    },
    { 
      name: '내 IP 관리', 
      icon: <Laptop className="mr-3 h-5 w-5" />, 
      href: '/dashboard/user/my-ips',
      isActive: (pathname: string) => isActive('/dashboard/user/my-ips', pathname)
    },
    { 
      name: '내 IP 발급 내역', 
      icon: <Network className="mr-3 h-5 w-5" />, 
      href: '/dashboard/user/ip-assignments',
      isActive: (pathname: string) => isActive('/dashboard/user/ip-assignments', pathname)
    },
    { 
      name: '장비 대여', 
      icon: <BookOpen className="mr-3 h-5 w-5" />, 
      href: '/dashboard/user/rentals',
      isActive: (pathname: string) => isActive('/dashboard/user/rentals', pathname)
    },
    { 
      name: '장비 대여 내역', 
      icon: <History className="mr-3 h-5 w-5" />, 
      href: '/dashboard/user/rental-history',
      isActive: (pathname: string) => isActive('/dashboard/user/rental-history', pathname)
    },
    { 
      name: '비밀번호 변경', 
      icon: <Settings className="mr-3 h-5 w-5" />, 
      href: '/dashboard/user/change-password',
      isActive: (pathname: string) => isActive('/dashboard/user/change-password', pathname)
    },
  ], [isActive]);

  // 교사 전용 메뉴 아이템 (is_staff = true)
  const teacherMenuItems = useMemo(() => [
    { 
      name: '방송하기', 
      icon: <Volume2 className="mr-3 h-5 w-5" />, 
      href: '/dashboard/teacher/broadcast', 
      isActive: (pathname: string) => isActive('/dashboard/teacher/broadcast', pathname)
    },
  ], [isActive]);
  
  // 관리자 전용 메뉴 아이템 (is_superuser = true)
  const adminMenuItems: MenuItem[] = useMemo(() => [
    { 
      name: '사용자 관리', 
      icon: <Users className="mr-3 h-5 w-5" />, 
      href: '/dashboard/admin/users', 
      isActive: (pathname: string) => isActive('/dashboard/admin/users', pathname)
    },
    {
      name: 'IP 관리',
      icon: <Ban className="mr-3 h-5 w-5" />,
      href: '/dashboard/admin/ip-management',
      isActive: (pathname: string) => isActive('/dashboard/admin/ip-management', pathname)
    },
    { 
      name: 'DNS 관리',
      icon: <Network className="mr-3 h-5 w-5" />,
      href: '/dashboard/admin/dns',
      isActive: (pathname: string) => isActive('/dashboard/admin/dns', pathname)
    },
    { 
      name: 'IP 할당 내역', 
      icon: <Network className="mr-3 h-5 w-5" />, 
      href: '/dashboard/admin/ip-assignments', 
      isActive: (pathname: string) => isActive('/dashboard/admin/ip-assignments', pathname)
    },
    { 
      name: '장비 관리', 
      icon: <Shield className="mr-3 h-5 w-5" />, 
      href: '/dashboard/admin/equipment', 
      isActive: (pathname: string) => isActive('/dashboard/admin/equipment', pathname)
    },
    { 
      name: '대여 요청 관리', 
      icon: <BookOpen className="mr-3 h-5 w-5" />, 
      href: '/dashboard/admin/rental-requests', 
      isActive: (pathname: string) => isActive('/dashboard/admin/rental-requests', pathname)
    },
    { 
      name: '방송관리', 
      icon: <Volume2 className="mr-3 h-5 w-5" />, 
      href: '/dashboard/admin/broadcast-management', 
      isActive: (pathname: string) => isActive('/dashboard/admin/broadcast-management', pathname)
    },
  ], [isActive]);
  
  // 교사 메뉴 표시 여부 (is_staff = true인 경우, 관리자도 포함)
  const showTeacherMenu = useMemo(() => {
    return user?.is_staff === true;
  }, [user]);
  
  // 관리자 메뉴 표시 여부 (is_superuser = true인 경우)
  const showAdminMenu = useMemo(() => {
    return user?.is_superuser === true;
  }, [user]);

  return {
    menuItems,
    teacherMenuItems,
    adminMenuItems,
    showTeacherMenu,
    showAdminMenu
  };
};

export default useMenuItems; 