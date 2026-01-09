import { api, ApiResponse, Equipment, PaginatedResponse } from './api';
import dayjs from 'dayjs';

// 장비 저장/수정 요청 전처리:
// - Date/Number 계열 필드가 ''로 넘어오면 DRF에서 형식 오류가 나므로 아예 제거(미전송)한다.
// - 일부 화면/호출 경로에서 방어 로직이 누락돼도 여기서 최종적으로 걸러준다.
const sanitizeEquipmentPayload = (payload: Partial<Equipment> & Record<string, any>) => {
  const cleaned: Record<string, any> = { ...payload };

  // 빈 문자열은 기본적으로 제거(텍스트 필드도 '' 허용이 꼭 필요한 경우는 없고, 오히려 로그처럼 원인 됨)
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === '' || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  }

  // 날짜/숫자 필드는 특히 ''/NaN 방어
  for (const key of ['purchase_date', 'acquisition_date', 'manufacture_year', 'purchase_price']) {
    if (key in cleaned) {
      const v = cleaned[key];
      if (v === '' || v === undefined || v === null) {
        delete cleaned[key];
      }
      if ((key === 'manufacture_year' || key === 'purchase_price') && typeof v === 'number' && Number.isNaN(v)) {
        delete cleaned[key];
      }
    }
  }

  // 대여 정보도 빈 값 정리
  if (cleaned.rental && typeof cleaned.rental === 'object') {
    const rental = { ...cleaned.rental };
    for (const k of Object.keys(rental)) {
      if (rental[k] === '' || rental[k] === undefined) {
        delete rental[k];
      }
    }
    // user_id 같은 핵심 값이 없으면 rental 자체 제거
    if (!('user_id' in rental) || rental.user_id == null) {
      delete cleaned.rental;
    } else {
      cleaned.rental = rental;
    }
  }

  return cleaned as Partial<Equipment>;
};

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
  manufacturer?: string;
  manufacture_year?: number;
  purchase_date?: string;
  purchase_price?: number;
  equipment_type?: string;
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

// 장비 이력 타입 정의
export interface EquipmentHistory {
  id: number;
  equipment: {
    id: number;
    asset_number: string;
    model_name: string;
  };
  action: string;
  old_value: any;
  new_value: any;
  user: {
    id: number;
    username: string;
    email: string;
  };
  created_at: string;
  details: string;
}

// 장비 서비스 - 장비 관련 API 통신
export const equipmentService = {
  // 장비 목록 조회 (페이지네이션 지원)
  async getEquipmentList(page: number = 1, pageSize: number = 20, search?: string, status?: string, type?: string) {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      if (search) {
        params.append('search', search);
      }
      if (status) {
        params.append('status', status);
      }
      if (type) {
        params.append('equipment_type', type);
      }
      
      const response = await api.get<PaginatedResponse<Equipment>>(`/admin/equipment/?${params.toString()}`);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: response.message
        };
      }
      
      return {
        success: response.success,
        data: {
          count: 0,
          next: null,
          previous: null,
          results: []
        },
        message: response.message || '장비 목록을 가져오지 못했습니다.'
      };
    } catch (error) {
      console.error('장비 목록 조회 중 오류:', error);
      return {
        success: false,
        data: {
          count: 0,
          next: null,
          previous: null,
          results: []
        },
        error: {
          message: '장비 목록을 조회하는 중 오류가 발생했습니다.'
        }
      };
    }
  },

  // 장비 목록 조회 (기존 함수 - 호환성 유지)
  async getAllEquipment() {
    try {
      const response = await api.get<{count: number, next: string | null, previous: string | null, results: Equipment[]}>('/admin/equipment/');
      
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
      
      console.log('대여 가능한 장비 API 응답:', response);
      
      // 응답 데이터 처리
      if (response.success) {
        let equipmentData: Equipment[] = [];
        
        // 배열 형태인 경우
        if (Array.isArray(response.data)) {
          equipmentData = response.data;
        }
        // 페이지네이션 형태인 경우
        else if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray((response.data as any).results)) {
          equipmentData = (response.data as any).results;
        }
        // 다른 형태인 경우
        else {
          console.error('대여 가능 장비 목록 API 응답 데이터 형식이 예상과 다릅니다:', response.data);
          return {
            success: true,
            data: [] as Equipment[],
            message: '데이터 형식이 올바르지 않습니다.'
          };
        }
        
        console.log('처리된 장비 데이터:', equipmentData);
        
        return {
          success: true,
          data: equipmentData,
          message: response.message
        };
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
    return await api.get<Equipment>(`/admin/equipment/${id}/`);
  },

  // 장비 정보 생성 (관리자용)
  async createEquipment(equipmentData: Partial<Equipment>) {
    const payload = sanitizeEquipmentPayload(equipmentData as any);
    return await api.post<Equipment>('/admin/equipment/', payload);
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
          manufacturer: equipmentData.manufacturer,
          model_name: equipmentData.model_name,
          equipment_type: equipmentData.equipment_type,
          serial_number: equipmentData.serial_number,
          acquisition_date: equipmentData.acquisition_date
        };
        const payload = sanitizeEquipmentPayload(minimalData as any);
        return await api.put<Equipment>(`/admin/equipment/${id}/`, payload, {
          headers: {
            'Referer': `${window.location.origin}/dashboard/admin/equipment/`
          }
        });
      }
      const payload = sanitizeEquipmentPayload(equipmentData as any);
      return await api.put<Equipment>(`/admin/equipment/${id}/`, payload, {
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
    return await api.delete(`/admin/equipment/${id}/`);
  },

  // 장비 이력 조회
  async getEquipmentHistory(equipmentId: number) {
    try {
      console.log(`장비 이력 조회 API 호출: /admin/equipment/${equipmentId}/history/`);
      const response = await api.get<EquipmentHistory[]>(`/admin/equipment/${equipmentId}/history/`);
      console.log('장비 이력 조회 응답:', response);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('장비 이력 조회 중 오류:', error);
      return {
        success: false,
        data: [] as EquipmentHistory[],
        error: {
          message: '장비 이력을 조회하는 중 오류가 발생했습니다.'
        }
      };
    }
  },

  // 장비 상태 변경
  async changeEquipmentStatus(equipmentId: number, status: string, reason?: string) {
    try {
      const response = await api.post(`/admin/equipment/${equipmentId}/change-status/`, {
        status,
        reason
      });
      return response;
    } catch (error) {
      console.error('장비 상태 변경 중 오류:', error);
      return {
        success: false,
        error: {
          message: '장비 상태 변경 중 오류가 발생했습니다.'
        }
      };
    }
  },

  // 여러 장비 상태 일괄 변경
  async batchChangeEquipmentStatus(equipmentIds: number[], status: string, reason?: string, userId?: number) {
    try {
      const payload: any = {
        equipment_ids: equipmentIds,
        status,
        reason
      };
      
      // 대여중 상태일 때 사용자 ID 추가
      if (status === 'RENTED' && userId) {
        payload.user_id = userId;
      }
      
      const response = await api.post('/admin/equipment/batch-change-status/', payload);
      return response;
    } catch (error) {
      console.error('장비 일괄 상태 변경 중 오류:', error);
      return {
        success: false,
        error: {
          message: '장비 일괄 상태 변경 중 오류가 발생했습니다.'
        }
      };
    }
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
      return await api.post<ImportEquipmentResponse>('/admin/equipment/import/', formData, {
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
      const response = await api.post('/admin/equipment/update-by-model/', data);
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
    manufacturer?: string;
    manufacture_year?: number;
    purchase_date?: string;
    purchase_price?: number;
    equipment_type?: string;
  }>> => {
    try {
      console.log('getModelInfo 호출:', modelName);
      const response = await api.get(`/admin/equipment/get-model-info/?model_name=${encodeURIComponent(modelName)}`);
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
      const response = await api.get('/admin/equipment/export-excel/', {
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

  // 장비 정보 엑셀 일괄 등록/업데이트 (관리자용)
  async bulkUpdateEquipmentFromExcel(file: File): Promise<ApiResponse<{
    success: boolean;
    message: string;
    results: {
      total_rows: number;
      created: number;
      updated: number;
      errors: string[];
      created_equipment: Array<{
        serial_number: string;
        asset_number: string;
        created_fields: string[];
      }>;
      updated_equipment: Array<{
        serial_number: string;
        asset_number: string;
        updated_fields: string[];
      }>;
    };
  }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/admin/equipment/bulk-update-excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('엑셀 업로드 중 오류:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('엑셀 파일 업로드에 실패했습니다.');
    }
  },

  updateEquipmentStatus: async (id: number, status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED'): Promise<ApiResponse<Equipment>> => {
    try {
      const response = await api.patch<Equipment>(`/rentals/equipment/${id}/`, { status });
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