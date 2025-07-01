"use client";

import React, { useEffect, useState } from "react";
import { broadcastService } from "@/services/broadcastService";
import { BroadcastHistory, PreviewListItem } from "@/types/broadcast";
import { 
  Volume2, 
  MessageSquare, 
  History, 
  Eye, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Activity
} from "lucide-react";

export default function BroadcastManagementPage() {
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [previews, setPreviews] = useState<PreviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'previews'>('history');

  useEffect(() => {
    fetchData();
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyRes, previewRes] = await Promise.all([
        broadcastService.getAdminHistory(100),
        broadcastService.getAdminPreviews()
      ]);
      if (historyRes.success) setHistory(historyRes.history);
      if (previewRes.success) setPreviews(previewRes.previews);
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = async (previewId: string) => {
    if (playingPreviewId === previewId) {
      setPlayingPreviewId(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      return;
    }
    try {
      setPlayingPreviewId(previewId);
      setAudioUrl(null);
      const detail = await broadcastService.getPreviewDetail(previewId);
      if (detail.success && detail.preview_info.audio_base64) {
        const base64Data = detail.preview_info.audio_base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        alert('오디오 파일이 없습니다.');
        setPlayingPreviewId(null);
      }
    } catch (e) {
      alert('프리뷰 오디오를 불러오지 못했습니다.');
      setPlayingPreviewId(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="broadcast-status broadcast-status-completed">완료</span>;
      case 'failed':
        return <span className="broadcast-status broadcast-status-failed">실패</span>;
      case 'pending':
        return <span className="broadcast-status broadcast-status-pending">대기중</span>;
      default:
        return <span className="broadcast-status bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  const getBroadcastTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="broadcast-icon-small text-blue-500" />;
      case 'audio':
        return <Volume2 className="broadcast-icon-small text-purple-500" />;
      default:
        return <MessageSquare className="broadcast-icon-small text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* 헤더 섹션 */}
        <div className="page-header">
          <div className="page-header-flex">
            <div>
              <h1 className="page-title">방송 관리 시스템</h1>
              <p className="page-subtitle">전체 방송 이력 및 프리뷰 관리</p>
            </div>
            
            {/* 통계 정보 */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <History className="icon text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">총 방송</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{history.length}회</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="icon text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">프리뷰</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{previews.length}개</p>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="btn btn-secondary flex items-center"
              >
                <RefreshCw className="icon-small mr-2" />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <div className="error-content">
              <AlertCircle className="icon text-red-500 mr-3" />
              <span className="error-text">{error}</span>
            </div>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="card p-0 mb-8">
          <nav className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`tab flex-1 py-3 px-4 flex items-center justify-center ${
                activeTab === 'history' ? 'tab-active' : 'tab-inactive'
              }`}
            >
              <History className="icon-small mr-2" />
              <span className="font-medium">방송 이력</span>
            </button>
            <button
              onClick={() => setActiveTab('previews')}
              className={`tab flex-1 py-3 px-4 flex items-center justify-center ${
                activeTab === 'previews' ? 'tab-active' : 'tab-inactive'
              }`}
            >
              <Eye className="icon-small mr-2" />
              <span className="font-medium">프리뷰</span>
            </button>
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="broadcast-card">
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center mb-6">
                <History className="broadcast-icon-large text-blue-500 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">전체 방송 이력</h2>
                  <p className="text-gray-600 dark:text-gray-400">모든 사용자의 방송 이력을 확인합니다</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">타입</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">내용</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">방송자</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">상태</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">생성일</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">오디오</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getBroadcastTypeIcon(item.broadcast_type)}
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                              {item.broadcast_type_display}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900 dark:text-white max-w-xs truncate">{item.content}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <User className="broadcast-icon-small text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.broadcasted_by_username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Clock className="broadcast-icon-small text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(item.created_at)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {item.audio_file?.download_url ? (
                            <audio controls className="h-8" src={item.audio_file.download_url} />
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'previews' && (
            <div>
              <div className="flex items-center mb-6">
                <Eye className="broadcast-icon-large text-purple-500 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">프리뷰 관리</h2>
                  <p className="text-gray-600 dark:text-gray-400">생성된 모든 프리뷰를 확인하고 관리합니다</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">프리뷰ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">타입</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">상태</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">생성일</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">예상길이</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">오디오</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((item) => (
                      <tr key={item.preview_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono text-gray-900 dark:text-white">{item.preview_id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getBroadcastTypeIcon(item.job_type)}
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                              {item.job_type === 'text' ? '텍스트' : '오디오'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Clock className="broadcast-icon-small text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(item.created_at)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.estimated_duration}s</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePlayPreview(item.preview_id)}
                              className={`broadcast-button ${
                                playingPreviewId === item.preview_id 
                                  ? 'broadcast-button-primary' 
                                  : 'broadcast-button-secondary'
                              } flex items-center`}
                            >
                              {playingPreviewId === item.preview_id ? (
                                <>
                                  <Pause className="broadcast-icon-small mr-1" />
                                  정지
                                </>
                              ) : (
                                <>
                                  <Play className="broadcast-icon-small mr-1" />
                                  재생
                                </>
                              )}
                            </button>
                            {playingPreviewId === item.preview_id && audioUrl && (
                              <audio 
                                controls 
                                autoPlay 
                                className="h-8" 
                                src={audioUrl} 
                                onEnded={() => setPlayingPreviewId(null)} 
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 