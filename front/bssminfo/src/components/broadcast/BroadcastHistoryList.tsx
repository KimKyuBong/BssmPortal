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
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log('오디오 URL 생성 완료:', url);
      } else {
        console.log('오디오 base64 데이터 없음');
        alert('오디오 파일을 불러올 수 없습니다.');
        setPreviewModalOpen(false);
      }
    } catch (error) {
      console.error('오디오 로드 오류:', error);
      alert('오디오 파일을 불러오는 중 오류가 발생했습니다.');
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          방송 이력
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            필터
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
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleHistoryClick(item)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : item.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status_display}
                </span>
                {item.broadcast_type === 'audio' && (
                  null
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal(item);
                  }}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewModalOpen && selectedHistory && (
        <SimpleModal open={previewModalOpen} onClose={closePreviewModal} title="오디오 방송 이력 프리뷰">
          {loadingAudio ? (
            <div style={{ textAlign: 'center', padding: 24 }}>오디오 로딩중...</div>
          ) : audioUrl ? (
            <>
              <audio controls src={audioUrl} style={{ width: '100%' }} />
              <button
                style={{ marginTop: 16, width: '100%', background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}
                onClick={() => handleRebroadcast(selectedHistory)}
              >
                다시 방송하기
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>오디오 파일이 없습니다.</div>
          )}
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