'use client';

import React, { useState } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { PreviewInfo } from '../../types/broadcast';
import { MessageSquare } from 'lucide-react';
import CommonBroadcastForm from './CommonBroadcastForm';

interface TextBroadcastFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onPreviewCreated?: (previewInfo: PreviewInfo) => void;
  onPreviewStart?: () => void;
  onPreviewError?: () => void;
}

export default function TextBroadcastForm({ onSuccess, onError, onPreviewCreated, onPreviewStart, onPreviewError }: TextBroadcastFormProps) {
  const [formData, setFormData] = useState({
    text: '',
    language: 'ko'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (targetRooms: string[]) => {
    if (!formData.text.trim()) {
      setError('방송할 텍스트를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 프리뷰 생성 시작 알림
      if (onPreviewStart) {
        onPreviewStart();
      }

      const response = await broadcastService.broadcastText({
        text: formData.text,
        target_rooms: targetRooms,
        language: formData.language
      });

      if (response.success) {
        // 프리뷰가 생성된 경우
        if (response.status === 'preview_ready' && response.preview_info) {
          if (onPreviewCreated) {
            onPreviewCreated(response.preview_info);
          }
        } else {
          // 바로 방송된 경우
          if (onSuccess) {
            onSuccess();
          }
          alert('텍스트 방송이 성공적으로 전송되었습니다.');
        }
        
        // 폼 초기화
        setFormData({
          text: '',
          language: 'ko'
        });
      } else {
        const errorMessage = response.message || '텍스트 방송에 실패했습니다.';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        if (onPreviewError) {
          onPreviewError();
        }
      }
    } catch (err) {
      console.error('텍스트 방송 오류:', err);
      const errorMessage = '텍스트 방송 중 오류가 발생했습니다.';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      if (onPreviewError) {
        onPreviewError();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-lg border border-blue-100">
      <div className="flex items-center mb-8">
        <div className="bg-blue-500 p-3 rounded-xl mr-4">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">텍스트 방송</h2>
          <p className="text-gray-600">전교 방송으로 텍스트를 전송합니다</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            방송할 텍스트 *
          </label>
          <textarea
            name="text"
            value={formData.text}
            onChange={handleInputChange}
            rows={5}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
            placeholder="방송할 텍스트를 입력하세요..."
            required
          />
          <div className="mt-2 text-xs text-gray-500">
            {formData.text.length}/500자
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            언어 선택
          </label>
          <select
            name="language"
            value={formData.language}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            <option value="ko">🇰🇷 한국어</option>
            <option value="en">🇺🇸 English</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
        </div>
      </div>

      <CommonBroadcastForm
        onSubmit={handleSubmit}
        loading={loading}
        submitText="텍스트 방송 시작"
      />
    </div>
  );
} 