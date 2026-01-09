export interface BroadcastStatus {
  total_devices: number;
  recent_broadcasts: number;
  total_audio_files: number;
  system_healthy: boolean;
}

export interface TextBroadcastRequest {
  text: string;
  target_rooms?: string[];
  language?: string;
}

export interface AudioBroadcastRequest {
  audio_file: File;
  target_rooms?: string[];
  use_original?: boolean; // 원본 오디오 사용 (정규화 과정 건너뛰기)
}

export interface BroadcastResponse {
  success: boolean;
  message: string;
  history_id?: number;
  status?: string;
  preview_info?: PreviewInfo;
}

export interface BroadcastHistory {
  id: number;
  broadcast_type: 'text' | 'audio';
  broadcast_type_display: string;
  content: string;
  target_rooms: string[];
  language: string;
  status: string;
  status_display: string;
  broadcasted_by_username: string;
  created_at: string;
  completed_at?: string;
  audio_file?: {
    id: number;
    original_filename: string;
    file_size_mb: number;
    duration?: number;
    download_url: string;
  };
  audio_base64?: string;  // base64로 인코딩된 오디오 파일
}

// 방송 이력 상세 조회 응답 타입 (오디오 에러 정보 포함)
export interface BroadcastHistoryDetail extends BroadcastHistory {
  audio_error_type?: 'not_found' | 'server_error' | 'no_preview' | 'timeout' | 'connection_error' | 'unknown_error';
  audio_error_detail?: string;
}

export interface DeviceMatrix {
  id: number;
  device_name: string;
  room_id: number;
  position_row: number;
  position_col: number;
  matrix_row: number;
  matrix_col: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AudioFile {
  id: number;
  file: string;
  file_url: string;
  original_filename: string;
  file_size: number;
  file_size_mb: number;
  duration?: number;
  uploaded_by_username: string;
  created_at: string;
  is_active: boolean;
}

// 프리뷰 관련 타입들
export interface PreviewInfo {
  preview_id: string;
  job_type: string;
  preview_url: string;
  approval_endpoint: string;
  estimated_duration: number;
  created_at: string;
  status: string;
  audio_base64?: string;  // base64로 인코딩된 오디오 파일
}

export interface PreviewInstructions {
  preview_id: string;
  listen_preview: string;
  approve_preview: string;
  reject_preview: string;
  check_all_previews: string;
}

export interface ExternalPreviewResponse {
  success: boolean;
  status: string;
  preview_info: PreviewInfo;
  message: string;
  instructions: PreviewInstructions;
  timestamp: string;
}

export interface PreviewResponse {
  success: boolean;
  status: string;
  preview_info: PreviewInfo;
  message: string;
  timestamp: string;
}

export interface PreviewListItem {
  preview_id: string;
  job_type: 'audio' | 'text';
  estimated_duration: number;
  created_at: string;
  status: string;
}

export interface PreviewListResponse {
  success: boolean;
  previews: PreviewListItem[];
  count: number;
  timestamp: string;
}

export interface PreviewDetailResponse {
  success: boolean;
  preview_info: {
    preview_id: string;
    job_type: 'audio' | 'text';
    params: {
      target_rooms: string[] | null;  // null일 수 있도록 수정
      language: string;
    };
    preview_url: string;
    approval_endpoint: string;
    estimated_duration: number;
    created_at: string;
    status: string;
    audio_base64?: string;  // base64로 인코딩된 오디오 파일
  };
  timestamp: string;
}

export interface PreviewApprovalRequest {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

export interface PreviewApprovalResponse {
  success: boolean;
  preview_id: string;
  broadcast_result?: {
    status: string;
    queue_size: number;
    queue_position: number;
    estimated_start_time: string;
    estimated_duration: number;
    message: string;
  };
  message: string;
  timestamp: string;
} 