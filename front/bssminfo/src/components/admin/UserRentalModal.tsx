import React from 'react';
import { X } from 'lucide-react';
import { Modal, Heading, Text, Spinner, Button } from '@/components/ui/StyledComponents';

interface User {
  id: number;
  username: string;
}

interface EquipmentDetail {
  id: number;
  name: string;
  manufacturer: string;
  model_name: string;
  asset_number?: string;
  management_number?: string;
  serial_number?: string;
}

interface RentalDetail {
  id: number;
  device_name?: string;
  mac_address?: string;
  assigned_ip?: string;
  created_at?: string;
  last_access?: string;
  is_active?: boolean;
  equipment_detail?: EquipmentDetail;
  rental_date?: string;
  due_date?: string;
  status?: string;
  status_display?: string;
}

interface UserRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  modalType: 'ip' | 'device' | null;
  rentals: RentalDetail[];
  loading: boolean;
}

export default function UserRentalModal({
  isOpen,
  onClose,
  selectedUser,
  modalType,
  rentals,
  loading
}: UserRentalModalProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-w-[95vw] max-h-[95vh]">
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6 p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <Heading level={3} className="text-2xl mb-2">
              {selectedUser?.username}의 {modalType === 'ip' ? 'IP' : '기기'} 대여 내역
            </Heading>
            <Text className="text-lg text-gray-600 dark:text-gray-400">
              총 {rentals.length}개의 {modalType === 'ip' ? 'IP' : '기기'} 대여 내역
            </Text>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Spinner size="lg" />
            </div>
          ) : rentals.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Text className="text-xl text-gray-500 dark:text-gray-400">
                대여 내역이 없습니다.
              </Text>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      {modalType === 'ip' ? (
                        <>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[150px]">장비명</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[180px]">MAC 주소</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[120px]">IP 주소</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[160px]">대여일</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[160px]">마지막 접속</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[100px]">상태</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[150px]">장비명</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[120px]">제조사</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[150px]">모델명</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[120px]">관리번호</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[120px]">일련번호</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[160px]">대여일</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[160px]">반납 예정일</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider min-w-[120px]">상태</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {rentals.map((rental) => (
                      <tr key={rental.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        {modalType === 'ip' ? (
                          <>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {rental.device_name || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {rental.mac_address || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {rental.assigned_ip || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(rental.created_at || '')}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(rental.last_access || '')}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                rental.is_active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {rental.is_active ? '활성' : '비활성'}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {rental.equipment_detail?.asset_number || rental.equipment_detail?.model_name || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {rental.equipment_detail?.manufacturer || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {rental.equipment_detail?.model_name || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {rental.equipment_detail?.management_number || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {rental.equipment_detail?.serial_number || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(rental.rental_date || '')}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(rental.due_date || '')}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  rental.status === 'RENTED'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : rental.status === 'RETURNED'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : rental.status === 'OVERDUE'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {rental.status_display || '-'}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {modalType === 'ip' ? 'IP' : '기기'} 대여 내역을 확인할 수 있습니다.
            </Text>
            <Button
              onClick={onClose}
              variant="secondary"
              size="sm"
            >
              닫기
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
} 