import React from 'react';
import { Tab } from '@headlessui/react';
import { Key, Trash2 } from 'lucide-react';
import { Card, Button, Text } from '@/components/ui/StyledComponents';
import SelectableTable from '@/components/ui/SelectableTable';
import { BaseTableCell } from '@/components/ui/StyledComponents';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ExtendedUser {
  id: number;
  username: string;
  user_name: string;
  email: string;
  device_limit: number;
  ip_count: number;
  rental_count: number;
  created_at: string;
  is_superuser: boolean;
  is_initial_password: boolean;
  is_staff: boolean;
  is_active: boolean;
}

interface ExtendedStudent {
  id: number;
  user: number;
  username: string;
  user_name: string;
  class_name?: string;
  device_limit: number;
  ip_count: number;
  rental_count: number;
  created_at?: string;
}

interface UserManagementTabsProps {
  teachers: ExtendedUser[];
  students: ExtendedStudent[];
  selectedTeachers: number[];
  selectedStudents: number[];
  onTeacherSelectionChange: (selected: number[]) => void;
  onStudentSelectionChange: (selected: number[]) => void;
  onBulkTeacherAction: (action: 'delete' | 'reset') => Promise<void>;
  onBulkStudentAction: (action: 'delete' | 'reset') => Promise<void>;
  onDeviceLimitClick: (user: any) => void;
  onResetPasswordClick: (id: number, username: string) => void;
  onRentalClick: (user: any, type: 'ip' | 'device') => void;
  onDeleteUser: (userId: number) => Promise<{ success: boolean; message: string }>;
  onResetPassword: (userId: number, password: string) => Promise<{ success: boolean; password: string | null }>;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function UserManagementTabs({
  teachers,
  students,
  selectedTeachers,
  selectedStudents,
  onTeacherSelectionChange,
  onStudentSelectionChange,
  onBulkTeacherAction,
  onBulkStudentAction,
  onDeviceLimitClick,
  onResetPasswordClick,
  onRentalClick,
  onDeleteUser,
  onResetPassword
}: UserManagementTabsProps) {
  return (
    <Tab.Group>
      <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
        <Tab
          className={({ selected }: { selected: boolean }) =>
            classNames(
              'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
              'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
              selected
                ? 'bg-white shadow text-blue-700'
                : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
            )
          }
        >
          교사
        </Tab>
        <Tab
          className={({ selected }: { selected: boolean }) =>
            classNames(
              'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
              'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
              selected
                ? 'bg-white shadow text-blue-700'
                : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
            )
          }
        >
          학생
        </Tab>
      </Tab.List>
      
      <Tab.Panels>
        <Tab.Panel>
          {/* 교사 관리 */}
          {selectedTeachers.length > 0 && (
            <Card className="mb-6">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => onBulkTeacherAction('reset')}
                  variant="warning"
                  className="flex items-center"
                >
                  <Key className="h-4 w-4 mr-2" />
                  선택한 교사 비밀번호 초기화
                </Button>
                <Button
                  onClick={() => onBulkTeacherAction('delete')}
                  variant="danger"
                  className="flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  선택한 교사 삭제
                </Button>
              </div>
            </Card>
          )}
          
          <Card className="mb-6">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <Text className="text-sm text-blue-800 dark:text-blue-300">
                <strong>다중 선택 기능:</strong> Ctrl/⌘ + 클릭: 개별 선택/해제 토글 | Shift + 클릭: 마지막으로 선택한 항목과 현재 항목 사이의 모든 항목 선택
              </Text>
            </div>
            
            <SelectableTable
              data={teachers}
              selectedItems={selectedTeachers}
              onSelectionChange={onTeacherSelectionChange}
              headers={[
                { key: 'username', label: '아이디' },
                { key: 'user_name', label: '이름' },
                { key: 'email', label: '이메일' },
                { key: 'device_limit', label: '기기 제한' },
                { key: 'ip_count', label: 'IP 대여' },
                { key: 'rental_count', label: '장비 대여' },
                { key: 'created_at', label: '가입일' },
                { key: 'actions', label: '작업' }
              ]}
              getItemId={(item) => item.id}
              renderRow={(teacher, isSelected, onClick) => (
                <>
                  <BaseTableCell>{teacher.username}</BaseTableCell>
                  <BaseTableCell>{teacher.user_name || '-'}</BaseTableCell>
                  <BaseTableCell>{teacher.email || '-'}</BaseTableCell>
                  <BaseTableCell>{teacher.device_limit || 0}</BaseTableCell>
                  <BaseTableCell>{teacher.ip_count || 0}</BaseTableCell>
                  <BaseTableCell>{teacher.rental_count || 0}</BaseTableCell>
                  <BaseTableCell>
                    {teacher.created_at ? format(new Date(teacher.created_at), 'yyyy-MM-dd', { locale: ko }) : '-'}
                  </BaseTableCell>
                  <BaseTableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeviceLimitClick({
                            ...teacher,
                            id: teacher.id,
                            username: teacher.username,
                            device_limit: teacher.device_limit || 0
                          });
                        }}
                      >
                        편집
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetPasswordClick(teacher.id, teacher.username);
                        }}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRentalClick(teacher, 'ip');
                        }}
                      >
                        IP
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRentalClick(teacher, 'device');
                        }}
                      >
                        장비
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onDeleteUser(teacher.id);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </BaseTableCell>
                </>
              )}
            />
          </Card>
        </Tab.Panel>
        
        <Tab.Panel>
          {/* 학생 관리 */}
          {selectedStudents.length > 0 && (
            <Card className="mb-6">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => onBulkStudentAction('reset')}
                  variant="warning"
                  className="flex items-center"
                >
                  <Key className="h-4 w-4 mr-2" />
                  선택한 학생 비밀번호 초기화
                </Button>
                <Button
                  onClick={() => onBulkStudentAction('delete')}
                  variant="danger"
                  className="flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  선택한 학생 삭제
                </Button>
              </div>
            </Card>
          )}
          
          <Card className="mb-6">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <Text className="text-sm text-blue-800 dark:text-blue-300">
                <strong>다중 선택 기능:</strong> Ctrl/⌘ + 클릭: 개별 선택/해제 토글 | Shift + 클릭: 마지막으로 선택한 항목과 현재 항목 사이의 모든 항목 선택
              </Text>
            </div>
            
            <SelectableTable
              data={students}
              selectedItems={selectedStudents}
              onSelectionChange={onStudentSelectionChange}
              headers={[
                { key: 'username', label: '아이디' },
                { key: 'user_name', label: '이름' },
                { key: 'class_name', label: '학반' },
                { key: 'device_limit', label: '기기 제한' },
                { key: 'ip_count', label: 'IP 대여' },
                { key: 'rental_count', label: '장비 대여' },
                { key: 'created_at', label: '가입일' },
                { key: 'actions', label: '작업' }
              ]}
              getItemId={(item) => item.id}
              renderRow={(student, isSelected, onClick) => (
                <>
                  <BaseTableCell>{student.username}</BaseTableCell>
                  <BaseTableCell>{student.user_name || '-'}</BaseTableCell>
                  <BaseTableCell>{student.class_name || '-'}</BaseTableCell>
                  <BaseTableCell>{student.device_limit || 0}</BaseTableCell>
                  <BaseTableCell>{student.ip_count || 0}</BaseTableCell>
                  <BaseTableCell>{student.rental_count || 0}</BaseTableCell>
                  <BaseTableCell>
                    {student.created_at ? format(new Date(student.created_at), 'yyyy-MM-dd', { locale: ko }) : '-'}
                  </BaseTableCell>
                  <BaseTableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeviceLimitClick({
                            ...student,
                            id: student.id,
                            username: student.username,
                            device_limit: student.device_limit || 0
                          });
                        }}
                      >
                        편집
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetPasswordClick(student.user, student.username);
                        }}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRentalClick(student, 'ip');
                        }}
                      >
                        IP
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRentalClick(student, 'device');
                        }}
                      >
                        장비
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onDeleteUser(student.user);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </BaseTableCell>
                </>
              )}
            />
          </Card>
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  );
} 