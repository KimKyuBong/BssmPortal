'use client';

import React, { useState } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { PreviewInfo } from '../../types/broadcast';
import { MessageSquare } from 'lucide-react';
import CommonBroadcastForm from './CommonBroadcastForm';
import { Card, Heading, Text, Textarea, Select } from '@/components/ui/StyledComponents';

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
        // 프리뷰가 생성된 경우 - 항상 프리뷰 승인 모달 띄우기
        if (response.preview_info) {
          if (onPreviewCreated) {
            onPreviewCreated(response.preview_info);
          }
        } else {
          alert('텍스트 방송에 실패했습니다: 프리뷰 정보를 받지 못했습니다.');
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
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
      <div className="flex items-center mb-8">
        <div className="bg-blue-500 p-3 rounded-xl mr-4">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <div>
          <Heading level={2}>텍스트 방송</Heading>
          <Text className="text-gray-600 dark:text-gray-400">전교 방송으로 텍스트를 전송합니다</Text>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <Text className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</Text>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <Text className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            방송할 텍스트 *
          </Text>
          <Textarea
            name="text"
            value={formData.text}
            onChange={handleInputChange}
            rows={5}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
            placeholder="방송할 텍스트를 입력하세요..."
            required
          />
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {formData.text.length}/500자
          </Text>
        </div>

        <div>
          <Text className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            언어 선택
          </Text>
          <Select
            name="language"
            value={formData.language}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            options={[
              { value: 'ko', label: '🇰🇷 한국어' },
              { value: 'en', label: '🇺🇸 English' },
              { value: 'ja', label: '🇯🇵 日本語' },
              { value: 'zh', label: '🇨🇳 中文' }
            ]}
          />
        </div>
      </div>

      <CommonBroadcastForm
        onSubmit={handleSubmit}
        loading={loading}
        submitText="텍스트 방송 시작"
      />
    </Card>
  );
} 