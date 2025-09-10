'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/StyledComponents';
import UserSearchSelect from '@/components/ui/UserSearchSelect';

interface User {
  id: number;
  user_name?: string;
  username: string;
  email?: string;
}

interface BatchStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: string, reason: string, userId?: number) => Promise<void>;
  selectedCount: number;
  users: User[];
  loading?: boolean;
}

export default function BatchStatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  users,
  loading = false
}: BatchStatusChangeModalProps) {
  console.log('[BatchStatusChangeModal] 렌더링:', { isOpen, selectedCount, usersCount: users.length });
  const [status, setStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setStatus('');
      setReason('');
      setUserId(null);
    }
  }, [isOpen]);

  // 사용자 선택 핸들러
  const handleUserSelect = (selectedUserId: number | null) => {
    setUserId(selectedUserId);
  };

  // 확인 버튼 클릭
  const handleConfirm = async () => {
    if (!status || selectedCount === 0) {
      return;
    }

    // 대여중 상태일 때 사용자 확인
    if (status === 'RENTED' && !userId) {
      return;
    }

    await onConfirm(status, reason, userId || undefined);
  };

  // 취소 버튼 클릭
  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="일괄 상태 변경"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            선택된 장비 수: {selectedCount}개
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            변경할 상태 <span className="text-red-500">*</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">상태를 선택하세요</option>
            <option value="AVAILABLE">사용 가능</option>
            <option value="RENTED">대여중</option>
            <option value="MAINTENANCE">유지보수</option>
            <option value="BROKEN">파손</option>
            <option value="LOST">분실</option>
            <option value="DISPOSED">폐기</option>
          </select>
        </div>
        
        {/* 대여중 상태일 때 사용자 선택 */}
        {status === 'RENTED' && (
          <UserSearchSelect
            users={users}
            selectedUserId={userId}
            onUserSelect={handleUserSelect}
            label="대여자 선택"
            placeholder="사용자 이름, 아이디, 이메일로 검색"
            required={true}
          />
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            변경 사유
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="상태 변경 사유를 입력하세요 (선택사항)"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          취소
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={loading || !status || selectedCount === 0 || (status === 'RENTED' && !userId)}
        >
          {loading ? '처리 중...' : '상태 변경'}
        </Button>
      </div>
    </Modal>
  );
}
