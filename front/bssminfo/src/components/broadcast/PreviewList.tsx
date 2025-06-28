'use client';

import React, { useState, useEffect } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { PreviewListItem } from '../../types/broadcast';
import { Eye, Play, Pause, Volume2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PreviewList() {
  const [previews, setPreviews] = useState<PreviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

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
      alert('프리뷰 재생에 실패했습니다.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'approved':
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
      case 'approved':
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">방송 프리뷰</h3>
        <button
          onClick={loadPreviews}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          새로고침
        </button>
      </div>

      {previews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          프리뷰가 없습니다.
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {previews.map((preview) => (
              <li key={preview.preview_id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {preview.job_type === 'text' ? '텍스트 방송' : '오디오 방송'}
                        </p>
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
                    <button
                      onClick={() => handlePlayPreview(preview.preview_id)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 