import React from 'react';
import { Delete, User, Laptop, Network, Calendar } from 'lucide-react';
import { DeviceHistory } from '@/services/admin';
import { BaseTable } from '@/components/ui/StyledComponents';
import { Button, Text, Badge } from '@/components/ui/StyledComponents';
import { formatDateToKorean } from '@/utils/dateUtils';
import { useToastContext } from '@/contexts/ToastContext';

interface IpAssignmentTableProps {
  deviceHistory: DeviceHistory[];
  loading?: boolean;
  onDeleteAssignment: (id: number) => Promise<boolean>;
  extractIpAddress: (details: string) => string;
}

const IpAssignmentTable: React.FC<IpAssignmentTableProps> = ({
  deviceHistory,
  loading = false,
  onDeleteAssignment,
  extractIpAddress
}) => {
  const { showError } = useToastContext();

  const handleDelete = async (id: number) => {
    showError('IP 할당 삭제', '정말로 이 IP 할당을 삭제하시겠습니까?');
    await onDeleteAssignment(id);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (deviceHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        IP 할당 내역이 없습니다.
      </div>
    );
  }

  return (
    <BaseTable>
      <thead>
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            사용자
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            기기 MAC
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            기기 이름
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            IP 주소
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            상태
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            할당일
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            작업
          </th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {deviceHistory.map((history) => (
          <tr key={history.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <Text className="text-sm font-medium text-gray-900 dark:text-white">
                    {history.user.username}
                  </Text>
                  {history.user.email && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {history.user.email}
                    </Text>
                  )}
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <Laptop className="w-4 h-4 mr-2 text-gray-400" />
                <Text className="text-sm text-gray-900 dark:text-white font-mono">
                  {history.device_mac}
                </Text>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Text className="text-sm text-gray-900 dark:text-white">
                {history.device_name}
              </Text>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <Network className="w-4 h-4 mr-2 text-gray-400" />
                <Text className="text-sm text-gray-900 dark:text-white font-mono">
                  {extractIpAddress(history.details)}
                </Text>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge 
                variant={
                  history.action === 'create' ? 'success' : 
                  history.action === 'update' ? 'warning' : 'danger'
                }
              >
                {history.action === 'create' ? '등록' : 
                 history.action === 'update' ? '수정' : '삭제'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <Text className="text-sm text-gray-900 dark:text-white">
                  {history.timestamp ? formatDateToKorean(history.timestamp) : '-'}
                </Text>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Button
                onClick={() => handleDelete(history.id)}
                variant="danger"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Delete className="w-4 h-4" />
                <span>삭제</span>
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </BaseTable>
  );
};

export default IpAssignmentTable; 