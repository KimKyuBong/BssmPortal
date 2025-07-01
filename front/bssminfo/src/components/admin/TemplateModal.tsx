import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import { Modal, Heading, Text, Input, Button } from '@/components/ui/StyledComponents';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (count: number) => Promise<void>;
}

export default function TemplateModal({ isOpen, onClose, onDownload }: TemplateModalProps) {
  const [templateUserCount, setTemplateUserCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      await onDownload(templateUserCount);
      onClose();
    } catch (err) {
      setError('템플릿 생성 중 오류가 발생했습니다.');
      console.error('Template download error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex justify-between items-center mb-4">
        <Heading level={3} className="flex items-center">
          <Download className="w-5 h-5 mr-2" />
          사용자 등록 템플릿 생성
        </Heading>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <Text className="text-sm text-gray-500 mb-4">
          템플릿에 포함할 사용자 수를 입력하세요. 각 사용자마다 8자리 임시 비밀번호가 자동으로 생성됩니다.
        </Text>
        
        <div className="mt-2">
          <Input
            label="사용자 수"
            type="number"
            id="userCount"
            min="1"
            max="100"
            value={templateUserCount}
            onChange={(e) => setTemplateUserCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
          />
          <Text className="mt-1 text-xs text-gray-500 text-left">
            ※ 최소 1명, 최대 100명까지 생성 가능합니다.
          </Text>
        </div>
      </div>
      
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <Button
          type="button"
          className="w-full sm:col-start-2"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? '처리중...' : '템플릿 다운로드'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full sm:mt-0 sm:col-start-1"
          onClick={onClose}
        >
          취소
        </Button>
      </div>
    </Modal>
  );
} 