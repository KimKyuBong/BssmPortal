/**
 * 장치 서비스
 * 장치 관리 관련 기능을 제공하는 서비스
 */

import api from './api';

/**
 * 장치 정보 타입
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
  last_seen?: string; // 마지막 접속 시간 (UI 표시용)
}

/**
 * 장치 이력 타입
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
 * 장치 통계 타입
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
 * 장치 서비스
 */
const deviceService = {
  /**
   * 내 장치 목록 조회
   * @returns 장치 목록
   */
  getMyDevices: async () => {
    return api.get<Device[]>('/devices/my/');
  },

  /**
   * 모든 장치 목록 조회 (관리자용)
   * @returns 장치 목록
   */
  getAllDevices: async () => {
    return api.get<Device[]>('/devices/all/');
  },

  /**
   * 장치 상세 정보 조회
   * @param id 장치 ID
   * @returns 장치 상세 정보
   */
  getDevice: async (id: number) => {
    return api.get<Device>(`/devices/${id}/`);
  },

  /**
   * 장치 등록
   * @param params 등록할 장치 정보
   * @returns 등록된 장치 정보
   */
  registerDevice: async (params: { mac_address: string; device_name: string }) => {
    return api.post<Device>('/devices/', {
      mac_address: params.mac_address,
      device_name: params.device_name,
    });
  },

  /**
   * 수동으로 장치 등록 (관리자용)
   * @param macAddress MAC 주소
   * @param deviceName 장치 이름
   * @returns 등록된 장치 정보
   */
  registerManualDevice: async (macAddress: string, deviceName: string) => {
    return api.post<Device>('/devices/register_manual/', {
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
      // Django ViewSet에 설정된 URL 경로 사용: /devices/current-mac/
      // 백엔드는 @action(detail=False, methods=['get'], url_path='current-mac')로 설정되어 있음
      const response = await api.get<CurrentMacResponse>('/devices/current-mac/');
      console.log("MAC 주소 조회 응답:", response);
      return response;
    } catch (error) {
      console.error("MAC 주소 조회 오류:", error);
      // 오류를 다시 throw하여 호출자가 처리할 수 있도록 합니다
      throw error;
    }
  },

  /**
   * 장치 정보 수정
   * @param id 장치 ID
   * @param deviceName 장치 이름
   * @returns 수정된 장치 정보
   */
  updateDevice: async (id: number, deviceName: string) => {
    return api.put<Device>(`/devices/${id}/`, {
      device_name: deviceName,
    });
  },

  /**
   * 장치 삭제
   * @param id 장치 ID
   * @returns 삭제 결과
   */
  deleteDevice: async (id: number) => {
    return api.delete<{message: string}>(`/devices/${id}/`);
  },

  /**
   * 장치 활성화/비활성화 토글
   * @param id 장치 ID
   * @returns 수정된 장치 정보
   */
  toggleDeviceActive: async (id: number) => {
    const response = await api.post<Device>(`/devices/${id}/toggle_active/`, {});
    
    // 응답에 성공 메시지 추가
    if (response.success) {
      // 비활성화된 경우 DHCP 할당 제거 메시지 추가
      if (response.data && !response.data.is_active) {
        return {
          ...response,
          message: '장치가 비활성화되었으며 DHCP 서버에서 IP 할당이 제거되었습니다.'
        };
      } else {
        return {
          ...response,
          message: '장치가 활성화되었습니다.'
        };
      }
    }
    
    return response;
  },

  /**
   * 장치 IP 재할당
   * @param id 장치 ID
   * @returns 수정된 장치 정보
   */
  reassignIp: async (id: number) => {
    return api.post<Device>(`/devices/${id}/reassign_ip/`, {});
  },

  /**
   * 장치 통계 조회
   * @returns 장치 통계
   */
  getStatistics: async () => {
    return api.get<DeviceStatistics>('/devices/statistics/');
  },

  /**
   * 장치 이력 조회
   * @returns 장치 이력 목록
   */
  getDeviceHistory: async () => {
    return api.get<DeviceHistory[]>('/devices/history/');
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

export default deviceService; 