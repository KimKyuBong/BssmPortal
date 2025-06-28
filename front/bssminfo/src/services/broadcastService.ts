import { api } from './api';
import {
  BroadcastStatus,
  TextBroadcastRequest,
  AudioBroadcastRequest,
  BroadcastResponse,
  BroadcastHistory,
  DeviceMatrix,
  AudioFile,
  PreviewResponse,
  PreviewListResponse,
  PreviewDetailResponse,
  PreviewApprovalRequest,
  PreviewApprovalResponse,
  ExternalPreviewResponse,
  PreviewInfo
} from '../types/broadcast';

const BASE_URL = '/broadcast';

export const broadcastService = {
  // 시스템 상태 확인
  async getStatus(): Promise<{ success: boolean; message: string; status: BroadcastStatus }> {
    const response = await api.get(`${BASE_URL}/status/`);
    return response.data;
  },

  // 텍스트 방송
  async broadcastText(data: TextBroadcastRequest): Promise<BroadcastResponse | ExternalPreviewResponse> {
    const response = await api.post(`${BASE_URL}/text/`, data);
    return response.data;
  },

  // 오디오 방송
  async broadcastAudio(data: AudioBroadcastRequest): Promise<BroadcastResponse> {
    const formData = new FormData();
    formData.append('audio_file', data.audio_file);
    
    if (data.target_rooms) {
      formData.append('target_rooms', JSON.stringify(data.target_rooms));
    }

    const response = await api.post(`${BASE_URL}/audio/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 방송 이력 조회
  async getHistory(limit?: number): Promise<{ success: boolean; message: string; history: BroadcastHistory[]; total_count: number }> {
    const params = limit ? { limit } : {};
    const response = await api.get(`${BASE_URL}/history/`, { params });
    return response.data;
  },

  // 장치 매트릭스 조회
  async getDeviceMatrix(): Promise<{ success: boolean; message: string; matrix: DeviceMatrix[][]; total_rows: number; total_cols: number; total_devices: number }> {
    const response = await api.get(`${BASE_URL}/device-matrix/`);
    return response.data;
  },

  // 오디오 파일 목록 조회
  async getAudioFiles(): Promise<{ success: boolean; message: string; files: AudioFile[] }> {
    const response = await api.get(`${BASE_URL}/audio/files/`);
    return response.data;
  },

  // 오디오 파일 업로드
  async uploadAudioFile(file: File): Promise<{ success: boolean; message: string; file: AudioFile }> {
    const formData = new FormData();
    formData.append('audio_file', file);

    const response = await api.post(`${BASE_URL}/audio/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 프리뷰 관련 API들
  // 프리뷰 목록 조회
  async getPreviews(): Promise<PreviewListResponse> {
    const response = await api.get(`${BASE_URL}/previews/`);
    return response.data;
  },

  // 어드민 전용 프리뷰 전체 목록 조회
  async getAdminPreviews(): Promise<PreviewListResponse> {
    const response = await api.get(`${BASE_URL}/admin/previews/`);
    return response.data;
  },

  // 어드민 전용 방송 이력 전체 조회
  async getAdminHistory(limit: number = 100): Promise<{ success: boolean; history: BroadcastHistory[]; total_count: number }> {
    const response = await api.get(`${BASE_URL}/admin/history/?limit=${limit}`);
    return response.data;
  },

  // 방송 이력 상세 조회 (오디오 base64 포함)
  async getHistoryDetail(historyId: number): Promise<{ success: boolean; history: BroadcastHistory }> {
    const response = await api.get(`${BASE_URL}/history/${historyId}/`);
    return response.data;
  },

  // 프리뷰 상세 정보 조회
  async getPreviewDetail(previewId: string): Promise<PreviewDetailResponse> {
    const response = await api.get(`${BASE_URL}/preview/${previewId}/`);
    return response.data;
  },

  // 프리뷰 승인/거부
  async approvePreview(previewId: string, data: PreviewApprovalRequest): Promise<PreviewApprovalResponse> {
    const response = await api.post(`${BASE_URL}/preview/${previewId}/approve/`, data);
    return response.data;
  },

  // 프리뷰 거부 (별도 엔드포인트)
  async rejectPreview(previewId: string, rejectionReason?: string): Promise<PreviewApprovalResponse> {
    const response = await api.post(`${BASE_URL}/preview/${previewId}/reject/`, {
      rejection_reason: rejectionReason || ''
    });
    return response.data;
  },

  // 프리뷰 오디오 파일 URL 생성
  async getPreviewAudioUrl(previewId: string): Promise<string> {
    try {
      // 인증 토큰을 헤더로 전달하여 오디오 파일 가져오기
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${baseUrl}/api/broadcast/preview/${previewId}.mp3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'audio/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`오디오 파일을 가져올 수 없습니다: ${response.status}`);
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('프리뷰 오디오 파일 가져오기 실패:', error);
      throw error;
    }
  },

  // 외부 API에서 전달받은 프리뷰 정보 처리
  async handleExternalPreviewResponse(response: ExternalPreviewResponse): Promise<PreviewInfo> {
    try {
      if (!response.success) {
        throw new Error(response.message || '프리뷰 생성에 실패했습니다.');
      }

      // 백엔드로 프리뷰 정보 전달하여 저장
      const backendResponse = await api.post(`${BASE_URL}/preview/audio/`, {
        preview_info: response.preview_info,
        target_rooms: [],  // 필요시 추가
        language: 'ko'
      });

      if (backendResponse.data.success) {
        // 백엔드에서 처리된 프리뷰 정보 반환
        return backendResponse.data.preview_info;
      } else {
        throw new Error(backendResponse.data.message || '백엔드 프리뷰 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('외부 프리뷰 응답 처리 실패:', error);
      throw error;
    }
  },

  // 외부 프리뷰 오디오 스트림 가져오기
  async getExternalPreviewAudio(previewUrl: string): Promise<string> {
    try {
      // 외부 API에서 오디오 파일을 가져와서 로컬에 저장하거나 스트리밍
      const response = await fetch(previewUrl);
      if (!response.ok) {
        throw new Error('프리뷰 오디오를 가져올 수 없습니다.');
      }
      
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      return audioUrl;
    } catch (error) {
      console.error('외부 프리뷰 오디오 가져오기 실패:', error);
      throw error;
    }
  },

  // 방송 이력에서 오디오 파일 재사용
  async reuseHistoryAudio(historyId: number): Promise<{ success: boolean; message: string; preview_info?: any }> {
    const response = await api.post(`${BASE_URL}/history/`, {
      history_id: historyId
    });
    return response.data;
  },
}; 