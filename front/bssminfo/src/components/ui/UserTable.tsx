import React from 'react';
import { User, Edit, Trash2, Key, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BaseTable, BaseTableHead, BaseTableHeaderCell, BaseTableBody, BaseTableRow, BaseTableCell, Badge, Button, Checkbox } from './StyledComponents';

interface UserData {
  id: number;
  username: string;
  email?: string;
  user_name?: string;
  ip_count?: number;
  rental_count?: number;
  created_at?: string;
  is_active?: boolean;
  device_limit?: number;
  current_class?: number;
  grade?: number;
  class_number?: number;
}

interface UserTableProps {
  users: UserData[];
  selectedUsers?: number[];
  onUserSelect?: (userId: number, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onEdit?: (user: UserData) => void;
  onDelete?: (userId: number) => void;
  onResetPassword?: (userId: number, username: string) => void;
  onRentalClick?: (user: UserData, type: 'ip' | 'device') => void;
  showActions?: boolean;
  className?: string;
  userType?: 'teacher' | 'student';
  classes?: Array<{ id: number; grade: number; class_number: number }>;
  onSelectAll?: (isSelected: boolean) => void;
}

export default function UserTable({
  users,
  selectedUsers = [],
  onUserSelect,
  onEdit,
  onDelete,
  onResetPassword,
  onRentalClick,
  showActions = true,
  className = '',
  userType = 'teacher',
  classes = [],
  onSelectAll
}: UserTableProps) {
  const getClassInfo = (user: UserData) => {
    if (userType === 'student' && user.current_class) {
      const classInfo = classes.find(c => c.id === user.current_class);
      return classInfo ? `${classInfo.grade}학년 ${classInfo.class_number}반` : '-';
    }
    return '-';
  };

  const getHeaders = () => {
    const baseHeaders = [
      { key: 'user', label: '사용자 정보' },
      { key: 'ip_count', label: 'IP 대여 수' },
      { key: 'rental_count', label: '기기 대여 수' }
    ];

    if (userType === 'teacher') {
      return [
        ...baseHeaders,
        { key: 'created_at', label: '가입일' },
        { key: 'status', label: '상태' },
        { key: 'device_limit', label: 'IP 제한' }
      ];
    } else {
      return [
        ...baseHeaders,
        { key: 'class', label: '학반' },
        { key: 'device_limit', label: 'IP 제한' }
      ];
    }
  };

  return (
    <BaseTable className={className}>
      <BaseTableHead>
        <BaseTableRow>
          {getHeaders().map(header => (
            <BaseTableHeaderCell key={header.key}>
              {header.label}
            </BaseTableHeaderCell>
          ))}
          {showActions && (
            <BaseTableHeaderCell>작업</BaseTableHeaderCell>
          )}
        </BaseTableRow>
      </BaseTableHead>
      <BaseTableBody>
        {users.map((user) => {
          const isSelected = selectedUsers.includes(user.id);
          
          return (
            <BaseTableRow 
              key={user.id}
              isSelected={isSelected}
              onClick={(e) => onUserSelect?.(user.id, e)}
            >
              {/* 사용자 정보 */}
              <BaseTableCell>
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0 h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {userType === 'teacher' ? (
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <GraduationCap className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-primary truncate">
                      {user.user_name || user.username}
                    </div>
                    <div className="text-xs text-secondary truncate">
                      {user.username}
                    </div>
                  </div>
                </div>
              </BaseTableCell>
              
              {/* IP 대여 수 */}
              <BaseTableCell className="text-center">
                <div 
                  className="text-primary font-semibold cursor-pointer hover:text-blue-600 text-center text-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRentalClick?.(user, 'ip');
                  }}
                >
                  {user.ip_count || 0}
                </div>
              </BaseTableCell>
              
              {/* 기기 대여 수 */}
              <BaseTableCell className="text-center">
                <div 
                  className="text-primary font-semibold cursor-pointer hover:text-blue-600 text-center text-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRentalClick?.(user, 'device');
                  }}
                >
                  {user.rental_count || 0}
                </div>
              </BaseTableCell>
              
              {/* 교사 전용 컬럼들 */}
              {userType === 'teacher' && (
                <>
                  <BaseTableCell className="text-secondary">
                    {user.created_at ? format(new Date(user.created_at), 'PPP', { locale: ko }) : '-'}
                  </BaseTableCell>
                  <BaseTableCell>
                    <Badge variant={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? '활성' : '비활성'}
                    </Badge>
                  </BaseTableCell>
                </>
              )}
              
              {/* 학생 전용 컬럼 */}
              {userType === 'student' && (
                <BaseTableCell className="text-secondary">
                  {getClassInfo(user)}
                </BaseTableCell>
              )}
              
              {/* IP 제한 */}
              <BaseTableCell className="text-center">
                <div className="text-lg font-semibold text-secondary">
                  {user.device_limit || 0}
                </div>
              </BaseTableCell>
              
              {/* 작업 버튼들 */}
              {showActions && (
                <BaseTableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    {onEdit && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(user);
                        }}
                        variant="secondary"
                        size="sm"
                        className="flex items-center"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        수정
                      </Button>
                    )}
                    
                    {onResetPassword && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetPassword(user.id, user.username);
                        }}
                        variant="warning"
                        size="sm"
                        className="flex items-center"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        초기화
                      </Button>
                    )}
                    
                    {onDelete && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(user.id);
                        }}
                        variant="danger"
                        size="sm"
                        className="flex items-center"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        삭제
                      </Button>
                    )}
                  </div>
                </BaseTableCell>
              )}
            </BaseTableRow>
          );
        })}
        
        {users.length === 0 && (
          <BaseTableRow>
            <BaseTableCell 
              colSpan={getHeaders().length + (showActions ? 1 : 0)} 
              className="text-center text-secondary"
            >
              등록된 사용자가 없거나 검색 결과가 없습니다.
            </BaseTableCell>
          </BaseTableRow>
        )}
      </BaseTableBody>
    </BaseTable>
  );
} 