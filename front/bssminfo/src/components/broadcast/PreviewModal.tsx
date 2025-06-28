'use client';

import React, { useState, useEffect, useRef } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { PreviewDetailResponse, PreviewApprovalRequest, PreviewInfo } from '../../types/broadcast';
import { X, Play, Pause, CheckCircle, XCircle, AlertCircle, Volume2, Clock, MapPin } from 'lucide-react';

interface PreviewModalProps {
  previewId: string;
  previewInfo?: PreviewInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PreviewModal({ previewId, previewInfo, isOpen, onClose, onSuccess }: PreviewModalProps) {
  const [previewDetail, setPreviewDetail] = useState<PreviewDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen && previewId) {
      // previewInfo가 있으면 그것을 사용, 없으면 API 호출
      if (previewInfo) {
        setPreviewDetail({
          success: true,
          preview_info: {
            ...previewInfo,
            job_type: previewInfo.job_type as 'audio' | 'text',
            params: {
              target_rooms: [], // 기본값 설정
              language: 'ko'
            }
          },
          timestamp: new Date().toISOString()
        });
        loadAudioUrlFromPreviewInfo(previewInfo);
      } else {
        loadPreviewDetail();
        loadAudioUrl();
      }
    }
    
    // 컴포넌트 언마운트 시 Blob URL 정리
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [isOpen, previewId, previewInfo]);

  const loadPreviewDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await broadcastService.getPreviewDetail(previewId);
      if (response.success) {
        setPreviewDetail(response);
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

  const loadAudioUrl = async () => {
    try {
      setAudioLoading(true);
      
      // 디버깅 로그 추가
      console.log('previewDetail:', previewDetail);
      console.log('audio_base64 exists:', !!previewDetail?.preview_info?.audio_base64);
      console.log('audio_base64 length:', previewDetail?.preview_info?.audio_base64?.length);
      
      // 오직 audio_base64만 사용
      if (previewDetail?.preview_info?.audio_base64) {
        const base64Data = previewDetail.preview_info.audio_base64;
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
        console.log('No audio_base64 found in previewDetail');
        setError('오디오 파일이 없습니다.');
      }
    } catch (err) {
      console.error('오디오 URL 로드 실패:', err);
      setError('오디오 파일을 로드할 수 없습니다.');
    } finally {
      setAudioLoading(false);
    }
  };

  const loadAudioUrlFromPreviewInfo = async (info: PreviewInfo) => {
    try {
      setAudioLoading(true);
      
      console.log('Using previewInfo for audio:', info);
      console.log('audio_base64 exists:', !!info.audio_base64);
      console.log('audio_base64 length:', info.audio_base64?.length);
      
      if (info.audio_base64) {
        const base64Data = info.audio_base64;
        console.log('Processing base64 data from previewInfo, length:', base64Data.length);
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log('Audio URL created successfully from previewInfo');
      } else {
        console.log('No audio_base64 found in previewInfo');
        setError('오디오 파일이 없습니다.');
      }
    } catch (err) {
      console.error('오디오 URL 로드 실패 (previewInfo):', err);
      setError('오디오 파일을 로드할 수 없습니다.');
    } finally {
      setAudioLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      const request: PreviewApprovalRequest = {
        action: 'approve'
      };
      
      const response = await broadcastService.approvePreview(previewId, request);
      
      if (response.success) {
        // 토스트 메시지로 변경
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
        toast.textContent = '방송이 시작됩니다';
        document.body.appendChild(toast);
        
        // 애니메이션 효과
        setTimeout(() => {
          toast.classList.remove('translate-x-full');
        }, 100);
        
        // 3초 후 제거
        setTimeout(() => {
          toast.classList.add('translate-x-full');
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
        
        onSuccess();
        onClose();
      } else {
        alert('프리뷰 승인에 실패했습니다: ' + response.message);
      }
    } catch (err) {
      console.error('프리뷰 승인 실패:', err);
      alert('프리뷰 승인에 실패했습니다.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setRejecting(true);
      const response = await broadcastService.rejectPreview(previewId);
      
      if (response.success) {
        alert('프리뷰가 거부되었습니다.');
        onSuccess();
        onClose();
      } else {
        alert('프리뷰 거부에 실패했습니다: ' + response.message);
      }
    } catch (err) {
      console.error('프리뷰 거부 실패:', err);
      alert('프리뷰 거부에 실패했습니다.');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">방송 프리뷰</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          ) : previewDetail ? (
            <div className="space-y-6">
              {/* 프리뷰 정보 카드 */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Volume2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {previewDetail.preview_info.job_type === 'text' ? '텍스트 방송' : '오디오 방송'}
                    </h3>
                    <p className="text-sm text-gray-600">프리뷰 ID: {previewDetail.preview_info.preview_id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center bg-white p-2 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">
                      {formatDate(previewDetail.preview_info.created_at)}
                    </span>
                  </div>
                  {previewDetail.preview_info.estimated_duration > 0 && (
                    <div className="flex items-center bg-white p-2 rounded-lg">
                      <Volume2 className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-700">
                        {formatDuration(previewDetail.preview_info.estimated_duration)}
                      </span>
                    </div>
                  )}
                  {previewDetail.preview_info.params.target_rooms.length > 0 && (
                    <div className="flex items-center bg-white p-2 rounded-lg col-span-2">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-700">
                        대상 교실: {previewDetail.preview_info.params.target_rooms.join(', ')}호
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 오디오 플레이어 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Volume2 className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">프리뷰 확인</h4>
                  <p className="text-sm text-gray-600">
                    방송 내용을 미리 들어보고 승인 또는 거부를 결정하세요
                  </p>
                </div>

                {/* 숨겨진 오디오 엘리먼트 */}
                <audio
                  ref={audioRef}
                  src={audioUrl || undefined}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                  preload="metadata"
                />

                {/* 커스텀 플레이어 컨트롤 */}
                <div className="space-y-4">
                  {/* 재생/일시정지 버튼 */}
                  <div className="flex justify-center">
                    <button
                      onClick={handlePlayPause}
                      disabled={!audioUrl || audioLoading}
                      className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {audioLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          로딩중...
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="h-5 w-5 mr-2" />
                          일시정지
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          재생
                        </>
                      )}
                    </button>
                  </div>

                  {/* 진행률 바 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="flex items-center px-6 py-3 border-2 border-red-500 text-red-500 rounded-xl hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
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
        </div>

        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .slider::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
    </div>
  );
} 