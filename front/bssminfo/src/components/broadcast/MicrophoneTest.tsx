import React, { useState, useEffect } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, AlertCircle, Shield, Monitor } from 'lucide-react';
import { Card, Heading, Text, Button, Spinner } from '@/components/ui/StyledComponents';

export default function MicrophoneTest() {
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    checkMicrophoneStatus();
  }, []);

  const checkMicrophoneStatus = async () => {
    try {
      // 권한 상태 확인
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionState(permissionStatus.state);
        console.log('마이크 권한 상태:', permissionStatus.state);
      }

      // 사용 가능한 장치 확인
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = allDevices.filter(device => device.kind === 'audioinput');
      setDevices(audioDevices);
      console.log('오디오 장치 목록:', audioDevices);
    } catch (error) {
      console.error('마이크 상태 확인 오류:', error);
      setTestResult('❌ 마이크 상태 확인 중 오류가 발생했습니다.');
    }
  };

  const testMicrophone = async () => {
    setIsTesting(true);
    setTestResult('');

    try {
      console.log('마이크 테스트 시작...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('마이크 접근 성공:', stream);
      setTestResult('✅ 마이크 접근 성공! 녹음이 가능합니다.');
      
      // 스트림 정리
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('마이크 테스트 실패:', error);
      
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            setTestResult('❌ 마이크 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
            break;
          case 'NotFoundError':
            setTestResult('❌ 마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
            break;
          case 'NotReadableError':
            setTestResult('❌ 마이크에 접근할 수 없습니다. 다른 애플리케이션에서 사용 중일 수 있습니다.');
            break;
          default:
            setTestResult(`❌ 마이크 테스트 실패: ${error.message}`);
        }
      } else {
        setTestResult('❌ 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setTestResult('✅ 마이크 권한 요청 성공!');
      checkMicrophoneStatus(); // 상태 다시 확인
    } catch (error) {
      console.error('권한 요청 실패:', error);
      setTestResult('❌ 마이크 권한 요청이 거부되었습니다.');
    }
  };

  const getPermissionIcon = () => {
    switch (permissionState) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'prompt':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPermissionText = () => {
    switch (permissionState) {
      case 'granted':
        return '허용됨';
      case 'denied':
        return '거부됨';
      case 'prompt':
        return '요청 필요';
      default:
        return '알 수 없음';
    }
  };

  const getPermissionColor = () => {
    switch (permissionState) {
      case 'granted':
        return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'denied':
        return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'prompt':
        return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* PC 환경 최적화 안내 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center mb-2">
          <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <Text className="font-semibold text-blue-900 dark:text-blue-100">PC 환경 마이크 테스트</Text>
        </div>
        <Text className="text-sm text-blue-700 dark:text-blue-300">
          PC에서 방송 녹음을 위한 마이크 상태를 확인하고 테스트할 수 있습니다.
        </Text>
      </div>

      {/* 권한 상태 */}
      <div className={`p-4 rounded-lg border ${getPermissionColor()}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            <Text className="font-semibold">마이크 권한 상태</Text>
          </div>
          <div className="flex items-center">
            {getPermissionIcon()}
            <Text className="ml-2 font-medium">{getPermissionText()}</Text>
          </div>
        </div>
        
        {permissionState === 'denied' && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700">
            <Text className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">권한이 거부되었습니다</Text>
            <Text className="text-xs text-red-600 dark:text-red-300">
              브라우저 설정에서 마이크 권한을 허용하거나 아래 버튼을 클릭하여 다시 요청해주세요.
            </Text>
          </div>
        )}
      </div>

      {/* 장치 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-3">
          <Mic className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
          <Text className="font-semibold text-gray-900 dark:text-gray-100">감지된 오디오 장치</Text>
          <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
            {devices.length}개
          </span>
        </div>
        
        {devices.length > 0 ? (
          <div className="space-y-2">
            {devices.map((device, index) => (
              <div key={device.deviceId} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Mic className="h-4 w-4 text-green-500 mr-3" />
                <div className="flex-1">
                  <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {device.label || `마이크 ${index + 1}`}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {device.deviceId.substring(0, 20)}...
                  </Text>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <MicOff className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">감지된 오디오 장치가 없습니다</Text>
          </div>
        )}
      </div>

      {/* 테스트 결과 */}
      {testResult && (
        <div className={`p-4 rounded-lg border ${
          testResult.includes('✅') 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          <Text className="font-medium whitespace-pre-line">{testResult}</Text>
        </div>
      )}

      {/* 액션 버튼들 */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={testMicrophone}
          disabled={isTesting}
          className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isTesting ? (
            <>
              <Spinner className="h-4 w-4 mr-2" />
              테스트 중...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              마이크 테스트
            </>
          )}
        </Button>

        {permissionState !== 'granted' && (
          <Button
            onClick={requestPermission}
            className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Shield className="h-4 w-4 mr-2" />
            권한 요청
          </Button>
        )}

        <Button
          onClick={checkMicrophoneStatus}
          className="flex items-center bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          상태 새로고침
        </Button>
      </div>

      {/* 도움말 */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">💡 마이크 문제 해결 팁</Text>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>마이크가 PC에 제대로 연결되어 있는지 확인하세요</li>
          <li>다른 프로그램에서 마이크를 사용 중이지 않은지 확인하세요</li>
          <li>브라우저 설정에서 마이크 권한이 허용되어 있는지 확인하세요</li>
          <li>Windows 설정에서 마이크 개인정보 보호 설정을 확인하세요</li>
        </ul>
      </div>
    </div>
  );
} 