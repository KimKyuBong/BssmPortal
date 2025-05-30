/**
 * 관리자 서비스
 * 관리자 기능을 제공하는 서비스
 */

import api, { 
  ApiResponse,
  SimpleUser 
} from './api';
import { Device } from './ip';

/**
 * 기기 이력 데이터 타입
 */
export interface DeviceHistory {
  id: number;
  user: {
    id: number;
    username: string;
    email: string | null;
    is_staff: boolean;
  };
  username: string;
  device_mac: string;
  device_name: string;
  action: string;
  timestamp: string;
  details: string;
}

/**
 * 사용자 정보 타입
 */
export interface User {
  id: number;
  username: string;
  email: string | null;
  last_name: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  is_initial_password: boolean;
  created_at: string;
  is_active: boolean;
  message?: string; // 서버에서 반환하는 메시지
}

/**
 * 사용자 생성 요청 타입
 */
export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  last_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

/**
 * 교사별 장치 데이터 응답 타입
 */
export interface TeacherDevicesData {
  [teacherName: string]: Device[];
}

/**
 * 엑셀 가져오기 응답 타입
 */
export interface ImportUsersResponse {
  success: boolean;
  created_users: string[];
  errors: Array<{
    row: number;
    username: string;
    errors: string | Record<string, string>;
  }>;
  total_created: number;
  total_errors: number;
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * IP 할당 내역 관리자 인터페이스 추가
 */
export interface AdminIpAssignment {
  id: number;
  user: {
    id: number;
    username: string;
    email?: string | null;
    last_name?: string;
  };
  ip_address: string;
  mac_address: string;
  device_name: string;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  action?: string; // 기록된 작업 (create, update, delete)
  details?: string; // 변경 상세 내용
}

/**
 * IP 블랙리스트 응답 타입
 */
export interface BlacklistedIPResponse {
  count: number;
  blacklisted_ips: string[];
}

/**
 * 관리자 서비스
 */
const adminService = {
  /**
   * 모든 사용자 목록 조회
   * @param page 페이지 번호
   * @param search 검색어 (선택)
   * @returns 페이지네이션된 사용자 목록
   */
  getAllUsers: async (page: number = 1, search?: string): Promise<PaginatedResponse<User>> => {
    let url = `/admin/users/?page=${page}`;
    
    // 검색어가 있는 경우 URL에 추가
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    try {
      const response = await api.get<PaginatedResponse<User>>(url);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        console.error('사용자 목록 조회 실패:', response.error);
        // 에러 시에도 빈 PaginatedResponse 객체 반환
        return { count: 0, next: null, previous: null, results: [] };
      }
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      // 에러 시에도 빈 PaginatedResponse 객체 반환
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  /**
   * 페이지네이션 URL로 사용자 목록 조회
   * @param url 페이지네이션 URL
   * @returns 페이지네이션된 사용자 데이터
   */
  getUsersWithUrl: async (url: string): Promise<PaginatedResponse<User>> => {
    try {
      // 상대 URL 경로 추출 (http://localhost:55693/api/admin/users/?page=2 -> /admin/users?page=2)
      const urlObj = new URL(url);
      // api.ts에서 슬래시 처리를 하므로 여기서는 원본 경로 사용
      const relativePath = urlObj.pathname + urlObj.search;
      
      console.log('페이지네이션 URL로 사용자 가져오기:', relativePath);
      const response = await api.get<PaginatedResponse<User>>(relativePath);
      
      if (response.success && response.data) {
        if ('count' in response.data) {
          console.log('페이지네이션 응답:', {
            count: response.data.count,
            next: response.data.next,
            previous: response.data.previous
          });
        }
        return response.data;
      } else {
        console.error('페이지네이션 URL로 사용자 가져오기 실패:', response.error);
        // 에러 시에도 빈 PaginatedResponse 객체 반환
        return { count: 0, next: null, previous: null, results: [] };
      }
    } catch (error) {
      console.error('Get users with URL error:', error);
      // 에러 시에도 빈 PaginatedResponse 객체 반환
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  /**
   * 사용자 상세 정보 조회
   * @param id 사용자 ID
   * @returns 사용자 상세 정보
   */
  getUser: async (id: number) => {
    return api.get<User>(`/admin/users/${id}/`);
  },

  /**
   * 사용자 생성
   * @param data 사용자 생성 데이터
   * @returns 생성된 사용자 정보
   */
  createUser: async (data: CreateUserRequest) => {
    return api.post<User>('/admin/users/', data);
  },

  /**
   * 사용자 정보 수정
   * @param id 사용자 ID
   * @param data 수정할 사용자 데이터
   * @returns 수정된 사용자 정보
   */
  updateUser: async (id: number, data: Partial<CreateUserRequest>) => {
    return api.put<User>(`/admin/users/${id}/`, data);
  },

  /**
   * 사용자 삭제
   * @param id 사용자 ID
   * @returns 삭제 결과
   */
  deleteUser: async (id: number) => {
    console.log(`사용자 삭제 요청 시작: ID ${id}`);
    try {
      const response = await api.delete(`/admin/users/${id}`);
      console.log(`사용자 삭제 응답 (ID ${id}):`, response);
      return response;
    } catch (error) {
      console.error(`사용자 삭제 중 예외 발생 (ID ${id}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 사용자 비밀번호 초기화
   * @param id 사용자 ID
   * @returns 초기화 결과
   */
  resetUserPassword: async (id: number) => {
    return api.post(`/admin/users/${id}/reset-password/`, {});
  },

  /**
   * 사용자 목록 엑셀 파일로 내보내기
   * @returns 엑셀 파일 데이터 또는 에러 객체
   */
  exportUsersToExcel: async () => {
    try {
      console.log('엑셀 내보내기 요청 시작');
      
      // 정확한 URL 사용: backend urls.py에서 확인한 경로
      // admin_router에 등록된 엔드포인트는 /admin/ 아래에 있음
      const response = await api.get('/admin/users/export/', {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*'
        }
      });
      
      console.log('API 응답:', response);
      
      if (response.success && response.data) {
        console.log('엑셀 내보내기 성공:', typeof response.data, response.data instanceof Blob);
        return response.data;
      } else {
        console.error('엑셀 내보내기 실패:', response.error);
        return {
          success: false,
          error: response.error || '사용자 목록 내보내기에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('Export users error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 목록 내보내기 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 엑셀 파일로부터 사용자 일괄 가져오기
   * @param file 엑셀 파일
   * @returns 가져오기 결과
   */
  importUsersFromExcel: async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return {
        success: false,
        error: { detail: '엑셀 파일(.xlsx 또는 .xls)만 업로드할 수 있습니다.' }
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      return await api.post<{
        total_created: number;
        total_errors: number;
        created_users: string[];
        errors: Array<{
          row: number;
          errors: string | Record<string, string>;
        }>;
      }>('/admin/users/import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('엑셀 파일 업로드 중 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 사용자 일괄 추가
   * @param file Excel 파일
   * @returns 추가 결과
   */
  importUsers: async (file: File) => {
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);
      
      // 요청 설정 - 멀티파트 폼 데이터
      const requestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      try {
        // 파일 업로드 요청
        const response = await api.post<ImportUsersResponse>(
          '/admin/users/import_users/', 
          formData,
          requestConfig
        );
        
        // 응답 처리 및 반환
        if (response.success) {
          console.log('업로드 성공:', response.data);
          return {
            success: true,
            data: response.data
          };
        } else {
          console.error('업로드 실패:', response.error);
          return {
            success: false,
            error: response.error || '사용자 일괄 추가 중 오류가 발생했습니다.'
          };
        }
      } catch (e) {
        console.error('엑셀 파일 업로드 중 예외 발생:', e);
        return {
          success: false,
          error: e instanceof Error ? `파일 업로드 오류: ${e.message}` : '파일 업로드 중 알 수 없는 오류가 발생했습니다.'
        };
      }
    } catch (error) {
      console.error('사용자 일괄 추가 중 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 일괄 추가 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 교사별 장치 데이터 조회
   * @returns 교사별 장치 데이터
   */
  getDevicesByTeacher: async () => {
    return api.get<TeacherDevicesData>('/admin/devices/by-teacher/');
  },

  /**
   * 사용자 등록 템플릿 파일 생성
   * @param count 생성할 사용자 수 (기본값: 3)
   * @returns 엑셀 파일 Blob 객체
   */
  getUserImportTemplate: (count: number = 3) => {
    // XLSX 모듈 동적 임포트
    return import('xlsx').then(XLSX => {
      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      
      // 임시 비밀번호 생성 함수
      const generateTempPassword = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      
      // 예시 데이터 생성 (사용자가 요청한 수만큼)
      const data = [];
      
      // 다양한 사용자 유형의 예시 추가
      const roles = [
        { role: '교사', roleEN: 'teacher' },
        { role: '관리자', roleEN: 'admin' },
        { role: '학생', roleEN: 'student' }
      ];
      
      // 요청한 수만큼 데이터 생성
      for (let i = 0; i < count; i++) {
        const roleIndex = i % roles.length;
        const role = roles[roleIndex];
        const num = Math.floor(i / roles.length) + 1;
        
        // 문자열로 확실하게 사용
        data.push({
          '아이디': `25_${String(i+1).padStart(2, '0')}`,
          '비밀번호': generateTempPassword(),
          '이메일': `25_${String(i+1).padStart(2, '0')}@bssm.hs.kr`,
          '이름': `${['김', '이', '박', '최', '정'][i % 5]}${['가영', '나래', '다민', '라온', '마음'][i % 5]}`,
          '역할': role.role
        });
      }
      
      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // 열 너비 설정
      const colWidths = [
        { wch: 15 }, // 아이디
        { wch: 15 }, // 비밀번호
        { wch: 25 }, // 이메일
        { wch: 15 }, // 이름
        { wch: 10 }  // 역할
      ];
      
      worksheet['!cols'] = colWidths;
      
      // 워크북에 워크시트 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, '사용자 등록 예시');
      
      // 추가 설명 워크시트 생성
      const instructionData = [
        { '필드': '아이디', '설명': '사용자 로그인 ID (필수)', '예시': '25_01, 25_02, 25_03' },
        { '필드': '비밀번호', '설명': '초기 비밀번호 (필수, 자동생성된 8자리)', '예시': 'Rta4b9xZ' },
        { '필드': '이메일', '설명': '사용자 이메일 (선택)', '예시': '25_01@bssm.hs.kr' },
        { '필드': '이름', '설명': '사용자 실명 (선택)', '예시': '김가영, 이나래' },
        { '필드': '역할', '설명': '사용자 역할 (필수) - 교사, 관리자, 학생 중 하나', '예시': '교사, 관리자, 학생' }
      ];
      
      const instructionSheet = XLSX.utils.json_to_sheet(instructionData);
      
      // 열 너비 설정
      const instructionColWidths = [
        { wch: 15 }, // 필드
        { wch: 30 }, // 설명
        { wch: 30 }  // 예시
      ];
      
      instructionSheet['!cols'] = instructionColWidths;
      
      // 워크북에 설명 워크시트 추가
      XLSX.utils.book_append_sheet(workbook, instructionSheet, '작성 가이드');
      
      // 엑셀 파일 생성 및 Blob 반환
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      return new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
    });
  },

  /**
   * 기기 이력 데이터 조회
   * @returns 기기 이력 데이터
   */
  getDeviceHistory: async () => {
    return api.get<DeviceHistory[]>('/admin/devices/history/');
  },

  /**
   * 전체 사용자 목록 간단 조회
   * @returns 사용자 목록
   */
  getUsers: async () => {
    return api.get<SimpleUser[]>('/admin/users/simple/');
  },

  /**
   * 모든 IP 할당 이력 가져오기
   * @param page 페이지 번호
   * @param search 검색어
   * @returns IP 할당 이력 목록
   */
  getAllIpAssignments: async (page?: number, search?: string): Promise<ApiResponse<any>> => {
    try {
      let url = '/admin/ip/history/';
      
      // 쿼리 파라미터 추가
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (search) params.append('search', search);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      console.log('모든 IP 할당 이력 가져오기 요청 URL:', url);
      const response = await api.get(url);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('IP 할당 이력 조회 오류:', error);
      return {
        success: false,
        message: '이력 데이터를 가져오는 데 실패했습니다.'
      };
    }
  },

  /**
   * IP 할당 내역 생성
   * @param data 생성할 IP 할당 내역 데이터
   * @returns 생성된 IP 할당 내역
   */
  createIpAssignment: async (data: {
    user_id: number;
    ip_address: string;
    mac_address: string;
    device_name: string;
    expires_at?: string;
  }): Promise<ApiResponse<AdminIpAssignment>> => {
    try {
      // 백엔드 API 구조에 맞게 URL 수정 - 장치 수동 등록 엔드포인트 사용
      const url = '/devices/register-manual/';
      
      // 요청 데이터 구조 변환
      const requestData = {
        user_id: data.user_id,
        mac_address: data.mac_address,
        device_name: data.device_name,
        // IP 주소는 선택적
        assigned_ip: data.ip_address || undefined
      };
      
      const response = await api.post(url, requestData);
      
      // 응답 데이터를 AdminIpAssignment 형식으로 변환
      if (response.success && response.data) {
        const device = response.data as any;
        const formattedData: AdminIpAssignment = {
          id: device.id,
          user: {
            id: device.user.id,
            username: device.username,
            email: undefined, // 데이터에 없음
            last_name: undefined // 데이터에 없음
          },
          ip_address: device.assigned_ip || '',
          mac_address: device.mac_address,
          device_name: device.device_name,
          assigned_at: device.created_at,
          expires_at: null, // 만료일 정보 없음
          is_active: device.is_active,
          created_at: device.created_at,
          updated_at: device.last_access
        };
        
        return {
          success: true,
          data: formattedData,
          message: 'IP 할당이 성공적으로 등록되었습니다.'
        };
      }
      
      return {
        ...response,
        message: response.message || 'IP 할당이 등록되었습니다.'
      } as ApiResponse<AdminIpAssignment>;
    } catch (error) {
      console.error('IP 할당 내역 생성 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: '오류가 발생했습니다. 다시 시도해 주세요.' },
        message: '오류가 발생했습니다. 다시 시도해 주세요.'
      };
    }
  },

  /**
   * IP 할당 내역 수정
   * @param id IP 할당 내역 ID
   * @param data 수정할 IP 할당 내역 데이터
   * @returns 수정된 IP 할당 내역
   */
  updateIpAssignment: async (
    id: number,
    data: {
      ip_address?: string;
      mac_address?: string;
      device_name?: string;
      is_active?: boolean;
      expires_at?: string | null;
    }
  ): Promise<ApiResponse<AdminIpAssignment>> => {
    try {
      // IP 재할당이 필요한 경우
      if (data.ip_address) {
        const reassignUrl = `/devices/${id}/reassign-ip/`;
        await api.post(reassignUrl, { new_ip: data.ip_address });
      }
      
      // 활성 상태 변경이 필요한 경우
      if (data.is_active !== undefined) {
        const toggleUrl = `/devices/${id}/toggle-active/`;
        await api.post(toggleUrl);
      }
      
      // 기타 정보 업데이트
      let updateNeeded = false;
      const updateData: any = {};
      
      if (data.device_name) {
        updateData.device_name = data.device_name;
        updateNeeded = true;
      }
      
      if (data.mac_address) {
        updateData.mac_address = data.mac_address;
        updateNeeded = true;
      }
      
      // 업데이트가 필요한 경우에만 PATCH 요청 수행
      let response;
      if (updateNeeded) {
        const url = `/devices/${id}`;
        response = await api.patch(url, updateData);
      } else {
        // 최신 정보를 가져오는 GET 요청
        const url = `/devices/${id}`;
        response = await api.get(url);
      }
      
      // 응답 데이터를 AdminIpAssignment 형식으로 변환
      if (response.success && response.data) {
        const device = response.data as any;
        const formattedData: AdminIpAssignment = {
          id: device.id,
          user: {
            id: device.user.id,
            username: device.username,
            email: undefined, // 데이터에 없음
            last_name: undefined // 데이터에 없음
          },
          ip_address: device.assigned_ip || '',
          mac_address: device.mac_address,
          device_name: device.device_name,
          assigned_at: device.created_at,
          expires_at: null, // 만료일 정보 없음
          is_active: device.is_active,
          created_at: device.created_at,
          updated_at: device.last_access
        };
        
        return {
          success: true,
          data: formattedData
        };
      }
      
      return response as ApiResponse<AdminIpAssignment>;
    } catch (error) {
      console.error('IP 할당 내역 수정 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: '오류가 발생했습니다. 다시 시도해 주세요.' },
        message: '오류가 발생했습니다. 다시 시도해 주세요.'
      };
    }
  },

  /**
   * IP 할당 내역 삭제
   * @param id IP 할당 내역 ID
   * @returns 삭제 결과
   */
  deleteIpAssignment: async (id: number): Promise<ApiResponse<null>> => {
    try {
      // 백엔드 API 구조에 맞게 URL 수정 - 장치 삭제 엔드포인트 사용
      const url = `/devices/${id}/`;
      const response = await api.delete<null>(url);
      
      return {
        ...response,
        message: 'IP 할당이 성공적으로 삭제되었습니다.'
      };
    } catch (error) {
      console.error('IP 할당 내역 삭제 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: 'IP 할당 삭제 중 오류가 발생했습니다. 다시 시도해 주세요.' },
        message: 'IP 할당 삭제 중 오류가 발생했습니다. 다시 시도해 주세요.'
      };
    }
  },

  /**
   * 블랙리스트된 IP 목록 조회
   * @returns 블랙리스트된 IP 목록
   */
  getBlacklistedIPs: async (): Promise<ApiResponse<BlacklistedIPResponse>> => {
    try {
      const url = '/devices/blacklisted_ips/';
      const response = await api.get<BlacklistedIPResponse>(url);
      
      return response;
    } catch (error) {
      console.error('블랙리스트된 IP 목록 조회 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: '블랙리스트된 IP 목록을 조회하는 중 오류가 발생했습니다.' },
        message: '블랙리스트된 IP 목록을 조회하는 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * IP 주소를 블랙리스트에 추가
   * @param ipAddress 블랙리스트에 추가할 IP 주소
   * @returns 처리 결과
   */
  blacklistIP: async (ipAddress: string): Promise<ApiResponse<any>> => {
    try {
      const url = '/devices/blacklist_ip/';
      const response = await api.post(url, { ip_address: ipAddress });
      
      return {
        ...response,
        message: response.message || 'IP 주소가 블랙리스트에 추가되었습니다.'
      };
    } catch (error) {
      console.error('IP 블랙리스트 추가 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: 'IP 주소를 블랙리스트에 추가하는 중 오류가 발생했습니다.' },
        message: 'IP 주소를 블랙리스트에 추가하는 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * IP 주소를 블랙리스트에서 제거
   * @param ipAddress 블랙리스트에서 제거할 IP 주소
   * @returns 처리 결과
   */
  unblacklistIP: async (ipAddress: string): Promise<ApiResponse<any>> => {
    try {
      const url = '/devices/unblacklist_ip/';
      const response = await api.post(url, { ip_address: ipAddress });
      
      return {
        ...response,
        message: response.message || 'IP 주소가 블랙리스트에서 제거되었습니다.'
      };
    } catch (error) {
      console.error('IP 블랙리스트 제거 중 오류 발생:', error);
      return {
        success: false,
        error: { detail: 'IP 주소를 블랙리스트에서 제거하는 중 오류가 발생했습니다.' },
        message: 'IP 주소를 블랙리스트에서 제거하는 중 오류가 발생했습니다.'
      };
    }
  },

  getAllDevices: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/admin/ip/all/');  // URL 수정
      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      console.error('장치 목록 조회 오류:', e);
      return {
        success: false,
        error: { detail: '장치 목록을 불러오는데 실패했습니다.' },
        message: '장치 목록을 불러오는데 실패했습니다.'
      };
    }
  },
};

export default adminService; 