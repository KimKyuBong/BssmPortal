import { api } from './api';
import { User as AdminUser } from './admin';

export interface User {
  id: number;
  username: string;
  email: string | null;
  is_staff: boolean;
  is_active: boolean;
  created_at: string;
  device_limit: number;
  last_name: string | null;
  is_superuser: boolean;
  is_initial_password: boolean;
  ip_count: number;
  rental_count: number;
}

export interface Student {
  id: number;
  user: number;
  username: string;
  user_name: string;
  current_class: number;
  device_limit: number;
}

export interface Class {
  id: number;
  grade: number;
  class_number: number;
}

export const userService = {
  // 교사 목록 조회
  getTeachers: async () => {
    const response = await api.get('/users/users/?is_staff=true');
    return response.data;
  },

  // 학생 목록 조회 (전체)
  getStudents: async () => {
    const response = await api.get('/users/students/');
    return response.data;
  },

  // 학반별 학생 목록 조회
  getStudentsByClass: async (classId: number, page: number = 1, pageSize: number = 100) => {
    const response = await api.get(`/users/students/?class=${classId}&page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  // 학반 목록 조회
  getClasses: async () => {
    const response = await api.get('/users/classes/');
    return response.data;
  },

  // 학생 학반 변경
  changeStudentClass: async (studentId: number, classId: number) => {
    const response = await api.post(`/students/${studentId}/change_class/`, { class_id: classId });
    return response.data;
  },

  deleteUser: async (userId: number) => {
    const response = await api.delete(`/users/${userId}/`);
    return response.data;
  },

  // 장치 제한 수정
  updateDeviceLimit: async (userId: number, deviceLimit: number) => {
    const response = await api.patch(`/users/${userId}/`, { device_limit: deviceLimit });
    return response.data;
  },

  updateUser: async (userId: number, userData: Partial<User>): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.patch(`/admin/users/${userId}/`, userData);
      return { success: true, message: '사용자 정보가 성공적으로 수정되었습니다.' };
    } catch (error: any) {
      console.error('사용자 정보 수정 실패:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || '사용자 정보 수정 중 오류가 발생했습니다.' 
      };
    }
  }
}; 