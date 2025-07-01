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
import { Card, Heading, Text } from '../ui/StyledComponents';

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
    { id: 'text', name: '텍스트 방송', icon: MessageSquare, description: '텍스트를 입력하여 음성으로 방송합니다' },
    { id: 'audio', name: '오디오 방송', icon: Volume2, description: '오디오 파일을 업로드하여 방송합니다' },
    { id: 'history', name: '방송 이력', icon: History, description: '내가 진행한 방송 기록을 확인합니다' },
    { id: 'microphone', name: '마이크 확인', icon: Mic, description: '마이크 상태를 확인하고 테스트합니다' },
  ];
  const adminTabs = [
    { id: 'text', name: '텍스트 방송', icon: MessageSquare, description: '텍스트를 입력하여 음성으로 방송합니다' },
    { id: 'audio', name: '오디오 방송', icon: Volume2, description: '오디오 파일을 업로드하여 방송합니다' },
    { id: 'history', name: '전체 방송 이력', icon: History, description: '전체 사용자의 방송 기록을 확인합니다' },
    { id: 'microphone', name: '마이크 테스트', icon: Mic, description: '마이크 상태를 확인하고 테스트합니다' },
  ];
  const tabs = isAdmin ? adminTabs : teacherTabs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* 프리뷰 생성 로딩 오버레이 */}
      {previewLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  프리뷰 생성중입니다
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  잠시만 기다려주세요...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 방송 시스템 상태 카드 */}
      {status && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <Heading level={3} className="mb-2 text-base sm:text-lg">방송 시스템 상태</Heading>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                <div className="flex items-center">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 ${status.system_healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <Text className="text-xs sm:text-sm">
                    {status.system_healthy ? '정상' : '오류'}
                  </Text>
                </div>
                <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  총 기기: {status.total_devices}개
                </Text>
                <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  최근 방송: {status.recent_broadcasts}회
                </Text>
                <Text className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  오디오 파일: {status.total_audio_files}개
                </Text>
              </div>
            </div>
            <Activity className="text-blue-500 flex-shrink-0" size={20} />
          </div>
        </Card>
      )}

      {/* 방송 기능 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Card 
              key={tab.id}
              variant="hover"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`text-center transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex flex-col items-center space-y-2 md:space-y-3">
                <div className={`p-2 md:p-3 rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-blue-100 dark:bg-blue-800' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Icon 
                    className={`w-6 h-6 md:w-8 md:h-8 ${
                      activeTab === tab.id 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} 
                  />
                </div>
                <div>
                  <Heading level={4} className="mb-1 text-sm md:text-base">{tab.name}</Heading>
                  <Text className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden md:block">
                    {tab.description}
                  </Text>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 선택된 탭 컨텐츠 */}
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
        <Card>
          <Heading level={3} className="mb-4">
            {isAdmin ? '전체 방송 이력' : '내 방송 이력'}
          </Heading>
          <BroadcastHistoryList 
            history={history} 
            onRefresh={fetchInitialData} 
            isAdmin={isAdmin}
            currentUser={user?.username}
          />
        </Card>
      )}
      {activeTab === 'microphone' && (
        <Card>
          <Heading level={3} className="mb-4">마이크 테스트</Heading>
          <MicrophoneTest />
        </Card>
      )}

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
    </div>
  );
} 