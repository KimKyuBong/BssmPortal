'use client';

import React, { useState, useEffect } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { PreviewListItem } from '../../types/broadcast';
import { Eye, Play, Pause, Volume2, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { Card, Heading, Text, Button, Spinner } from '@/components/ui/StyledComponents';
import { useToastContext } from '@/contexts/ToastContext';

export default function PreviewList() {
  const [previews, setPreviews] = useState<PreviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { showError } = useToastContext();

  useEffect(() => {
    loadPreviews();
  }, []);

  const loadPreviews = async () => {
    try {
      setLoading(true);
      const response = await broadcastService.getPreviews();
      if (response.success) {
        setPreviews(response.previews);
      } else {
        setError('프리뷰 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('프리뷰 목록을 불러오는데 실패했습니다.');
      console.error('프리뷰 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = async (previewId: string) => {
    try {
      if (playingPreview === previewId) {
        // 현재 재생 중인 프리뷰를 정지
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setPlayingPreview(null);
        setAudioElement(null);
        return;
      }

      // 다른 프리뷰가 재생 중이면 정지
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // 새로운 프리뷰 재생
      const audioUrl = await broadcastService.getPreviewAudioUrl(previewId);
      
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingPreview(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
      setPlayingPreview(previewId);
      setAudioElement(audio);
    } catch (err) {
      console.error('프리뷰 재생 실패:', err);
      showError('프리뷰 재생 실패', '프리뷰 재생에 실패했습니다.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case '승인':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return '대기중';
      case '승인':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return '알 수 없음';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <Text className="text-red-800">{error}</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Heading level={3}>방송 프리뷰</Heading>
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadPreviews}
            size="sm"
          >
            새로고침
          </Button>
        </div>
      </div>

      {previews.length === 0 ? (
        <Card>
          <Text className="text-center py-8 text-gray-500 dark:text-gray-400">
            프리뷰가 없습니다.
          </Text>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {previews.map((preview) => (
              <li key={preview.preview_id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Text className="text-sm font-medium text-gray-900 dark:text-white">
                          {preview.job_type === 'text' ? '텍스트 방송' : '오디오 방송'}
                        </Text>
                        {getStatusIcon(preview.status)}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(preview.created_at)}
                        </div>
                        {preview.estimated_duration > 0 && (
                          <div className="flex items-center">
                            <Volume2 className="h-3 w-3 mr-1" />
                            {formatDuration(preview.estimated_duration)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      preview.status === 'ready' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : preview.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {getStatusText(preview.status)}
                    </span>
                    <Button
                      onClick={() => handlePlayPreview(preview.preview_id)}
                      variant="secondary"
                      size="sm"
                    >
                      {playingPreview === preview.preview_id ? (
                        <>
                          <Pause className="h-3 w-3 mr-1" />
                          정지
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          재생
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
} 