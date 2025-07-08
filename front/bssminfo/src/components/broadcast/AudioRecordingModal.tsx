import React, { useState, useRef, useCallback } from 'react';
import { X, Mic, Square, Play, Pause, RotateCcw, Check, Volume2 } from 'lucide-react';
import Modal from '../ui/Modal';

interface AudioRecordingModalProps {
  open: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob) => void;
}

export default function AudioRecordingModal({ 
  open, 
  onClose, 
  onRecordingComplete 
}: AudioRecordingModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioSettings, setAudioSettings] = useState({
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 녹음 시작
  const startRecording = async () => {
    try {
      // 마이크 권한 상태 확인
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('마이크 권한 상태:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        setError('마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        return;
      }

      // 사용 가능한 미디어 장치 확인
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      console.log('사용 가능한 오디오 장치:', audioDevices);
      
      if (audioDevices.length === 0) {
        setError('사용 가능한 마이크가 없습니다.');
        return;
      }

      console.log('마이크 접근 요청 중...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: audioSettings.echoCancellation,
          noiseSuppression: audioSettings.noiseSuppression,
          autoGainControl: audioSettings.autoGainControl,
          sampleRate: 48000,  // 고품질 샘플레이트
          channelCount: 2     // 스테레오
        } 
      });
      console.log('마이크 접근 성공:', stream);
      
      // 고품질 녹음 설정
      const options = {
        mimeType: 'audio/wav',  // WAV 형식
        audioBitsPerSecond: 256000  // 256kbps 비트레이트 (고품질)
      };
      
      // WAV를 지원하지 않는 경우 대체 옵션
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm;codecs=opus';
        console.log('WAV를 지원하지 않아 WebM Opus를 사용합니다.');
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        setError(null);
        // 녹음 시간을 오디오 길이로 설정
        setAudioDuration(recordingTime);
        console.log('녹음 완료, 파일 크기:', blob.size, '파일 형식: audio/wav', '녹음 시간:', recordingTime);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 녹음 시간 타이머
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('녹음 시작 오류 상세:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        } else if (err.name === 'NotFoundError') {
          setError('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
        } else if (err.name === 'NotReadableError') {
          setError('마이크에 접근할 수 없습니다. 다른 애플리케이션에서 마이크를 사용 중일 수 있습니다.');
        } else {
          setError(`마이크 접근 오류: ${err.message}`);
        }
      } else {
        setError('마이크 접근 권한이 필요합니다.');
      }
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // 녹음된 오디오 재생/정지
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 오디오 재생 완료 시
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // 오디오 메타데이터 로드 시
  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      // NaN이나 무한대 값 처리
      if (isNaN(duration) || !isFinite(duration) || duration < 0) {
        setAudioDuration(0);
      } else {
        setAudioDuration(duration);
      }
    }
  };

  // 오디오 시간 업데이트
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    // NaN이나 무한대 값 처리
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 재녹음
  const reRecord = () => {
    // 기존 녹음 정리
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setError(null);
  };

  // 녹음 완료 및 모달 닫기
  const handleComplete = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
      onClose();
    }
  };

  // 모달 닫기 시 정리
  const handleClose = () => {
    // 녹음 중이면 중지
    if (isRecording) {
      stopRecording();
    }
    
    // 오디오 재생 중이면 정지
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
    
    // URL 정리
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    
    // 상태 초기화
    setIsRecording(false);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setError(null);
    
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="오디오 녹음"
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* 녹음 상태 표시 */}
        <div className="text-center">
          {isRecording && (
            <div className="flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
              <div className="w-3 h-3 bg-red-600 dark:bg-red-400 rounded-full animate-pulse mr-2"></div>
              <span className="font-medium">녹음 중...</span>
            </div>
          )}
          <div className="text-3xl font-mono text-gray-900 dark:text-gray-100 font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {formatTime(isRecording ? recordingTime : (audioDuration || 0))}
          </div>
          {recordedBlob && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              재생 시간: {formatTime(currentTime)} / {formatTime(audioDuration)}
            </div>
          )}
        </div>

        {/* 녹음 컨트롤 */}
        {!recordedBlob && (
          <div className="space-y-4">
            {/* 오디오 설정 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                음질 설정
              </h3>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioSettings.echoCancellation}
                    onChange={(e) => setAudioSettings(prev => ({
                      ...prev,
                      echoCancellation: e.target.checked
                    }))}
                    className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">에코 제거</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioSettings.noiseSuppression}
                    onChange={(e) => setAudioSettings(prev => ({
                      ...prev,
                      noiseSuppression: e.target.checked
                    }))}
                    className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">노이즈 제거</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioSettings.autoGainControl}
                    onChange={(e) => setAudioSettings(prev => ({
                      ...prev,
                      autoGainControl: e.target.checked
                    }))}
                    className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">자동 볼륨 조절</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                💡 모든 옵션을 끄면 원음에 가까운 녹음이 됩니다.
              </p>
            </div>

            {/* 녹음 버튼 */}
            <div className="flex justify-center">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold text-lg"
                >
                  <Mic className="h-6 w-6 mr-3" />
                  녹음 시작
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-full hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold text-lg"
                >
                  <Square className="h-6 w-6 mr-3" />
                  녹음 중지
                </button>
              )}
            </div>
          </div>
        )}

        {/* 녹음된 오디오 재생 */}
        {recordedBlob && (
          <div className="space-y-6">
            {/* 커스텀 플레이어 컨트롤 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button
                  onClick={togglePlayback}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold"
                >
                  {isPlaying ? (
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
                <button
                  onClick={reRecord}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-full hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  재녹음
                </button>
              </div>

              {/* 프로그레스 바 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-100"
                  style={{ 
                    width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%' 
                  }}
                ></div>
              </div>
            </div>

            {/* 브라우저 기본 오디오 컨트롤 (PC에서 더 세밀한 제어) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                고급 제어 (PC 권장)
              </h4>
              <audio
                ref={audioRef}
                src={recordedUrl!}
                onEnded={handleAudioEnded}
                onLoadedMetadata={handleAudioLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                controls
                className="w-full h-12 rounded-lg bg-gray-50 dark:bg-gray-700"
                style={{
                  accentColor: '#3b82f6'
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                브라우저 기본 컨트롤을 사용하여 더 정밀한 재생 제어가 가능합니다.
              </p>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
          >
            취소
          </button>
          {recordedBlob && (
            <button
              onClick={handleComplete}
              className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold"
            >
              <Check className="h-4 w-4 mr-2" />
              사용하기
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
} 