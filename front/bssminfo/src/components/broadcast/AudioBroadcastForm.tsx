'use client';

import React, { useState, useCallback } from 'react';
import { Volume2, Upload, FileAudio, Mic, Trash2 } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { AudioFile, PreviewInfo } from '../../types/broadcast';
import AudioRecordingModal from './AudioRecordingModal';
import CommonBroadcastForm from './CommonBroadcastForm';

interface AudioBroadcastFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onPreviewCreated?: (previewInfo: PreviewInfo) => void;
  onPreviewStart?: () => void;
  onPreviewError?: () => void;
  audioFiles?: AudioFile[];
}

export default function AudioBroadcastForm({ 
  onSuccess, 
  onError, 
  onPreviewCreated,
  onPreviewStart,
  onPreviewError,
  audioFiles = []
}: AudioBroadcastFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);

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
        target_rooms: targetRooms
      });

      if (response.success) {
        // 프리뷰가 생성된 경우
        if (response.status === 'preview_ready' && response.preview_info) {
          if (onPreviewCreated) {
            onPreviewCreated(response.preview_info);
          }
        } else {
          // 바로 방송된 경우
          if (onSuccess) {
            onSuccess();
          }
          alert('오디오 방송이 성공적으로 전송되었습니다.');
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
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl shadow-lg border border-purple-100">
      <div className="flex items-center mb-8">
        <div className="bg-purple-500 p-3 rounded-xl mr-4">
          <Volume2 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">오디오 방송</h2>
          <p className="text-gray-600">오디오 파일을 업로드하여 방송합니다</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* 파일 업로드 영역 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            오디오 파일 *
          </label>
          
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-white"
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('audio-file-input')?.click()}
            >
              <Upload className="mx-auto h-16 w-16 text-purple-400" />
              <div className="mt-4">
                <p className="text-lg font-medium text-gray-700">
                  파일을 드래그하여 업로드하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  MP3, WAV, M4A 등 오디오 파일 (최대 50MB)
                </p>
              </div>
              <input
                id="audio-file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border-2 border-purple-200 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileAudio className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 녹음 버튼 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            마이크 녹음
          </label>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowRecordingModal(true)}
              className="w-full h-32 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-400 transition-colors bg-white flex flex-col items-center justify-center"
            >
              <Mic className="h-12 w-12 text-purple-400 mb-2" />
              <span className="text-lg font-medium text-gray-700">마이크로 녹음</span>
              <span className="text-sm text-gray-500 mt-1">클릭하여 녹음 시작</span>
            </button>
          </div>
        </div>

        {/* 기존 오디오 파일 목록 */}
        {audioFiles.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              기존 오디오 파일
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
              {audioFiles.slice(0, 6).map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    // 기존 파일을 선택하는 로직 (필요시 구현)
                    alert('기존 파일 선택 기능은 아직 구현되지 않았습니다.');
                  }}
                  className="flex items-center p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-left transition-all duration-200"
                >
                  <FileAudio className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.original_filename}</p>
                    <p className="text-xs text-gray-500">{file.file_size_mb.toFixed(2)} MB</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
    </div>
  );
} 