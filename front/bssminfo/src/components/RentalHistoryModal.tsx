import React from 'react';
import { X } from 'lucide-react';
import { Modal, Heading, Text, Spinner } from '@/components/ui/StyledComponents';

interface User {
  id: number;
  username: string;
}

interface EquipmentDetail {
  id: number;
  name: string;
  manufacturer: string;
  model_name: string;
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
  status_display?: string;
}

interface RentalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  modalType: 'ip' | 'device' | null;
  rentals: RentalDetail[];
  loading: boolean;
}

export default function RentalHistoryModal({
  isOpen,
  onClose,
  selectedUser,
  modalType,
  rentals,
  loading
}: RentalHistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex justify-between items-center mb-4">
        <Heading level={3}>
          {selectedUser?.username}의 {modalType === 'ip' ? 'IP' : '기기'} 대여 내역
        </Heading>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-3">
          <Spinner size="lg" />
        </div>
      ) : rentals.length === 0 ? (
        <Text className="text-center p-4">
          대여 내역이 없습니다.
        </Text>
      ) : (
        <div className="overflow-x-auto max-w-full">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {modalType === 'ip' ? (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">장비명</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MAC 주소</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP 주소</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">대여일</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">마지막 접속</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">상태</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">장비명</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">제조사</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">모델명</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">대여일</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">반납 예정일</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">상태</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {rentals.map((rental) => (
                <tr key={rental.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {modalType === 'ip' ? (
                    <>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.device_name}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.mac_address}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.assigned_ip}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(rental.created_at || '').toLocaleString()}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(rental.last_access || '').toLocaleString()}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.is_active ? '활성' : '비활성'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.equipment_detail?.name}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.equipment_detail?.manufacturer}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.equipment_detail?.model_name}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(rental.rental_date || '').toLocaleString()}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(rental.due_date || '').toLocaleString()}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{rental.status_display}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
} 