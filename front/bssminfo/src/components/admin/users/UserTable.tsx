import React from 'react';
import { User, GraduationCap, Edit, Trash2, Key, Settings, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  BaseTable, 
  BaseTableHead, 
  BaseTableHeaderCell, 
  BaseTableBody, 
  BaseTableRow, 
  BaseTableCell, 
  Button, 
  Badge,
  Text
} from '@/components/ui/StyledComponents';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface UserData {
  id: number;
  username: string;
  user_name?: string;
  email?: string;
  class_name?: string;
  device_limit: number;
  ip_count: number;
  rental_count: number;
  created_at?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

interface UserTableProps {
  users: UserData[];
  selectedUsers: number[];
  onUserSelect: (userId: number, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onEdit?: (user: UserData) => void;
  onDelete?: (userId: number) => void;
  onResetPassword?: (userId: number, username: string) => void;
  onRentalClick?: (user: UserData, type: 'ip' | 'device') => void;
  onDeviceLimitClick?: (user: UserData) => void;
  showActions?: boolean;
  className?: string;
  userType?: 'teacher' | 'student';
  classes?: any[];
}

export default function UserTable({
  users,
  selectedUsers = [],
  onUserSelect,
  onEdit,
  onDelete,
  onResetPassword,
  onRentalClick,
  onDeviceLimitClick,
  showActions = true,
  className = '',
  userType = 'teacher',
  classes = []
}: UserTableProps) {
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    userId: number | null;
    username: string;
  }>({
    isOpen: false,
    userId: null,
    username: ''
  });

  const getClassInfo = (user: UserData) => {
    if (userType === 'student' && user.class_name) {
      return user.class_name;
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

  const handleDeleteClick = (userId: number, username: string) => {
    setDeleteConfirm({
      isOpen: true,
      userId,
      username
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.userId && onDelete) {
      onDelete(deleteConfirm.userId);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({
      isOpen: false,
      userId: null,
      username: ''
    });
  };

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      <div className="overflow-x-auto">
        <BaseTable className="min-w-full text-center">
          <BaseTableHead>
            <BaseTableRow>
              {getHeaders().map(header => (
                <BaseTableHeaderCell key={header.key} className="text-center text-lg font-semibold py-4 px-6">
                  {header.label}
                </BaseTableHeaderCell>
              ))}
              {showActions && (
                <BaseTableHeaderCell className="text-center text-lg font-semibold py-4 px-6">
                  작업
                </BaseTableHeaderCell>
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
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* 사용자 정보 */}
                  <BaseTableCell className="text-center py-6 px-4">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        {userType === 'teacher' ? (
                          <User className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <GraduationCap className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary truncate max-w-48">
                          {user.user_name || user.username}
                        </div>
                        <div className="text-lg text-secondary truncate max-w-48">
                          {user.username}
                        </div>
                        {user.email && (
                          <div className="text-base text-gray-500 dark:text-gray-400 truncate max-w-48">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </BaseTableCell>
                  
                  {/* IP 대여 수 */}
                  <BaseTableCell className="text-center py-6 px-4">
                    <div 
                      className="text-4xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRentalClick?.(user, 'ip');
                      }}
                    >
                      {user.ip_count || 0}
                    </div>
                  </BaseTableCell>
                  
                  {/* 기기 대여 수 */}
                  <BaseTableCell className="text-center py-6 px-4">
                    <div 
                      className="text-4xl font-bold text-green-600 dark:text-green-400 cursor-pointer hover:text-green-800 dark:hover:text-green-300 transition-colors flex items-center justify-center"
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
                      <BaseTableCell className="text-center py-6 px-4">
                        <Text className="text-lg text-secondary">
                          {user.created_at ? format(new Date(user.created_at), 'PPP', { locale: ko }) : '-'}
                        </Text>
                      </BaseTableCell>
                      <BaseTableCell className="text-center py-6 px-4">
                        <Badge variant={user.is_active ? 'success' : 'danger'} className="text-lg px-4 py-2">
                          {user.is_active ? '활성' : '비활성'}
                        </Badge>
                      </BaseTableCell>
                    </>
                  )}
                  
                  {/* 학생 전용 컬럼 */}
                  {userType === 'student' && (
                    <BaseTableCell className="text-center py-6 px-4">
                      <Text className="text-lg text-secondary">
                        {getClassInfo(user)}
                      </Text>
                    </BaseTableCell>
                  )}
                  
                  {/* IP 제한 */}
                  <BaseTableCell className="text-center py-6 px-4">
                    <div className="text-4xl font-bold text-secondary flex items-center justify-center">
                      {user.device_limit || 0}
                    </div>
                  </BaseTableCell>
                  
                  {/* 작업 버튼들 */}
                  {showActions && (
                    <BaseTableCell className="text-center py-6 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        {onDeviceLimitClick && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeviceLimitClick(user);
                            }}
                            variant="secondary"
                            size="lg"
                            className="flex items-center justify-center min-w-[80px]"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">설정</span>
                          </Button>
                        )}
                        
                        {onResetPassword && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onResetPassword(user.id, user.username);
                            }}
                            variant="warning"
                            size="lg"
                            className="flex items-center justify-center min-w-[80px]"
                          >
                            <Key className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">초기화</span>
                          </Button>
                        )}
                        
                        {onEdit && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(user);
                            }}
                            variant="secondary"
                            size="lg"
                            className="flex items-center justify-center min-w-[80px]"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">수정</span>
                          </Button>
                        )}
                        
                        {onDelete && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(user.id, user.user_name || user.username);
                            }}
                            variant="danger"
                            size="lg"
                            className="flex items-center justify-center min-w-[80px]"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">삭제</span>
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
                  className="text-center py-12"
                >
                  <Text className="text-xl text-secondary">
                    등록된 사용자가 없거나 검색 결과가 없습니다.
                  </Text>
                </BaseTableCell>
              </BaseTableRow>
            )}
          </BaseTableBody>
        </BaseTable>
      </div>

      {/* 삭제 확인 대화상자 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="사용자 삭제 확인"
        message={`정말로 '${deleteConfirm.username}' 사용자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터가 영구적으로 삭제됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
} 