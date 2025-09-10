/**
 * 공개 장비 조회 API 서비스
 * 인증 없이 접근 가능한 공개 API
 */

import axios from 'axios';

// API 기본 URL 설정
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 개발 환경에서는 백엔드 서버 주소 사용
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return '';
};

const API_BASE_URL = getApiBaseUrl();

// 공개 API용 axios 인스턴스 (인증 헤더 없음)
const publicApi = axios.create({
  baseURL: `${API_BASE_URL}/api/public`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 공개 장비 정보 타입 정의
export interface PublicEquipment {
  id: number;
  asset_number: string;
  manufacturer: string;
  model_name: string;
  equipment_type: string;
  equipment_type_display: string;
  serial_number: string;
  description: string;
  status: string;
  status_display: string;
  acquisition_date: string;
  manufacture_year: number;
  purchase_date: string;
  purchase_price: number;
  management_number: string;
  created_at: string;
}

export interface PublicRental {
  id: number;
  rental_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  status_display: string;
  notes: string;
  user_name: string;
  created_at: string;
}

export interface PublicEquipmentHistory {
  id: number;
  action: string;
  action_display: string;
  details: string;
  created_at: string;
}

export interface PublicEquipmentDetailResponse {
  success: boolean;
  equipment: PublicEquipment;
  rental_history: PublicRental[];
  equipment_history: PublicEquipmentHistory[];
  total_rentals: number;
  total_history_entries: number;
}

export interface PublicEquipmentStatusResponse {
  success: boolean;
  serial_number: string;
  asset_number: string;
  manufacturer: string;
  model_name: string;
  equipment_type: string;
  equipment_type_display: string;
  status: string;
  status_display: string;
  management_number: string;
  is_rented: boolean;
  current_renter: {
    username: string;
    name: string;
    rental_date: string;
    due_date: string;
  } | null;
}

export interface PublicApiError {
  success: false;
  message: string;
  serial_number?: string;
  error?: string;
}

// 공개 장비 조회 서비스
export const publicEquipmentService = {
  /**
   * 일련번호로 장비 상세 정보와 대여이력 조회
   */
  async getEquipmentDetail(serialNumber: string): Promise<PublicEquipmentDetailResponse | PublicApiError> {
    try {
      const response = await publicApi.get<PublicEquipmentDetailResponse>(`/equipment/${serialNumber}/`);
      
      if (response.data.success) {
        return {
          success: true,
          equipment: response.data.equipment,
          rental_history: response.data.rental_history,
          equipment_history: response.data.equipment_history,
          total_rentals: response.data.total_rentals,
          total_history_entries: response.data.total_history_entries,
        };
      }
      
      return {
        success: false,
        message: '장비 정보를 가져오지 못했습니다.',
        serial_number: serialNumber,
      };
    } catch (error: any) {
      console.error('공개 장비 상세 조회 중 오류:', error);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          message: '해당 일련번호의 장비를 찾을 수 없습니다.',
          serial_number: serialNumber,
        };
      }
      
      return {
        success: false,
        message: '장비 정보 조회 중 오류가 발생했습니다.',
        serial_number: serialNumber,
        error: error.message,
      };
    }
  },

  /**
   * 일련번호로 장비 상태 정보만 조회
   */
  async getEquipmentStatus(serialNumber: string): Promise<PublicEquipmentStatusResponse | PublicApiError> {
    try {
      const response = await publicApi.get<PublicEquipmentStatusResponse>(`/equipment/${serialNumber}/status/`);
      
      if (response.data.success) {
        return {
          success: true,
          serial_number: response.data.serial_number,
          asset_number: response.data.asset_number,
          manufacturer: response.data.manufacturer,
          model_name: response.data.model_name,
          equipment_type: response.data.equipment_type,
          equipment_type_display: response.data.equipment_type_display,
          status: response.data.status,
          status_display: response.data.status_display,
          management_number: response.data.management_number,
          is_rented: response.data.is_rented,
          current_renter: response.data.current_renter,
        };
      }
      
      return {
        success: false,
        message: '장비 상태 정보를 가져오지 못했습니다.',
        serial_number: serialNumber,
      };
    } catch (error: any) {
      console.error('공개 장비 상태 조회 중 오류:', error);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          message: '해당 일련번호의 장비를 찾을 수 없습니다.',
          serial_number: serialNumber,
        };
      }
      
      return {
        success: false,
        message: '장비 상태 조회 중 오류가 발생했습니다.',
        serial_number: serialNumber,
        error: error.message,
      };
    }
  },
};
