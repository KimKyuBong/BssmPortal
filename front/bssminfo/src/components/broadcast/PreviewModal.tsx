'use client';

import React, { useState, useEffect, useRef } from 'react';
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { broadcastService } from '../../services/broadcastService';
import { PreviewDetailResponse, PreviewApprovalRequest, PreviewInfo } from '../../types/broadcast';
import { CheckCircle, XCircle, AlertCircle, Volume2, Clock, MapPin } from 'lucide-react';
import { useToastContext } from '@/contexts/ToastContext';
import Modal from '../ui/Modal';

interface PreviewModalProps {
  previewId: string;
  previewInfo?: PreviewInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PreviewModal({ previewId, previewInfo, isOpen, onClose, onSuccess }: PreviewModalProps) {
  const { showSuccess, showError } = useToastContext();
  const [previewDetail, setPreviewDetail] = useState<PreviewDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && previewId) {
      // 항상 PreviewDetailView API를 호출하여 audio_base64를 포함한 완전한 정보를 가져오기
      loadPreviewDetail();
    }
    
    // 컴포넌트 언마운트 시 Blob URL 정리
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [isOpen, previewId]);

  const loadPreviewDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await broadcastService.getPreviewDetail(previewId);
      if (response.success) {
        setPreviewDetail(response);
        // previewDetail 설정 후 오디오 URL 로드
        await loadAudioUrl(response);
      } else {
        setError('프리뷰 상세 정보를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('프리뷰 상세 정보를 불러오는데 실패했습니다.');
      console.error('프리뷰 상세 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAudioUrl = async (response: PreviewDetailResponse) => {
    try {
      setAudioLoading(true);
      
      // 디버깅 로그 추가
      console.log('previewDetail:', response);
      console.log('audio_base64 exists:', !!response.preview_info?.audio_base64);
      console.log('audio_base64 length:', response.preview_info?.audio_base64?.length);
      
      // 오직 audio_base64만 사용
      if (response.preview_info?.audio_base64) {
        const base64Data = response.preview_info.audio_base64;
        console.log('Processing base64 data, length:', base64Data.length);
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log('Audio URL created successfully');
      } else {
        console.log('No audio_base64 found in previewDetail, fetching from broadcast server...');
        // audio_base64가 없으면 방송서버에서 오디오를 가져오기
        try {
          const audioUrl = await broadcastService.getPreviewAudioUrl(previewId);
          setAudioUrl(audioUrl);
          console.log('Audio URL created successfully from broadcast server');
        } catch (audioError) {
          console.error('Failed to fetch audio from broadcast server:', audioError);
          setError('오디오 파일을 불러올 수 없습니다.');
        }
      }
    } catch (err) {
      console.error('오디오 URL 로드 실패:', err);
      setError('오디오 파일을 로드할 수 없습니다.');
    } finally {
      setAudioLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      const request: PreviewApprovalRequest = {
        action: 'approve'
      };
      
      const response = await broadcastService.approvePreview(previewId, request);
      
      if (response.success) {
        showSuccess('방송 승인 완료', '방송이 시작됩니다');
        onSuccess();
        onClose();
      } else {
        showError('프리뷰 승인 실패', '프리뷰 승인에 실패했습니다: ' + response.message);
      }
    } catch (err) {
      console.error('프리뷰 승인 실패:', err);
      showError('프리뷰 승인 오류', '프리뷰 승인에 실패했습니다.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setRejecting(true);
      const response = await broadcastService.rejectPreview(previewId);
      
      if (response.success) {
        showSuccess('프리뷰 거부 완료', '프리뷰가 거부되었습니다.');
        onSuccess();
        onClose();
      } else {
        showError('프리뷰 거부 실패', '프리뷰 거부에 실패했습니다: ' + response.message);
      }
    } catch (err) {
      console.error('프리뷰 거부 실패:', err);
      showError('프리뷰 거부 오류', '프리뷰 거부에 실패했습니다.');
    } finally {
      setRejecting(false);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="방송 프리뷰"
      size="2xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      ) : previewDetail ? (
        <div className="space-y-6">
          {/* 프리뷰 정보 카드 */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {previewDetail.preview_info.job_type === 'text' ? '텍스트 방송' : '오디오 방송'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">프리뷰 ID: {previewDetail.preview_info.preview_id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center bg-white dark:bg-gray-700 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">
                  {formatDate(previewDetail.preview_info.created_at)}
                </span>
              </div>
              {previewDetail.preview_info.estimated_duration > 0 && (
                <div className="flex items-center bg-white dark:bg-gray-700 p-2 rounded-lg">
                  <Volume2 className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatDuration(previewDetail.preview_info.estimated_duration)}
                  </span>
                </div>
              )}
              {previewDetail.preview_info.params.target_rooms && 
               Array.isArray(previewDetail.preview_info.params.target_rooms) && 
               previewDetail.preview_info.params.target_rooms.length > 0 && (
                <div className="flex items-center bg-white dark:bg-gray-700 p-2 rounded-lg col-span-2">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-700 dark:text-gray-300">
                    대상 교실: {previewDetail.preview_info.params.target_rooms.join(', ')}호
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* React H5 Audio Player */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="text-center mb-6">
              <button
                onClick={() => {
                  if (playerRef.current) {
                    const audio = playerRef.current.audio.current;
                    if (audio.paused) {
                      audio.play();
                      setIsPlaying(true);
                    } else {
                      audio.pause();
                      setIsPlaying(false);
                    }
                  }
                }}
                className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
              >
                {isPlaying ? (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">프리뷰 확인</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                방송 내용을 미리 들어보고 승인 또는 거부를 결정하세요
              </p>
            </div>

            {audioLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">오디오 로딩중...</span>
              </div>
            ) : audioUrl ? (
              <div className="custom-audio-player">
                <AudioPlayer
                  ref={playerRef}
                  src={audioUrl}
                  autoPlay={false}
                  showJumpControls={false}
                  showFilledProgress={true}
                  showFilledVolume={true}
                  layout="horizontal"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{
                    borderRadius: '12px',
                    backgroundColor: 'transparent'
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                오디오 파일을 불러올 수 없습니다.
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="flex items-center px-6 py-3 border-2 border-red-500 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {rejecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                  처리중...
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 mr-2" />
                  거부
                </>
              )}
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {approving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  승인
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .custom-audio-player .rhap_container {
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 12px !important;
        }
        
        .custom-audio-player .rhap_progress-bar {
          background-color: #e5e7eb !important;
          border-radius: 6px !important;
        }
        
        .custom-audio-player .rhap_progress-filled {
          background: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
          border-radius: 6px !important;
        }
        
        .custom-audio-player .rhap_progress-indicator {
          background: #3b82f6 !important;
          border: 2px solid #ffffff !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        
        .custom-audio-player .rhap_volume-bar {
          background-color: #e5e7eb !important;
          border-radius: 4px !important;
        }
        
        .custom-audio-player .rhap_volume-filled {
          background: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
          border-radius: 4px !important;
        }
        
        .custom-audio-player .rhap_volume-indicator {
          background: #3b82f6 !important;
          border: 2px solid #ffffff !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        
        .custom-audio-player .rhap_button-clear {
          color: #3b82f6 !important;
          font-size: 18px !important;
          width: 36px !important;
          height: 36px !important;
          border-radius: 50% !important;
          background: #f3f4f6 !important;
          color: #6b7280 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease-in-out !important;
          border: 1px solid #e5e7eb !important;
        }
        
        .custom-audio-player .rhap_button-clear:hover {
          background: #e5e7eb !important;
          color: #374151 !important;
          transform: scale(1.05) !important;
        }
        
        .custom-audio-player .rhap_main-controls {
          display: none !important;
        }
        
        .custom-audio-player .rhap_time {
          color: #6b7280 !important;
          font-size: 14px !important;
        }
        
        .custom-audio-player .rhap_additional-controls {
          display: none !important;
        }
        
        .custom-audio-player .rhap_volume-controls {
          justify-content: center !important;
        }

        /* 다크모드 스타일 */
        .dark .custom-audio-player .rhap_progress-bar {
          background-color: #374151 !important;
        }
        
        .dark .custom-audio-player .rhap_volume-bar {
          background-color: #374151 !important;
        }
        
        .dark .custom-audio-player .rhap_button-clear {
          background: #4b5563 !important;
          color: #9ca3af !important;
          border: 1px solid #6b7280 !important;
        }
        
        .dark .custom-audio-player .rhap_button-clear:hover {
          background: #6b7280 !important;
          color: #d1d5db !important;
        }
        
        .dark .custom-audio-player .rhap_progress-indicator {
          border: 2px solid #1f2937 !important;
        }
        
        .dark .custom-audio-player .rhap_volume-indicator {
          border: 2px solid #1f2937 !important;
        }
      `}</style>
    </Modal>
  );
} 