/**
 * 인증 서비스
 * 로그인, 로그아웃 등 인증 관련 기능을 제공하는 서비스
 */

import { ApiResponse } from './api';
import api from './api';

/**
 * 사용자 타입 정의
 */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_image?: string;
  is_superuser: boolean;
  is_staff: boolean;
  date_joined: string;
  student_id?: string;
  grade?: number;
  classroom?: number;
  number?: number;
  is_initial_password?: boolean; // 초기 비밀번호 여부
}

/**
 * API 응답 타입
 */
export interface AuthResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  status?: number;
}

/**
 * 로그인 요청 타입
 */
interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 인증 관련 서비스 함수들
 */
const authService = {
  /**
   * 로그인 함수
   * @param credentials 로그인 요청 데이터
   * @returns 로그인 결과
   */
  async login(credentials: LoginRequest): Promise<AuthResponse<User>> {
    try {
      const response = await api.post<any>('/auth/login/', credentials);
      
      // 토큰 저장 로직 추가
      if (response.success && response.data) {
        if (response.data.access) {
          localStorage.setItem('access_token', response.data.access);
          console.log('액세스 토큰 저장 완료');
        }
        
        if (response.data.refresh) {
          localStorage.setItem('refresh_token', response.data.refresh);
          console.log('리프레시 토큰 저장 완료');
        }
      }
      
      return {
        success: response.success,
        data: response.data,
        status: 200,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '로그인에 실패했습니다.',
        status: error.status,
      };
    }
  },

  /**
   * 로그아웃 함수
   * @returns 로그아웃 결과
   */
  async logout(): Promise<AuthResponse<null>> {
    try {
      const response = await api.post<null>('/auth/logout/');
      return {
        success: response.success,
        status: 200,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '로그아웃에 실패했습니다.',
        status: error.status,
      };
    }
  },

  /**
   * 현재 로그인된 사용자 정보 가져오기
   * @returns 사용자 정보
   */
  async getCurrentUser(): Promise<AuthResponse<User>> {
    try {
      const response = await api.get<User>('/users/me/');
      return {
        success: response.success,
        data: response.data,
        status: 200,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '사용자 정보를 가져오는데 실패했습니다.',
        status: error.status,
      };
    }
  },

  /**
   * 비밀번호 변경
   * @param oldPassword 현재 비밀번호
   * @param newPassword 새 비밀번호
   * @returns 비밀번호 변경 결과
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    return api.post('/users/password/change/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  /**
   * 초기 비밀번호 변경
   * @param newPassword 새 비밀번호
   * @returns 비밀번호 변경 결과
   */
  changeInitialPassword: async (newPassword: string) => {
    console.log('초기 비밀번호 변경 요청 시작', { passwordLength: newPassword.length });
    
    try {
      // 요청 데이터 명확하게 설정
      const requestData = {
        new_password: newPassword
      };
      
      console.log('요청 메서드:', 'POST');
      console.log('요청 데이터 구조:', Object.keys(requestData));
      
      // POST 메서드 사용
      const response = await api.post('/users/password/initial/', requestData);
      
      return response;
    } catch (error: any) {
      console.error('초기 비밀번호 변경 예외 발생:', error);
      
      // 오류 응답 로깅 및 처리
      return {
        success: false,
        message: error.message || '초기 비밀번호 변경 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 토큰 갱신
   * @returns 새 액세스 토큰
   */
  refreshToken: async (): Promise<AuthResponse<{ access: string }>> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        return {
          success: false,
          message: '갱신 토큰이 없습니다.'
        };
      }
      
      const response = await api.post<{access: string}>('/auth/refresh/', {
        refresh: refreshToken
      });
      
      if (response.success && response.data?.access) {
        localStorage.setItem('access_token', response.data.access);
        return {
          success: true,
          data: { access: response.data.access }
        };
      }
      
      return {
        success: false,
        message: response.message || '토큰 갱신에 실패했습니다.'
      };
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      return {
        success: false,
        message: error.message || '토큰 갱신 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 토큰 검증
   * @param token 검증할 토큰
   * @returns 검증 결과
   */
  verifyToken: async (token: string) => {
    try {
      if (!token) {
        return {
          success: false,
          message: '토큰이 없습니다.'
        };
      }
      
      const response = await api.post('/auth/token/verify/', {
        token
      });
      
      return {
        success: response.success,
        data: response.success
      };
    } catch (error: any) {
      console.error('Error verifying token:', error);
      return {
        success: false,
        message: error.message || '토큰 검증 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * 초기 비밀번호 상태 확인
   * @returns 초기 비밀번호 상태
   */
  checkInitialPasswordStatus: async (): Promise<{ is_initial_password: boolean }> => {
    try {
      // 실제 응답은 {"success":true,"data":{"is_initial_password":true}} 형태
      interface InitialPasswordStatus {
        is_initial_password: boolean;
      }
      
      const response = await api.get<InitialPasswordStatus>('/users/password/initial/');
      console.log('초기 비밀번호 상태 응답:', response);
      
      // 중첩된 data 객체에서 is_initial_password 추출
      if (response && response.success && response.data) {
        return { is_initial_password: response.data.is_initial_password || false };
      }
      
      console.warn('초기 비밀번호 상태 응답 구조 확인 필요:', response);
      return { is_initial_password: false };
    } catch (error) {
      console.error('초기 비밀번호 상태 확인 실패:', error);
      return { is_initial_password: false };
    }
  },
};

export default authService; 