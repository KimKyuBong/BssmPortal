import React, { useState, useEffect } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      setTestResult('마이크 상태 확인 중 오류가 발생했습니다.');
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
        return '요청 대기 중';
      default:
        return '알 수 없음';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Mic className="h-5 w-5 mr-2 text-blue-500" />
        마이크 상태 확인
      </h2>

      <div className="space-y-4">
        {/* 권한 상태 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">마이크 권한:</span>
          <div className="flex items-center">
            {getPermissionIcon()}
            <span className="ml-2 text-sm">{getPermissionText()}</span>
          </div>
        </div>

        {/* 사용 가능한 장치 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700 block mb-2">
            사용 가능한 마이크 ({devices.length}개):
          </span>
          {devices.length > 0 ? (
            <div className="space-y-1">
              {devices.map((device, index) => (
                <div key={device.deviceId} className="text-xs text-gray-600 flex items-center">
                  <Mic className="h-3 w-3 mr-1" />
                  {device.label || `마이크 ${index + 1}`}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 flex items-center">
              <MicOff className="h-3 w-3 mr-1" />
              사용 가능한 마이크가 없습니다.
            </div>
          )}
        </div>

        {/* 테스트 결과 */}
        {testResult && (
          <div className={`p-3 rounded-lg ${
            testResult.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-sm">{testResult}</p>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex space-x-3">
          <button
            onClick={testMicrophone}
            disabled={isTesting}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                테스트 중...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                마이크 테스트
              </>
            )}
          </button>
          
          {permissionState === 'denied' && (
            <button
              onClick={requestPermission}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              권한 요청
            </button>
          )}
        </div>

        {/* 도움말 */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• 권한이 거부된 경우 브라우저 주소창의 자물쇠 아이콘을 클릭하여 권한을 허용하세요.</p>
          <p>• 다른 애플리케이션에서 마이크를 사용 중인지 확인하세요.</p>
          <p>• 마이크가 제대로 연결되어 있는지 확인하세요.</p>
        </div>
      </div>
    </div>
  );
} 