import React, { useState } from 'react';
import { X, Download } from 'lucide-react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Download className="w-5 h-5 mr-2" />
              사용자 등록 템플릿 생성
            </h3>
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
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-4">
              템플릿에 포함할 사용자 수를 입력하세요. 각 사용자마다 8자리 임시 비밀번호가 자동으로 생성됩니다.
            </p>
            
            <div className="mt-2">
              <label htmlFor="userCount" className="block text-sm font-medium text-gray-700 text-left mb-1">
                사용자 수
              </label>
              <input
                type="number"
                id="userCount"
                min="1"
                max="100"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={templateUserCount}
                onChange={(e) => setTemplateUserCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
              />
              <p className="mt-1 text-xs text-gray-500 text-left">
                ※ 최소 1명, 최대 100명까지 생성 가능합니다.
              </p>
            </div>
          </div>
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? '처리중...' : '템플릿 다운로드'}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
              onClick={onClose}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 