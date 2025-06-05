import { api } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Student {
  id: number;
  user: number;
  username: string;
  user_name: string;
  current_class: number;
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
  getStudentsByClass: async (classId: number, page: number = 1) => {
    const response = await api.get(`/users/students/?class=${classId}&page=${page}`);
    return response.data;
  },

  // 학반 목록 조회
  getClasses: async () => {
    const response = await api.get('/users/classes/');
    return response.data;
  },

  // 학생 학반 변경
  changeStudentClass: async (studentId: number, classId: number) => {
    const response = await api.post(`/users/students/${studentId}/change-class/`, {
      class_id: classId
    });
    return response.data;
  }
}; 