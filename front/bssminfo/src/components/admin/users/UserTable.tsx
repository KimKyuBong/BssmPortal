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
  current_class?: number;
  grade?: number;
  class_number?: number;
  device_limit: number;
  ip_count: number;
  rental_count: number;
  created_at?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_initial_password?: boolean;
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
    if (userType === 'student') {
      // current_class ID로 학반 정보 찾기
      if (user.current_class && classes && classes.length > 0) {
        const classInfo = classes.find((c: any) => c.id === user.current_class);
        if (classInfo) {
          return `${classInfo.grade}학년 ${classInfo.class_number}반`;
        }
      }
      
      // class_name이 있는 경우 직접 사용
      if (user.class_name) {
        return user.class_name;
      }
      
      // grade와 class_number가 있는 경우 직접 사용
      if (user.grade && user.class_number) {
        return `${user.grade}학년 ${user.class_number}반`;
      }
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
                <BaseTableHeaderCell key={header.key} className="text-center text-sm sm:text-base font-semibold py-2 sm:py-4 px-2 sm:px-6">
                  {header.label}
                </BaseTableHeaderCell>
              ))}
              {showActions && (
                <BaseTableHeaderCell className="text-center text-sm sm:text-base font-semibold py-2 sm:py-4 px-2 sm:px-6">
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
                  <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                    <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                      <div className="flex-shrink-0 h-10 w-10 sm:h-16 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        {userType === 'teacher' ? (
                          <User className="h-5 w-5 sm:h-8 sm:w-8 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <GraduationCap className="h-5 w-5 sm:h-8 sm:w-8 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="text-center">
                        <div className={`text-sm sm:text-lg font-bold truncate max-w-24 sm:max-w-48 ${
                          userType === 'teacher' && user.is_initial_password 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-primary'
                        }`}>
                          {user.user_name || user.username}
                        </div>
                        <div className="text-xs sm:text-base text-secondary truncate max-w-24 sm:max-w-48">
                          {user.username}
                        </div>
                        {user.email && (
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-24 sm:max-w-48">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </BaseTableCell>
                  
                  {/* IP 대여 수 */}
                  <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                    <div 
                      className="text-xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRentalClick?.(user, 'ip');
                      }}
                    >
                      {user.ip_count || 0}
                    </div>
                  </BaseTableCell>
                  
                  {/* 기기 대여 수 */}
                  <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                    <div 
                      className="text-xl sm:text-4xl font-bold text-green-600 dark:text-green-400 cursor-pointer hover:text-green-800 dark:hover:text-green-300 transition-colors flex items-center justify-center"
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
                      <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                        <Text className="text-xs sm:text-base text-secondary">
                          {user.created_at ? format(new Date(user.created_at), 'PPP', { locale: ko }) : '-'}
                        </Text>
                      </BaseTableCell>
                      <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                        <Badge variant={user.is_active ? 'success' : 'danger'} className="text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                          {user.is_active ? '활성' : '비활성'}
                        </Badge>
                      </BaseTableCell>
                    </>
                  )}
                  
                  {/* 학생 전용 컬럼 */}
                  {userType === 'student' && (
                    <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 px-2 sm:px-3 py-1 sm:py-2 rounded-md border border-blue-200 dark:border-blue-800">
                        <Text className="text-xs sm:text-base font-semibold text-blue-800 dark:text-blue-300">
                          {getClassInfo(user)}
                        </Text>
                      </div>
                    </BaseTableCell>
                  )}
                  
                  {/* IP 제한 */}
                  <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4">
                    <div className="text-xl sm:text-4xl font-bold text-secondary flex items-center justify-center">
                      {user.device_limit || 0}
                    </div>
                  </BaseTableCell>
                  
                  {/* 작업 버튼들 */}
                  {showActions && (
                    <BaseTableCell className="text-center py-3 sm:py-6 px-2 sm:px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-center">
                        {onDeviceLimitClick && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeviceLimitClick(user);
                            }}
                            variant="secondary"
                            size="sm"
                            className="flex items-center justify-center min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm"
                          >
                            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                            <span className="hidden sm:inline">설정</span>
                          </Button>
                        )}
                        
                        {onResetPassword && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('[DEBUG] UserTable 비밀번호 초기화 클릭:', {
                                userType,
                                userId: user.id,
                                userUser: (user as any).user,
                                username: user.username,
                                fullUser: user
                              });
                              // 학생의 경우 user.user (User ID)를 사용하고, 교사의 경우 user.id를 사용
                              const targetUserId = userType === 'student' && (user as any).user ? (user as any).user : user.id;
                              console.log('[DEBUG] 최종 전달할 User ID:', targetUserId);
                              onResetPassword(targetUserId, user.username);
                            }}
                            variant="warning"
                            size="sm"
                            className="flex items-center justify-center min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm"
                          >
                            <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                            <span className="hidden sm:inline">초기화</span>
                          </Button>
                        )}
                        
                        {onEdit && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('[DEBUG] UserTable - 편집 버튼 클릭:', {
                                user: user,
                                userType: userType,
                                hasUserField: !!(user as any).user,
                                studentId: user.id,
                                actualUserId: (user as any).user,
                                userName: user.user_name || user.username
                              });
                              onEdit(user);
                            }}
                            variant="secondary"
                            size="sm"
                            className="flex items-center justify-center min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
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
                            size="sm"
                            className="flex items-center justify-center min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
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
                  <Text className="text-sm sm:text-base text-secondary">
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