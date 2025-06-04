import { ApiResponse, Rental, RentalRequest, Equipment, SimpleUser, PaginatedResponse } from './api';
import { api } from './api';
import { saveAs } from 'file-saver';
import { AxiosError } from 'axios';

// 대여 요청 상태값 정의
export const RENTAL_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
} as const;

export const RENTAL_REQUEST_STATUS_DISPLAY = {
  [RENTAL_REQUEST_STATUS.PENDING]: '승인 대기',
  [RENTAL_REQUEST_STATUS.APPROVED]: '승인됨',
  [RENTAL_REQUEST_STATUS.REJECTED]: '거부됨',
  [RENTAL_REQUEST_STATUS.CANCELLED]: '취소됨'
} as const;

export type RentalRequestStatus = keyof typeof RENTAL_REQUEST_STATUS;
export type RentalRequestStatusDisplay = typeof RENTAL_REQUEST_STATUS_DISPLAY[RentalRequestStatus];

export interface CreateRentalRequest {
  equipment: number;
  request_type: 'RENT' | 'RETURN';
  expected_return_date?: string;
  request_reason?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  name: string;
  grade?: number;
  class?: number;
  number?: number;
}

const rentalService = {
  // 사용자용 API
  async getAvailableEquipment(): Promise<ApiResponse<Equipment[]>> {
    const response = await api.get('/equipment/available/');
    return response.data;
  },

  async requestRental(equipmentId: number, returnDate: string): Promise<ApiResponse<RentalRequest>> {
    const response = await api.post('/rentals/requests/', {
      equipment: equipmentId,
      return_date: returnDate
    });
    return response.data;
  },

  async getMyRentals(page?: number): Promise<ApiResponse<Rental[] | PaginatedResponse<Rental>>> {
    try {
      const url = `/rentals/items/active/${page ? `?page=${page}` : ''}`;
      const response = await api.get<PaginatedResponse<Rental>>(url);
      if (!response.data) {
        return {
          success: false,
          error: { detail: '응답 데이터가 없습니다.' },
          message: '응답 데이터가 없습니다.'
        };
      }

      // 응답 데이터 처리
      let rentalData: Rental[];
      if (Array.isArray(response.data)) {
        rentalData = response.data;
      } else if ('results' in response.data) {
        rentalData = response.data.results;
      } else {
        rentalData = [];
      }

      // equipment_detail 정보를 equipment에 매핑
      rentalData = rentalData.map(rental => {
        const equipmentDetail = (rental as any).equipment_detail;
        if (equipmentDetail) {
          return {
            ...rental,
            equipment: {
              id: equipmentDetail.id,
              name: equipmentDetail.name,
              manufacturer: equipmentDetail.manufacturer || '',
              model_name: equipmentDetail.model_name || '',
              serial_number: equipmentDetail.serial_number || '',
              equipment_type: equipmentDetail.equipment_type || '',
              equipment_type_display: equipmentDetail.equipment_type_display || '',
              purchase_date: equipmentDetail.purchase_date || '',
              manufacture_year: equipmentDetail.manufacture_year || undefined,
              acquisition_date: equipmentDetail.acquisition_date || '',
              description: equipmentDetail.description || '',
              image: equipmentDetail.image || '',
              status: equipmentDetail.status || 'AVAILABLE',
              status_display: equipmentDetail.status_display || '',
              created_at: equipmentDetail.created_at || '',
              mac_addresses: equipmentDetail.mac_addresses || []
            }
          };
        }
        return rental;
      });

      return {
        success: true,
        data: Array.isArray(response.data) ? rentalData : { ...response.data, results: rentalData }
      };
    } catch (error) {
      console.error('Error fetching my rentals:', error);
      return {
        success: false,
        error: { detail: '대여 내역을 불러오는데 실패했습니다.' },
        message: '대여 내역을 불러오는데 실패했습니다.'
      };
    }
  },

  async getMyRequests(page?: number): Promise<ApiResponse<RentalRequest[] | PaginatedResponse<RentalRequest>>> {
    try {
      const url = `/rentals/requests/my/${page ? `?page=${page}` : ''}`;
      const response = await api.get(url);
      
      if (response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        console.warn('예상치 못한 응답 형식:', response.data);
        return {
          success: true,
          data: []
        };
      }
    } catch (error) {
      console.error('Error fetching my rental requests:', error);
      return {
        success: false,
        error: { detail: '대여 요청 내역을 불러오는데 실패했습니다.' },
        message: '대여 요청 내역을 불러오는데 실패했습니다.'
      };
    }
  },

  async getMyRentalHistory(page?: number): Promise<ApiResponse<Rental[] | PaginatedResponse<Rental>>> {
    try {
      const url = `/rentals/items/history/${page ? `?page=${page}` : ''}`;
      const response = await api.get<PaginatedResponse<Rental>>(url);
      if (!response.data) {
        return {
          success: false,
          error: { detail: '응답 데이터가 없습니다.' },
          message: '응답 데이터가 없습니다.'
        };
      }
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching rental history:', error);
      return {
        success: false,
        error: { detail: '대여 이력을 불러오는데 실패했습니다.' },
        message: '대여 이력을 불러오는데 실패했습니다.'
      };
    }
  },

  // 관리자용 API
  async getAllEquipment(): Promise<ApiResponse<Equipment[]>> {
    const response = await api.get('/equipment/');
    return response.data;
  },

  async getAllRentals(page?: number): Promise<ApiResponse<Rental[] | PaginatedResponse<Rental>>> {
    try {
      const url = `/rentals/${page ? `?page=${page}` : ''}`;
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching all rentals:', error);
      return {
        success: false,
        error: { detail: '대여 내역을 불러오는데 실패했습니다.' },
        message: '대여 내역을 불러오는데 실패했습니다.'
      };
    }
  },

  async getAllRequests(page?: number): Promise<ApiResponse<RentalRequest[] | PaginatedResponse<RentalRequest>>> {
    try {
      const url = `/rentals/requests/${page ? `?page=${page}` : ''}`;
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching all requests:', error);
      return {
        success: false,
        error: { detail: '대여 요청 내역을 불러오는데 실패했습니다.' },
        message: '대여 요청 내역을 불러오는데 실패했습니다.'
      };
    }
  },

  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await api.get<User[]>('/admin/users/all');
      if (Array.isArray(response?.data)) {
        // 데이터를 정렬하여 반환 (ID 기준)
        const sortedUsers = response.data.sort((a, b) => a.id - b.id);
        // 각 사용자에 대해 name 필드 추가
        const usersWithName = sortedUsers.map(user => ({
          ...user,
          name: `${user.last_name} (${user.username})`
        }));
        return {
          success: true,
          data: usersWithName
        };
      }
      throw new Error('사용자 데이터가 올바르지 않습니다.');
    } catch (error) {
      console.error('사용자 목록 로드 중 오류 발생:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 목록을 불러오는데 실패했습니다.'
      };
    }
  },

  async processRequest(requestId: number, action: 'approve' | 'reject', reason?: string): Promise<ApiResponse<RentalRequest>> {
    const response = await api.post(`/rentals/requests/${requestId}/process/`, {
      action,
      reason
    });
    return response.data;
  },

  async approveRequest(requestId: number): Promise<ApiResponse<RentalRequest>> {
    return this.processRequest(requestId, 'approve');
  },

  async rejectRequest(requestId: number, reason?: string): Promise<ApiResponse<RentalRequest>> {
    return this.processRequest(requestId, 'reject', reason);
  },

  async createRental(equipmentId: number, returnDate: string, userId: number): Promise<ApiResponse<Rental>> {
    const response = await api.post('/rentals/items/', {
      equipment: equipmentId,
      user: userId,
      due_date: returnDate
    });
    return response.data;
  },

  async createRentalRequest(data: CreateRentalRequest): Promise<ApiResponse<RentalRequest>> {
    const response = await api.post('/rentals/requests/', {
      equipment: data.equipment,
      request_type: data.request_type,
      expected_return_date: data.expected_return_date,
      request_reason: data.request_reason
    });
    return response.data;
  },

  async returnEquipment(rentalId: number): Promise<ApiResponse<Rental>> {
    const response = await api.post(`/rentals/${rentalId}/return/`);
    return response.data;
  },

  async getRentals(page?: number): Promise<ApiResponse<Rental[] | PaginatedResponse<Rental>>> {
    try {
      const url = `/rentals/${page ? `?page=${page}` : ''}`;
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching rentals:', error);
      return {
        success: false,
        error: { detail: '대여 내역을 불러오는데 실패했습니다.' },
        message: '대여 내역을 불러오는데 실패했습니다.'
      };
    }
  },

  async getRentalRequests(page?: number): Promise<ApiResponse<RentalRequest[] | PaginatedResponse<RentalRequest>>> {
    try {
      const url = `/rentals/requests/${page ? `?page=${page}` : ''}`;
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching rental requests:', error);
      return {
        success: false,
        error: { detail: '대여 요청 내역을 불러오는데 실패했습니다.' },
        message: '대여 요청 내역을 불러오는데 실패했습니다.'
      };
    }
  },

  async getRental(rentalId: number): Promise<ApiResponse<Rental>> {
    const response = await api.get(`/rentals/items/${rentalId}/`);
    return response.data;
  },

  async getRentalRequest(requestId: number): Promise<ApiResponse<RentalRequest>> {
    const response = await api.get(`/rentals/requests/${requestId}/`);
    return response.data;
  },

  async exportRentals(params?: { start_date?: string; end_date?: string }): Promise<ApiResponse<void>> {
    try {
      const response = await api.get('/rentals/items/export/', { 
        params,
        responseType: 'blob'
      });

      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'rental_list.xls');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error exporting rentals:', error);
      return {
        success: false,
        error: { detail: '대여 내역 내보내기에 실패했습니다.' },
        message: '대여 내역 내보내기에 실패했습니다.'
      };
    }
  },

  async exportRequestsToExcel(): Promise<ApiResponse<void>> {
    try {
      const response = await api.get('/rentals/requests/export_excel/', {
        responseType: 'blob'
      });

      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'rental_requests.xls');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error exporting rental requests:', error);
      return {
        success: false,
        error: { detail: '대여 요청 내역 내보내기에 실패했습니다.' },
        message: '대여 요청 내역 내보내기에 실패했습니다.'
      };
    }
  },

  // 대여 요청 상태값을 한글로 변환하는 유틸리티 함수
  getRentalRequestStatusDisplay(status: RentalRequestStatus): RentalRequestStatusDisplay {
    return RENTAL_REQUEST_STATUS_DISPLAY[status];
  },

  // 대여 요청 생성
  createRentRequest: async (requestData: { 
    equipment_id: number; 
    expected_return_date: string;
    request_reason?: string;
  }) => {
    try {
      const data = {
        ...requestData,
        request_type: 'RENT'
      };
      const response = await api.post('/rentals/requests/', data);
      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      console.error('Error creating rental request:', e);
      return {
        success: false,
        error: { detail: '대여 요청 생성 중 오류가 발생했습니다.' },
        message: '대여 요청 생성 중 오류가 발생했습니다.'
      };
    }
  },

  // 반납 요청 생성
  createReturnRequest: async (requestData: { 
    equipment_id: number;
    rental_id?: number;
    request_reason?: string;
  }) => {
    try {
      const data = {
        ...requestData,
        request_type: 'RETURN'
      };
      const response = await api.post('/rentals/requests/', data);
      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      console.error('Error creating return request:', e);
      return {
        success: false,
        error: { detail: '반납 요청 생성 중 오류가 발생했습니다.' },
        message: '반납 요청 생성 중 오류가 발생했습니다.'
      };
    }
  },

  // IP 할당 내역 API
  async getUserIpAssignments(): Promise<ApiResponse<any>> {
    try {
      const url = '/ip/history/my/';  // URL 수정
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      console.error('사용자 IP 발급 내역 조회 오류:', e);
      return {
        success: false,
        error: { detail: 'IP 할당 내역을 불러오는데 실패했습니다.' },
        message: 'IP 할당 내역을 불러오는데 실패했습니다.'
      };
    }
  }
};

export default rentalService;