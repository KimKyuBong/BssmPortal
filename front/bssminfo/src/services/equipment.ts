import { api, ApiResponse, Equipment, PaginatedResponse } from './api';
import dayjs from 'dayjs';

// 엑셀 가져오기 응답 타입 정의
export interface ImportEquipmentResponse {
  success: boolean;
  message: string;
  createdCount?: number;
  updatedCount?: number;
  failedCount?: number;
  errors?: string[];
  created_equipment?: string[];
  total_created?: number;
  total_errors?: number;
}

// 모델별 일괄 업데이트 인터페이스
export interface ModelBatchUpdateData {
  model_name: string;
  manufacture_year?: number;
  purchase_date?: string;
  purchase_price?: number;
}

export interface MacAddress {
  id: number;
  mac_address: string;
  interface_type: string;
  interface_type_display: string;
  is_primary: boolean;
}

export interface UpdatedEquipment {
  id: number;
  asset_number: string | null;
  manufacturer: string;
  model_name: string;
  equipment_type: string;
  equipment_type_display: string;
  serial_number: string;
  mac_addresses: MacAddress[];
}

export interface ModelBatchUpdateResponse {
  success: boolean;
  message: string;
  updated_count: number;
  updated_equipments: UpdatedEquipment[];
}

// 장비 서비스 - 장비 관련 API 통신
export const equipmentService = {
  // 장비 목록 조회
  async getAllEquipment() {
    try {
      const response = await api.get<{count: number, next: string | null, previous: string | null, results: Equipment[]}>('/rentals/equipment/');
      
      // 응답 데이터가 올바른 형식인지 확인
      if (response.success) {
        if (!response.data || !response.data.results || !Array.isArray(response.data.results)) {
          console.error('장비 목록 API 응답 데이터가 올바른 형식이 아닙니다:', response.data);
          return {
            success: true,
            data: [] as Equipment[],
            message: '데이터 형식이 올바르지 않습니다.'
          };
        }
        
        // results 배열 반환
        return {
          success: true,
          data: response.data.results,
          message: response.message
        };
      }
      
      return {
        success: response.success,
        data: [] as Equipment[],
        message: response.message || '장비 목록을 가져오지 못했습니다.'
      };
    } catch (error) {
      console.error('장비 목록 조회 중 오류:', error);
      return {
        success: false,
        data: [] as Equipment[],
        error: {
          message: '장비 목록을 조회하는 중 오류가 발생했습니다.'
        }
      };
    }
  },

  // 대여 가능한 장비 목록 조회
  async getAvailableEquipment() {
    try {
      const response = await api.get<Equipment[]>('/rentals/equipment/available/');
      
      // 응답 데이터가 배열인지 확인
      if (response.success) {
        if (!response.data || !Array.isArray(response.data)) {
          console.error('대여 가능 장비 목록 API 응답 데이터가 배열이 아닙니다:', response.data);
          return {
            success: true,
            data: [] as Equipment[],
            message: '데이터 형식이 올바르지 않습니다.'
          };
        }
        
        // 정상적인 배열 데이터
        return response;
      }
      
      return {
        success: response.success,
        data: [] as Equipment[],
        message: response.message || '대여 가능한 장비 목록을 가져오지 못했습니다.'
      };
    } catch (error) {
      console.error('대여 가능 장비 목록 조회 중 오류:', error);
      return {
        success: false,
        data: [] as Equipment[],
        error: {
          message: '대여 가능한 장비 목록을 조회하는 중 오류가 발생했습니다.'
        }
      };
    }
  },

  // 장비 상세 정보 조회
  async getEquipmentDetail(id: number) {
    return await api.get<Equipment>(`/rentals/equipment/${id}/`);
  },

  // 장비 정보 생성 (관리자용)
  async createEquipment(equipmentData: Partial<Equipment>) {
    return await api.post<Equipment>('/rentals/equipment/', equipmentData);
  },

  // 장비 정보 수정 (관리자용)
  async updateEquipment(id: number, equipmentData: Partial<Equipment>) {
    try {
      // 상태가 AVAILABLE로 변경될 때는 필수 필드만 전송
      if (equipmentData.status === 'AVAILABLE') {
        const minimalData = {
          status: 'AVAILABLE',
          rental: null,
          asset_number: equipmentData.asset_number,
          equipment_type: equipmentData.equipment_type,
          serial_number: equipmentData.serial_number,
          acquisition_date: equipmentData.acquisition_date
        };
        return await api.put<Equipment>(`/rentals/equipment/${id}/`, minimalData, {
          headers: {
            'Referer': `${window.location.origin}/dashboard/admin/equipment/`
          }
        });
      }
      return await api.put<Equipment>(`/rentals/equipment/${id}/`, equipmentData, {
        headers: {
          'Referer': `${window.location.origin}/dashboard/admin/equipment/`
        }
      });
    } catch (error) {
      console.error('장비 정보 수정 중 오류:', error);
      return {
        success: false,
        error: { detail: '장비 정보 수정 중 오류가 발생했습니다.' },
        message: '장비 정보 수정 중 오류가 발생했습니다.'
      };
    }
  },

  // 장비 정보 삭제 (관리자용)
  async deleteEquipment(id: number) {
    return await api.delete(`/rentals/equipment/${id}/`);
  },

  // 엑셀 파일로 장비 일괄 추가 (관리자용)
  async importEquipmentFromExcel(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return {
        success: false,
        error: { detail: '엑셀 파일(.xlsx 또는 .xls)만 업로드할 수 있습니다.' }
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      return await api.post<ImportEquipmentResponse>('/rentals/equipment/import_excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('엑셀 파일 업로드 중 오류:', error);
      return {
        success: false,
        error: { detail: '파일 업로드 중 오류가 발생했습니다.' }
      };
    }
  },

  /**
   * 모델명으로 장비 일괄 업데이트
   * @param data 모델별 업데이트 데이터 (모델명, 생산년도, 구매일)
   * @returns 업데이트 결과
   */
  updateByModel: async (data: ModelBatchUpdateData): Promise<ModelBatchUpdateResponse> => {
    try {
      const response = await api.post('/rentals/equipment/update-by-model/', data);
      return response.data;
    } catch (error) {
      console.error("모델별 장비 업데이트 중 오류 발생:", error);
      return {
        success: false,
        message: '모델별 장비 업데이트에 실패했습니다.',
        updated_count: 0,
        updated_equipments: []
      };
    }
  },

  /**
   * 모델명으로 장비 정보 조회
   * @param modelName 모델명
   * @returns 모델 정보
   */
  getModelInfo: async (modelName: string): Promise<ApiResponse<{
    model_name: string;
    manufacture_year?: number;
    purchase_date?: string;
    purchase_price?: number;
  }>> => {
    try {
      console.log('getModelInfo 호출:', modelName);
      const response = await api.get(`/rentals/equipment/get-model-info/?model_name=${encodeURIComponent(modelName)}`);
      console.log('getModelInfo 응답:', response);
      return response.data;
    } catch (error) {
      console.error("모델 정보 조회 중 오류 발생:", error);
      return {
        success: false,
        message: '모델 정보 조회에 실패했습니다.',
        data: undefined
      };
    }
  },

  // 장비 목록 엑셀 다운로드 (관리자용)
  async exportEquipmentToExcel(): Promise<ApiResponse<void>> {
    try {
      const response = await api.get('/rentals/equipment/export_excel/', {
        responseType: 'blob'
      });

      // 현재 날짜를 파일명에 포함
      const date = new Date().toISOString().split('T')[0];
      const filename = `장비_목록_${date}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('엑셀 다운로드 중 오류:', error);
      throw new Error('엑셀 파일 다운로드에 실패했습니다.');
    }
  },

  updateEquipmentStatus: async (id: number, status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED'): Promise<ApiResponse<Equipment>> => {
    try {
      const response = await api.patch<Equipment>(`/equipment/${id}/`, { status });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('장비 상태 업데이트 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: '장비 상태 업데이트에 실패했습니다.' }
      };
    }
  }
};

export default equipmentService; 