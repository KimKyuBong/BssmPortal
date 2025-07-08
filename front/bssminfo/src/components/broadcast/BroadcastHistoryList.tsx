'use client';

import React, { useState } from 'react';
import { BroadcastHistory } from '../../types/broadcast';
import { Clock, User, MapPin, Volume2, MessageSquare, CheckCircle, XCircle, AlertCircle, RotateCcw, Play, Mic, Trash2 } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { DateInput } from '@/components/ui/StyledComponents';
import { formatDateToKorean } from '@/utils/dateUtils';
import PreviewModal from './PreviewModal';
import { useToastContext } from '@/contexts/ToastContext';

interface BroadcastHistoryListProps {
  history: BroadcastHistory[];
  onRefresh: () => void;
  isAdmin?: boolean;
  currentUser?: string;
  onSwitchToAudioTab?: (audioFile: File) => void; // 오디오 탭으로 전환하는 콜백
  onReuseSwitchToAudioTab?: (audioFile: File) => void; // 재사용 시 오디오 탭으로 전환하는 콜백
  onPreviewCreated?: (previewInfo: any) => void; // 프리뷰 생성 콜백
}

// 간단한 모달 컴포넌트 추가
function SimpleModal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title?: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, minWidth: 320, maxWidth: 400, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.2)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        {title && <h2 style={{ marginBottom: 16, fontSize: 20 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default function BroadcastHistoryList({ 
  history, 
  onRefresh, 
  isAdmin = false, 
  currentUser,
  onSwitchToAudioTab,
  onReuseSwitchToAudioTab,
  onPreviewCreated
}: BroadcastHistoryListProps) {
  const { showSuccess, showError } = useToastContext();
  const [filter, setFilter] = useState<'all' | 'text' | 'audio'>('all');
  const [reusingHistory, setReusingHistory] = useState<number | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<BroadcastHistory | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    date: ''
  });

  // 디버깅: 컴포넌트 렌더링 시 데이터 확인
  console.log('BroadcastHistoryList 렌더링:', {
    historyCount: history.length,
    history: history,
    isAdmin,
    currentUser,
    hasOnSwitchToAudioTab: !!onSwitchToAudioTab
  });

  // 교사인 경우 자신의 방송 이력만 필터링
  const filteredHistory = isAdmin 
    ? history.filter(item => filter === 'all' || item.broadcast_type === filter)
    : history.filter(item => 
        item.broadcasted_by_username === currentUser && 
        (filter === 'all' || item.broadcast_type === filter)
      );

  console.log('필터링된 방송 이력:', {
    filter,
    filteredCount: filteredHistory.length,
    filteredHistory: filteredHistory
  });

  const handleHistoryClick = async (item: BroadcastHistory) => {
    console.log('방송 이력 클릭됨:', item);
    console.log('broadcast_type:', item.broadcast_type);
    console.log('audio_file:', item.audio_file);
    
    // 모든 방송 타입에 대해 오디오 재생 모달 열기 (텍스트 방송도 TTS로 오디오 생성됨)
    console.log('방송 이력 클릭 - 모달 열기');
    setSelectedHistory(item);
    setPreviewModalOpen(true);
    setLoadingAudio(true);
    
    try {
      // 방송 이력 상세 조회로 오디오 base64 가져오기
      const detail = await broadcastService.getHistoryDetail(item.id);
      console.log('방송 이력 상세 조회 결과:', detail);
      
      if (detail.success && detail.history.audio_base64) {
        const base64Data = detail.history.audio_base64;
        console.log('Base64 데이터 길이:', base64Data.length);
        
        // Base64 데이터 유효성 검증
        if (!base64Data || base64Data.length < 100) {
          console.error('Base64 데이터가 너무 짧습니다:', base64Data.length);
          alert('❌ 오디오 데이터가 손상되었습니다. 다시 시도해주세요.');
          setPreviewModalOpen(false);
          return;
        }
        
        try {
          // Base64를 Blob으로 변환 (여러 포맷 시도)
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // 여러 MIME 타입 시도
          const mimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
          let audioUrl = null;
          
          for (const mimeType of mimeTypes) {
            try {
              const blob = new Blob([bytes], { type: mimeType });
              const url = URL.createObjectURL(blob);
              
              // 오디오 파일 유효성 검증
              const testAudio = new Audio(url);
              await new Promise((resolve, reject) => {
                testAudio.onloadedmetadata = () => {
                  console.log(`✅ ${mimeType} 포맷으로 오디오 생성 성공, 길이:`, testAudio.duration);
                  resolve(url);
                };
                testAudio.onerror = reject;
                setTimeout(reject, 3000); // 3초 타임아웃
              });
              
              audioUrl = url;
              console.log(`최종 선택된 MIME 타입: ${mimeType}`);
              break;
            } catch (err) {
              console.log(`${mimeType} 시도 실패:`, err);
              continue;
            }
          }
          
          if (audioUrl) {
            setAudioUrl(audioUrl);
            console.log('✅ 오디오 URL 생성 완료:', audioUrl);
          } else {
            throw new Error('모든 오디오 포맷 시도 실패');
          }
          
        } catch (conversionError) {
          console.error('❌ Base64 변환 오류:', conversionError);
          alert('❌ 오디오 파일 변환에 실패했습니다. 브라우저 호환성 문제일 수 있습니다.');
          setPreviewModalOpen(false);
        }
      } else {
        console.log('❌ 오디오 base64 데이터 없음');
        alert('❌ 이 방송에는 오디오 데이터가 없습니다.');
        setPreviewModalOpen(false);
      }
    } catch (error) {
      console.error('❌ 오디오 로드 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert('❌ 오디오 파일을 불러오는 중 오류가 발생했습니다: ' + errorMessage);
      setPreviewModalOpen(false);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleReuseAudio = async (historyId: number) => {
    try {
      setReusingHistory(historyId);
      
      const response = await broadcastService.reuseHistoryAudio(historyId);
      
      if (response.success) {
        showSuccess('오디오 재사용 완료', '방송 이력에서 오디오 파일을 재사용하여 새로운 프리뷰가 생성되었습니다.');
        onRefresh(); // 프리뷰 목록 새로고침
      } else {
        showError('오디오 재사용 실패', '오디오 파일 재사용에 실패했습니다: ' + response.message);
      }
    } catch (error) {
      console.error('오디오 파일 재사용 오류:', error);
      showError('오디오 재사용 오류', '오디오 파일 재사용 중 오류가 발생했습니다.');
    } finally {
      setReusingHistory(null);
    }
  };

  const handleRebroadcast = async (item: BroadcastHistory) => {
    try {
      // 방송 이력 상세 조회로 오디오 base64 가져오기
      const detail = await broadcastService.getHistoryDetail(item.id);
      
      if (detail.success && detail.history.audio_base64) {
        const base64Data = detail.history.audio_base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const file = new File([blob], `reused_${item.id}.mp3`, { type: 'audio/mpeg' });
        
        // 재사용 시 오디오 탭으로 전환 (use_original 자동 활성화)
        if (onReuseSwitchToAudioTab) {
          onReuseSwitchToAudioTab(file);
        }
        
        setPreviewModalOpen(false);
      } else {
        showError('오디오 파일 오류', '오디오 파일을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('다시 방송하기 오류:', error);
      showError('오디오 파일 오류', '오디오 파일을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setSelectedHistory(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleDeleteHistory = async (historyId: number) => {
    try {
      setDeletingHistory(historyId);
      
      const response = await broadcastService.deleteHistory(historyId);
      
      if (response.success) {
        showSuccess('방송 이력 삭제 완료', '방송 이력이 성공적으로 삭제되었습니다.');
        onRefresh(); // 목록 새로고침
        setDeleteModalOpen(false);
      } else {
        showError('방송 이력 삭제 실패', '방송 이력 삭제에 실패했습니다: ' + response.message);
      }
    } catch (error) {
      console.error('방송 이력 삭제 오류:', error);
      showError('방송 이력 삭제 오류', '방송 이력 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingHistory(null);
    }
  };

  const openDeleteModal = (item: BroadcastHistory) => {
    setSelectedHistory(item);
    setDeleteModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBroadcastTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'audio':
        return <Volume2 className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDateToKorean(date);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            방송 이력
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            총 {history.length}개 ({filteredHistory.length}개 표시)
            {!isAdmin && currentUser && ` • 내 방송만 표시`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* 빠른 필터 버튼 */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('text')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                filter === 'text'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>텍스트</span>
            </button>
            <button
              onClick={() => setFilter('audio')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                filter === 'audio'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Volume2 className="h-3 w-3" />
              <span>오디오</span>
            </button>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            고급 필터
          </button>
        </div>
      </div>

      {/* 필터 섹션 */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                타입
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="text">텍스트</option>
                <option value="audio">오디오</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                상태
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="completed">완료</option>
                <option value="failed">실패</option>
              </select>
            </div>
            <div>
              <DateInput
                label="날짜 범위"
                value={filters.date}
                onChange={(value) => setFilters({ ...filters, date: value })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* 방송 이력 목록 */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">방송 이력이 없습니다</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all' ? '아직 진행된 방송이 없습니다.' : `${filter === 'text' ? '텍스트' : '오디오'} 방송 이력이 없습니다.`}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleHistoryClick(item)}
            >
              <div className="flex flex-col space-y-3">
                {/* 상단 행: 타입, 상태, 날짜 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    {getBroadcastTypeIcon(item.broadcast_type)}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.broadcast_type === 'text' ? '텍스트 방송' : '오디오 방송'}
                    </span>
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.created_at)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(item);
                      }}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      삭제
                    </button>
                  </div>
                </div>
                
                {/* 중간 행: 내용 */}
                <div className="flex-1">
                  <div 
                    className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-md p-3 border-l-4 border-blue-500"
                    title={item.content} // 전체 내용을 툴팁으로 표시
                  >
                    <div className="break-words whitespace-pre-wrap">
                      {item.content.length > 150 ? (
                        <>
                          <span>{item.content.substring(0, 150)}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">...더보기</span>
                        </>
                      ) : (
                        item.content
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 하단 행: 방송자 정보 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">방송자:</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.broadcasted_by_username || '알 수 없음'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : item.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {item.status_display}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {previewModalOpen && selectedHistory && (
        <SimpleModal open={previewModalOpen} onClose={closePreviewModal} title="오디오 방송 이력 프리뷰">
          <div className="space-y-4">
            {loadingAudio ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">오디오 로딩중...</span>
              </div>
            ) : audioUrl ? (
              <>
                {/* 방송 정보 표시 */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">방송 정보</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">타입:</span> {selectedHistory.broadcast_type === 'text' ? '텍스트 방송' : '오디오 방송'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">생성일:</span> {selectedHistory.created_at ? formatDateToKorean(selectedHistory.created_at) : '-'}
                    </p>
                    {selectedHistory.content && (
                      <p className="text-gray-700 dark:text-gray-300 mt-2">
                        <span className="font-medium">내용:</span> 
                        <span className="block mt-1 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-sm">
                          {selectedHistory.content.length > 100 
                            ? `${selectedHistory.content.substring(0, 100)}...` 
                            : selectedHistory.content
                          }
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 고급 오디오 플레이어 (PC 환경에서 더 나은 제어) */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    오디오 재생
                  </h4>
                  <audio 
                    controls 
                    src={audioUrl} 
                    className="w-full h-12 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    style={{
                      accentColor: '#3b82f6'
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    브라우저 기본 컨트롤을 사용하여 정밀한 재생 제어가 가능합니다.
                  </p>
                </div>

                {/* 다시 방송하기 버튼 */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => handleRebroadcast(selectedHistory)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    다시 방송하기
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <svg className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.94-6.02 2.47M3 3l18 18" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">오디오 파일이 없습니다.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">이 방송에는 재생 가능한 오디오가 없습니다.</p>
                </div>
              </div>
            )}
          </div>
        </SimpleModal>
      )}

      {deleteModalOpen && selectedHistory && (
        <SimpleModal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="방송 이력 삭제">
          <div style={{ textAlign: 'center', padding: 16 }}>
            <p style={{ marginBottom: 24, fontSize: 16 }}>
              정말로 이 방송 이력을 삭제하시겠습니까?
            </p>
            <p style={{ marginBottom: 24, fontSize: 14, color: '#666' }}>
              "{selectedHistory.content}"
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setDeleteModalOpen(false)}
                style={{ flex: 1, padding: '10px 0', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteHistory(selectedHistory.id)}
                disabled={deletingHistory === selectedHistory.id}
                style={{ 
                  flex: 1, 
                  padding: '10px 0', 
                  border: 'none', 
                  borderRadius: 4, 
                  background: '#DC2626', 
                  color: '#fff', 
                  cursor: deletingHistory === selectedHistory.id ? 'not-allowed' : 'pointer',
                  opacity: deletingHistory === selectedHistory.id ? 0.6 : 1
                }}
              >
                {deletingHistory === selectedHistory.id ? '삭제중...' : '삭제'}
              </button>
            </div>
          </div>
        </SimpleModal>
      )}
    </div>
  );
} 