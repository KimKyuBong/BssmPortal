'use client';

import React, { useState, useEffect } from 'react';
import { broadcastService } from '../../services/broadcastService';
import { BroadcastStatus, BroadcastHistory, AudioFile, PreviewInfo } from '../../types/broadcast';
import TextBroadcastForm from './TextBroadcastForm';
import AudioBroadcastForm from './AudioBroadcastForm';
import BroadcastHistoryList from './BroadcastHistoryList';
import PreviewModal from './PreviewModal';
import { 
  Volume2, 
  MessageSquare, 
  History, 
  Music, 
  Activity,
  AlertCircle,
  CheckCircle,
  Mic
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import MicrophoneTest from './MicrophoneTest';

type TabType = 'text' | 'audio' | 'history' | 'microphone';

export default function BroadcastDashboard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BroadcastStatus | null>(null);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [isAdmin, setIsAdmin] = useState(user?.is_superuser === true);
  
  // 프리뷰 모달 상태
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    previewId: string | null;
    previewInfo: PreviewInfo | null;
  }>({
    isOpen: false,
    previewId: null,
    previewInfo: null
  });

  // 프리뷰 생성 로딩 상태
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes, filesRes] = await Promise.all([
        broadcastService.getStatus(),
        broadcastService.getHistory(20),
        broadcastService.getAudioFiles()
      ]);
      
      if (statusRes.success) setStatus(statusRes.status);
      if (historyRes.success) setHistory(historyRes.history);
      if (filesRes.success) setAudioFiles(filesRes.files);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('방송 대시보드 데이터 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastSuccess = () => {
    fetchInitialData();
  };

  // 프리뷰 생성 성공 시 모달 열기
  const handlePreviewCreated = (previewInfo: PreviewInfo) => {
    setPreviewLoading(false); // 로딩 상태 해제
    setPreviewModal({
      isOpen: true,
      previewId: previewInfo.preview_id,
      previewInfo: previewInfo
    });
  };

  // 프리뷰 생성 시작
  const handlePreviewStart = () => {
    setPreviewLoading(true);
  };

  // 프리뷰 생성 실패
  const handlePreviewError = () => {
    setPreviewLoading(false);
  };

  // 프리뷰 모달 닫기
  const handlePreviewModalClose = () => {
    setPreviewModal({
      isOpen: false,
      previewId: null,
      previewInfo: null
    });
    // 프리뷰 처리 완료 후 데이터 새로고침
    fetchInitialData();
  };

  // 교사용 탭 (관리자가 아닌 경우)
  const teacherTabs = [
    { id: 'text', name: '텍스트 방송', icon: MessageSquare },
    { id: 'audio', name: '오디오 방송', icon: Volume2 },
    { id: 'history', name: '내 방송 이력', icon: History },
    { id: 'microphone', name: '마이크 테스트', icon: Mic },
  ];
  const adminTabs = [
    { id: 'text', name: '텍스트 방송', icon: MessageSquare },
    { id: 'audio', name: '오디오 방송', icon: Volume2 },
    { id: 'history', name: '전체 방송 이력', icon: History },
    { id: 'microphone', name: '마이크 테스트', icon: Mic },
  ];
  const tabs = isAdmin ? adminTabs : teacherTabs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">방송 관리</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}
      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 border-b-2 font-medium text-sm flex items-center justify-center transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {/* 탭 컨텐츠 */}
      <div>
        {activeTab === 'text' && (
          <TextBroadcastForm 
            onSuccess={handleBroadcastSuccess}
            onPreviewCreated={handlePreviewCreated}
            onPreviewStart={handlePreviewStart}
            onPreviewError={handlePreviewError}
          />
        )}
        {activeTab === 'audio' && (
          <AudioBroadcastForm 
            onSuccess={handleBroadcastSuccess} 
            audioFiles={audioFiles}
            onPreviewCreated={handlePreviewCreated}
            onPreviewStart={handlePreviewStart}
            onPreviewError={handlePreviewError}
          />
        )}
        {activeTab === 'history' && (
          <BroadcastHistoryList 
            history={history} 
            onRefresh={fetchInitialData} 
            isAdmin={isAdmin}
            currentUser={user?.username}
          />
        )}
        {activeTab === 'microphone' && (
          <MicrophoneTest />
        )}
      </div>

      {/* 프리뷰 모달 */}
      {previewModal.isOpen && previewModal.previewId && (
        <PreviewModal
          previewId={previewModal.previewId}
          previewInfo={previewModal.previewInfo}
          isOpen={previewModal.isOpen}
          onClose={handlePreviewModalClose}
          onSuccess={handlePreviewModalClose}
        />
      )}

      {/* 프리뷰 생성 로딩 오버레이 */}
      {previewLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">프리뷰 제작중입니다</h3>
              <p className="text-gray-600">잠시만 기다려주세요...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 