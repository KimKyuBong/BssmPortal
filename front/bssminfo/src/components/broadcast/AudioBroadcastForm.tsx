'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, Upload, FileAudio, Mic, Trash2 } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { AudioFile, PreviewInfo } from '../../types/broadcast';
import AudioRecordingModal from './AudioRecordingModal';
import CommonBroadcastForm from './CommonBroadcastForm';
import { Card, Heading, Text, Button } from '@/components/ui/StyledComponents';
import { formatDateToKorean } from '@/utils/dateUtils';

interface AudioBroadcastFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onPreviewCreated?: (previewInfo: PreviewInfo) => void;
  onPreviewStart?: () => void;
  onPreviewError?: () => void;
  audioFiles?: AudioFile[];
  selectedAudioFile?: File | null;
  onAudioFileSelected?: () => void;
  reusedAudioFile?: File | null;
  onReusedFileProcessed?: () => void;
}

export default function AudioBroadcastForm({ 
  onSuccess, 
  onError, 
  onPreviewCreated,
  onPreviewStart,
  onPreviewError,
  audioFiles = [],
  selectedAudioFile,
  onAudioFileSelected,
  reusedAudioFile,
  onReusedFileProcessed
}: AudioBroadcastFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(selectedAudioFile || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);

  // selectedAudioFile이 변경되면 selectedFile을 업데이트
  useEffect(() => {
    setSelectedFile(selectedAudioFile || null);
  }, [selectedAudioFile]);

  // reusedAudioFile이 전달되면 자동으로 선택하고 useOriginal 활성화
  useEffect(() => {
    if (reusedAudioFile) {
      setSelectedFile(reusedAudioFile);
      setUseOriginal(true); // 재사용 시 원본 오디오 사용
      console.log('재사용 오디오 파일이 AudioBroadcastForm에 설정됨:', reusedAudioFile);
      
      // 파일이 처리되었음을 알림
      if (onReusedFileProcessed) {
        onReusedFileProcessed();
      }
    }
  }, [reusedAudioFile, onReusedFileProcessed]);

  // 재사용 시 use_original 체크박스 자동 활성화
  useEffect(() => {
    const reuseFlag = sessionStorage.getItem('use_original_for_reuse');
    if (reuseFlag === 'true') {
      setUseOriginal(true);
      sessionStorage.removeItem('use_original_for_reuse'); // 플래그 제거
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('파일 크기가 너무 큽니다. 최대 50MB까지 허용됩니다.');
        return;
      }
      
      // 파일 타입 검증
      if (!file.type.startsWith('audio/')) {
        setError('오디오 파일만 업로드 가능합니다.');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // 파일 크기 검증 (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('파일 크기가 너무 큽니다. 최대 50MB까지 허용됩니다.');
        return;
      }
      
      // 파일 타입 검증
      if (!file.type.startsWith('audio/')) {
        setError('오디오 파일만 업로드 가능합니다.');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    const file = new File([audioBlob], 'recorded_audio.wav', { type: 'audio/wav' });
    setSelectedFile(file);
    setShowRecordingModal(false);
  };

  const handleSubmit = async (targetRooms: string[]) => {
    if (!selectedFile) {
      setError('오디오 파일을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 프리뷰 생성 시작 알림
      if (onPreviewStart) {
        onPreviewStart();
      }

      const response = await broadcastService.broadcastAudio({
        audio_file: selectedFile,
        target_rooms: targetRooms,
        use_original: useOriginal
      });

      if (response.success) {
        // 프리뷰가 생성된 경우 - 항상 프리뷰 승인 모달 띄우기
        if (response.preview_info) {
          if (onPreviewCreated) {
            onPreviewCreated(response.preview_info);
          }
        } else {
          alert('오디오 방송에 실패했습니다: 프리뷰 정보를 받지 못했습니다.');
        }
        
        // 폼 초기화
        setSelectedFile(null);
      } else {
        const errorMessage = response.message || '오디오 방송에 실패했습니다.';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        if (onPreviewError) {
          onPreviewError();
        }
      }
    } catch (err) {
      console.error('오디오 방송 오류:', err);
      const errorMessage = '오디오 방송 중 오류가 발생했습니다.';
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
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-100 dark:border-purple-800">
      <div className="flex items-center mb-8">
        <div className="bg-purple-500 p-3 rounded-xl mr-4">
          <Volume2 className="h-8 w-8 text-white" />
        </div>
        <div>
          <Heading level={2}>오디오 방송</Heading>
          <Text className="text-gray-600 dark:text-gray-400">오디오 파일을 업로드하여 방송합니다</Text>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <Text className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</Text>
        </div>
      )}

      <div className="space-y-6">
        {/* 파일 업로드와 녹음 영역을 좌우로 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 파일 업로드 영역 */}
          <div>
            <Text className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              오디오 파일 업로드 *
            </Text>
            
            {!selectedFile ? (
              <div
                className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl p-8 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors cursor-pointer bg-white dark:bg-gray-800 h-48 flex flex-col items-center justify-center"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('audio-file-input')?.click()}
              >
                <Upload className="mx-auto h-16 w-16 text-purple-400 dark:text-purple-500" />
                <div className="mt-4">
                  <Text className="text-lg font-medium text-gray-900 dark:text-white">
                    파일을 드래그하거나 클릭하여 업로드
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    MP3, WAV, M4A 등 오디오 파일 (최대 50MB)
                  </Text>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-48 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileAudio className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <Text className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            
            <input
              id="audio-file-input"
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 녹음 영역 */}
          <div>
            <Text className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              마이크로 녹음하기
            </Text>
            
            <div className="border-2 border-dashed border-green-300 dark:border-green-600 rounded-xl p-8 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer bg-white dark:bg-gray-800 h-48 flex flex-col items-center justify-center"
              onClick={() => setShowRecordingModal(true)}
            >
              <Mic className="mx-auto h-16 w-16 text-green-400 dark:text-green-500" />
              <div className="mt-4">
                <Text className="text-lg font-medium text-gray-900 dark:text-white">
                  마이크로 녹음하기
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  클릭하여 녹음을 시작하세요
                </Text>
              </div>
            </div>
          </div>
        </div>

        {/* 기존 오디오 파일 목록 */}
        {audioFiles.length > 0 && (
          <div>
            <Text className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              기존 오디오 파일
            </Text>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {audioFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    // 파일 다운로드 후 File 객체로 변환
                    fetch(file.file_url)
                      .then(response => response.blob())
                      .then(blob => {
                        const fileObj = new File([blob], file.original_filename, { type: 'audio/mpeg' });
                        setSelectedFile(fileObj);
                      })
                      .catch(err => {
                        console.error('파일 다운로드 오류:', err);
                        setError('파일을 불러오는데 실패했습니다.');
                      });
                  }}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  <FileAudio className="h-5 w-5 text-purple-500 mr-3" />
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium text-gray-900 dark:text-white truncate">{file.original_filename}</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {file.created_at ? formatDateToKorean(file.created_at) : '-'}
                    </Text>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 재사용 시 원본 오디오 사용 옵션 */}
        <div className="flex items-center">
          <input
            id="use-original"
            type="checkbox"
            checked={useOriginal}
            onChange={(e) => setUseOriginal(e.target.checked)}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          />
          <Text className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            원본 오디오 사용 (종소리 삽입, 볼륨 정규화 과정 건너뛰기)
          </Text>
        </div>
      </div>

      <CommonBroadcastForm
        onSubmit={handleSubmit}
        loading={loading}
        submitText="오디오 방송 시작"
      />

      {/* 녹음 모달 */}
      {showRecordingModal && (
        <AudioRecordingModal
          open={showRecordingModal}
          onClose={() => setShowRecordingModal(false)}
          onRecordingComplete={handleRecordingComplete}
        />
      )}
    </Card>
  );
} 