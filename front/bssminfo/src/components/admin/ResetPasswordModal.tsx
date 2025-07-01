import React, { useState } from 'react';
import { Modal, Heading, Text, Input, Button } from '@/components/ui/StyledComponents';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
  username: string;
}

export default function ResetPasswordModal({ isOpen, onClose, onSubmit, username }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(password);
      setPassword('');
      onClose();
    } catch (error) {
      console.error('비밀번호 초기화 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let newPassword = '';
    for (let i = 0; i < length; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(newPassword);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Heading level={3} className="mb-4">
        {username}의 비밀번호 초기화
      </Heading>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Text className="block text-sm font-medium text-gray-700 mb-1">
            새 비밀번호
          </Text>
          <div className="flex space-x-2">
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요"
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={generateRandomPassword}
              size="sm"
            >
              랜덤 생성
            </Button>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            size="sm"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? '처리 중...' : '확인'}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 