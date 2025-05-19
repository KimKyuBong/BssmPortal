/**
 * API 클라이언트
 * 백엔드 API와의 통신을 담당하는 서비스
 */

import axios, { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';

// API 기본 URL - '/api' 접두어 추가
// 개발/배포 모드 전환 설정
// 개발 모드: 환경 변수에서 URL 가져오기 (localhost 사용 시)
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// 배포 모드: 항상 '/api' 경로 사용 (Nginx 프록시 설정과 함께 사용)
const API_BASE_URL = '/api';

// 디버깅용 로깅 함수
const logApiCall = (method: string, url: string, data?: any) => {
  console.log(`API ${method} 요청: ${url}`);
  if (data && method !== 'GET') {
    console.log('요청 데이터:', JSON.stringify(data, null, 2));
  }
};

// CSRF 토큰 가져오기 함수
const getCSRFToken = (): string | null => {
  // Django가 설정한 csrftoken 쿠키에서 토큰 가져오기
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
};

// axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // 리다이렉션 제한 제거 - Nginx가 올바르게 프록시하므로 필요 없음
});

// URL이 슬래시로 시작하는지 확인하는 함수
const ensureLeadingSlash = (url: string): string => {
  return url.startsWith('/') ? url : `/${url}`;
};

// URL 정규화 함수 - Django URL 요구사항에 맞게 수정
const normalizeUrl = (url: string): string => {
  // 시작 슬래시 확인
  url = ensureLeadingSlash(url);
  
  // 쿼리스트링이 있는 경우
  if (url.includes('?')) {
    const [path, query] = url.split('?');
    // 끝 슬래시 추가 기능 제거
    return `${path}?${query}`;
  }
  
  // 끝 슬래시 추가 기능 제거
  return url;
};

/**
 * API 응답 인터페이스
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | { detail: string };
  message?: string;
}

/**
 * 간소화된 사용자 정보 인터페이스
 * 민감한 개인정보가 노출되지 않도록 필요한 정보만 포함
 */
export interface SimpleUser {
  id: number;
  username: string;
  name: string;
  grade: number;
  class: number;
  number: number;
}

// 대여 요청 상태값 정의
export const RENTAL_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

export type RentalRequestStatus = keyof typeof RENTAL_REQUEST_STATUS;

/**
 * 에러 핸들링 함수
 * @param error axios 에러
 * @returns API 응답
 */
const handleApiError = <T>(error: AxiosError): ApiResponse<T> => {
  console.error('API 오류:', error);
  
  // 서버에서 보낸 오류 메시지가 있는 경우
  if (error.response) {
    const data = error.response.data as any;
    
    // 백엔드에서 정의한 오류 메시지 형식 처리
    if (data.detail) {
      return {
        success: false,
        message: typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail,
        data: data.detail as T
      };
    }
    
    // 일반적인 에러 응답 처리
    return {
      success: false,
      message: data.message || '요청을 처리하는 동안 오류가 발생했습니다.',
      data: data as T
    };
  } 
  
  // 네트워크 오류 처리
  return {
    success: false,
    message: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.',
    data: error.message as T
  };
};

// 요청 인터셉터 추가 - 토큰을 요청 헤더에 추가
axiosInstance.interceptors.request.use(
  (config) => {
    // GET 요청이 아닌 경우에만 CSRF 토큰 추가
    if (config.method !== 'get') {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    
    // URL 정규화 - Django URL 요구사항에 맞게 수정
    if (config.url) {
      const originalUrl = config.url;
      config.url = normalizeUrl(config.url);
      console.log(`URL 정규화: ${originalUrl} → ${config.url}`);
    }
    
    // 요청 URL 로깅
    logApiCall(config.method?.toUpperCase() || 'UNKNOWN', config.url || '', config.data);
    
    const accessToken = localStorage.getItem('access_token');
    
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    console.log('요청 헤더:', JSON.stringify(config.headers, null, 2));
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 추가
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`응답 상태 코드: ${response.status}`);
    return response;
  },
  async (error) => {
    // 오류 로깅 - 간소화됨
    if (error.response) {
      console.error(`API 오류 상태 코드: ${error.response.status}`);
    }
    
    const originalRequest = error.config;
    
    // 401 에러이고, 토큰 갱신 시도를 아직 하지 않았으며, 로그인 요청이 아닌 경우
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/api/auth/login/')) {
      
      originalRequest._retry = true;
      
      try {
        // 토큰 갱신 시도
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        // 직접 axios.post 대신 axiosInstance를 사용
        const refreshResponse = await axiosInstance({
          method: 'post',
          url: '/api/auth/refresh/',
          data: { refresh: refreshToken }
        });
        
        if (refreshResponse.data?.access) {
          // 새 액세스 토큰 저장
          localStorage.setItem('access_token', refreshResponse.data.access);
          
          // 헤더 업데이트
          originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.access}`;
          
          // 원래 요청 재시도
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('토큰 갱신 실패:', refreshError);
        // 토큰 갱신 실패 시 로그인 페이지로 이동
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          
          // 현재 로그인 페이지에 있는지 확인
          const isLoginPage = window.location.pathname.includes('/login');
          
          // 로그인 페이지가 아닐 때만 리디렉션
          if (!isLoginPage) {
            window.location.href = '/login/';
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API 클라이언트 객체
export const api = {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const normalizedUrl = normalizeUrl(url);
      logApiCall('GET', normalizedUrl);
      const response = await axiosInstance.get<T>(normalizedUrl, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError<T>(error as AxiosError);
    }
  },

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const normalizedUrl = normalizeUrl(url);
      logApiCall('POST', normalizedUrl, data);
      const response = await axiosInstance.post<T>(normalizedUrl, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError<T>(error as AxiosError);
    }
  },

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const normalizedUrl = normalizeUrl(url);
      logApiCall('PUT', normalizedUrl, data);
      const response = await axiosInstance.put<T>(normalizedUrl, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError<T>(error as AxiosError);
    }
  },

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const normalizedUrl = normalizeUrl(url);
      logApiCall('DELETE', normalizedUrl);
      const response = await axiosInstance.delete<T>(normalizedUrl, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError<T>(error as AxiosError);
    }
  },

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const normalizedUrl = normalizeUrl(url);
      logApiCall('PATCH', normalizedUrl, data);
      const response = await axiosInstance.patch<T>(normalizedUrl, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError<T>(error as AxiosError);
    }
  }
};

// 장비 유형
export interface Equipment {
  id: number;
  name: string;
  manufacturer: string;
  model_name: string | null;
  equipment_type: string;
  equipment_type_display: string;
  serial_number: string;
  description: string | null;
  image: string | null;
  acquisition_date: string;
  manufacture_year?: number;
  purchase_date?: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'DISPOSED' | 'LOST' | 'DAMAGED';
  status_display: string;
  created_at: string;
  mac_addresses: Array<{
    mac_address: string;
    is_primary: boolean;
  }>;
  rental?: {
    user: {
      username: string;
      name: string;
    };
  } | null;
}

// 대여 상태값 정의
export const RENTAL_STATUS = {
  RENTED: 'RENTED',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE'
} as const;

export const RENTAL_STATUS_DISPLAY = {
  [RENTAL_STATUS.RENTED]: '대여중',
  [RENTAL_STATUS.RETURNED]: '반납완료',
  [RENTAL_STATUS.OVERDUE]: '연체중'
} as const;

export type RentalStatus = keyof typeof RENTAL_STATUS;
export type RentalStatusDisplay = typeof RENTAL_STATUS_DISPLAY[RentalStatus];

// 대여 정보
export interface Rental {
  id: number;
  equipment: Equipment;
  user: SimpleUser;
  rental_date: string;
  due_date: string;
  return_date: string | null;
  expected_return_date: string;
  actual_return_date: string | null;
  status: 'RENTED' | 'RETURNED' | 'OVERDUE';
  status_display: string;
  notes?: string;
}

// IP 할당 내역 인터페이스 추가
export interface IpAssignment {
  id: number;
  user: SimpleUser;
  ip_address: string;
  mac_address: string;
  device_name: string;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 대여/반납 요청
export interface RentalRequest {
  id: number;
  user: SimpleUser;
  equipment: number;
  equipment_detail?: Equipment;
  request_type: 'RENT' | 'RETURN';
  request_type_display: string;
  status: RentalRequestStatus;
  status_display: string;
  requested_date: string;
  expected_return_date?: string;
  request_reason?: string;
  reject_reason?: string;
  processed_by?: SimpleUser;
  processed_at?: string;
  created_at: string;
  rental?: Rental | null;
}

// 대여 요청 생성 인터페이스
export interface CreateRentalRequest {
  equipment: number;  // 장비 ID
  request_type: 'RENT' | 'RETURN';
  expected_return_date?: string | null;
  request_reason?: string | null;
}

// 기본 API 요청 함수 export
export default api; 