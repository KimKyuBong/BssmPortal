/**
 * IP 관리 서비스
 * IP 할당 관련 기능을 제공하는 서비스
 */

import api from './api';

/**
 * IP 정보 타입
 */
export interface Device {
  id: number;
  mac_address: string;
  device_name: string;
  assigned_ip: string | null;
  is_active: boolean;
  last_access: string;
  created_at: string;
  user?: number;
  username?: string;
  user_full_name?: string;
  last_seen?: string; // 마지막 접속 시간 (UI 표시용)
}

/**
 * IP 할당 이력 타입
 */
export interface DeviceHistory {
  id: number;
  user_id: number;
  mac_address: string;
  device_name: string;
  assigned_ip: string | null;
  action: string;
  created_at: string;
}

/**
 * IP 통계 타입
 */
export interface DeviceStatistics {
  total_devices: number;
  active_devices: number;
  user_devices: number; // 백엔드 응답에 맞게 수정
}

/**
 * 현재 MAC 주소 응답 타입
 */
export interface CurrentMacResponse {
  ip_address: string;
  mac_address: string;
}

/**
 * IP 에러 타입
 */
export interface DeviceError {
  detail: string;
  error_code?: string;
  current_count?: number;
  device_limit?: number;
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | DeviceError;
}

/**
 * IP 관리 서비스
 */
const ipService = {
  /**
   * 내 IP 목록 조회
   * @returns 장치 목록
   */
  getMyIps: async () => {
    return api.get<Device[]>('/ip/my/');
  },

  /**
   * 모든 IP 목록 조회 (관리자용)
   * @returns 장치 목록
   */
  getAllIps: async () => {
    return api.get<Device[]>('/admin/ip/all/');
  },

  /**
   * IP 상세 정보 조회
   * @param id 장치 ID
   * @returns 장치 상세 정보
   */
  getIp: async (id: number) => {
    return api.get<Device>(`/ip/${id}/`);
  },

  /**
   * IP 등록
   * @param params 등록할 장치 정보
   * @returns 등록된 장치 정보
   */
  registerIp: async (params: { mac_address: string; device_name: string }) => {
    return api.post<Device>('/ip/', {
      mac_address: params.mac_address,
      device_name: params.device_name,
    });
  },

  /**
   * 수동으로 IP 등록 (관리자용)
   * @param macAddress MAC 주소
   * @param deviceName 장치 이름
   * @returns 등록된 장치 정보
   */
  registerManualIp: async (macAddress: string, deviceName: string) => {
    return api.post<Device>('/ip/register_manual/', {
      mac_address: macAddress,
      device_name: deviceName,
    });
  },

  /**
   * 현재 장치의 MAC 주소 조회
   * @returns 현재 IP 주소와 MAC 주소
   */
  getCurrentMac: async () => {
    console.log("현재 MAC 주소 조회 요청 시작...");
    try {
      const response = await api.get<CurrentMacResponse>('/ip/current-mac/');
      console.log("MAC 주소 조회 응답:", response);
      return response;
    } catch (error) {
      console.error("MAC 주소 조회 오류:", error);
      throw error;
    }
  },

  /**
   * IP 정보 수정
   * @param id 장치 ID
   * @param deviceName 장치 이름
   * @returns 수정된 장치 정보
   */
  updateIp: async (id: number, deviceName: string) => {
    return api.put<Device>(`/ip/${id}/`, {
      device_name: deviceName,
    });
  },

  /**
   * IP 삭제
   * @param id 장치 ID
   * @returns 삭제 결과
   */
  deleteIp: async (id: number) => {
    return api.delete<{message: string}>(`/ip/${id}/`);
  },

  /**
   * IP 활성화/비활성화 토글
   * @param id 장치 ID
   * @returns 수정된 장치 정보
   */
  toggleIpActive: async (id: number) => {
    const response = await api.post<Device>(`/admin/ip/${id}/toggle-active/`, {});
    
    if (response.success) {
      if (response.data && !response.data.is_active) {
        return {
          ...response,
          message: 'IP가 비활성화되었으며 DHCP 서버에서 IP 할당이 제거되었습니다.'
        };
      } else {
        return {
          ...response,
          message: 'IP가 활성화되었습니다.'
        };
      }
    }
    
    return response;
  },

  /**
   * IP 재할당
   * @param id 장치 ID
   * @returns 수정된 장치 정보
   */
  reassignIp: async (id: number) => {
    return api.post<Device>(`/admin/ip/${id}/reassign/`, {});
  },

  /**
   * IP 통계 조회
   * @returns 장치 통계
   */
  getStatistics: async () => {
    return api.get<DeviceStatistics>('/admin/ip/statistics/');
  },

  /**
   * IP 할당 이력 조회
   * @returns 장치 이력 목록
   */
  getIpHistory: async () => {
    return api.get<DeviceHistory[]>('/admin/ip/history/');
  },

  /**
   * 특정 장치의 이력 조회
   * @param id 장치 ID
   * @returns 장치 이력 목록
   */
  getDeviceHistoryById: async (id: number) => {
    return api.get<DeviceHistory[]>(`/devices/${id}/device_history/`);
  },

  /**
   * 사용자별 장치 이력 조회 (관리자용)
   * @returns 사용자별 장치 이력 목록
   */
  getUserHistory: async () => {
    return api.get<DeviceHistory[]>('/devices/user_history/');
  },

  /**
   * 내 기기 이력 조회 (페이지네이션 처리)
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 페이지네이션 처리된 기기 이력 목록
   */
  getMyDeviceHistory: async (page: number = 1, pageSize: number = 10) => {
    return api.get<any>(`/devices/history/my_history/?page=${page}&page_size=${pageSize}`);
  },
};

export default ipService; 