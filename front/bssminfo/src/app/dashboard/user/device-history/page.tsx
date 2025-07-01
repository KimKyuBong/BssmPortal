'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import adminService from '@/services/admin';
import ipService from '@/services/ip';
import { Laptop, User, Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { userService } from '@/services/userService';
import { DateInput } from '@/components/ui/StyledComponents';
import { formatDateToKorean } from '@/utils/dateUtils';

// 기기 이력 타입 정의
interface DeviceHistory {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
  };
  device_mac: string;
  device_name: string;
  action: string; // 'create', 'update', 'delete'
  timestamp: string;
  details: string;
}

// 필터 타입 정의
interface HistoryFilters {
  username: string;
  action: string;
  startDate: string;
  endDate: string;
}

// 페이지네이션 데이터 타입 정의
interface PaginatedData {
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: DeviceHistory[];
}

export default function DeviceHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<DeviceHistory[]>([]);
  const [filteredData, setFilteredData] = useState<DeviceHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{id: number, username: string}[]>([]);
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // 필터 상태
  const [filters, setFilters] = useState<HistoryFilters>({
    username: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  // 데이터 가져오기 함수
  const fetchData = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      // 현재 사용자 정보 가져오기
      const userResponse = await authService.getCurrentUser();
      
      if (!userResponse.success || !userResponse.data) {
        router.push('/login');
        return;
      }
      
      setUser(userResponse.data);
      
      // 사용자 목록 가져오기 (관리자용)
      if (userResponse.data.is_staff || userResponse.data.is_superuser) {
        const usersResponse = await adminService.getUsers();
        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data);
        }
      }
      
      // 기기 이력 데이터 가져오기 - 페이지네이션 적용
      console.log('기기 이력 요청 매개변수:', { page, pageSize });
      const historyResponse = await ipService.getMyDeviceHistory(page, pageSize);
      console.log('기기 이력 응답:', historyResponse);
      
      if (historyResponse.success && historyResponse.data) {
        const paginatedData = historyResponse.data;
        setTotalCount(paginatedData.total_count);
        setCurrentPage(paginatedData.page);
        setPageSize(paginatedData.page_size);
        setTotalPages(paginatedData.total_pages);
        
        console.log('기기 이력 데이터:', {
          totalCount: paginatedData.total_count,
          page: paginatedData.page,
          pageSize: paginatedData.page_size,
          totalPages: paginatedData.total_pages,
          resultsCount: paginatedData.results.length
        });
        
        setHistoryData(paginatedData.results);
        setFilteredData(paginatedData.results);
      } else {
        console.error('기기 이력 데이터 로드 실패:', historyResponse.error || historyResponse.message);
        setError('기기 이력 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('데이터 로딩 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로드
  useEffect(() => {
    fetchData(1);
  }, [router]);
  
  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchData(newPage);
  };
  
  // 필터 변경 핸들러
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // 필터 적용
  const applyFilters = () => {
    let result = [...historyData];
    
    if (filters.username) {
      result = result.filter(item => 
        item.user.username.toLowerCase().includes(filters.username.toLowerCase())
      );
    }
    
    if (filters.action) {
      result = result.filter(item => item.action === filters.action);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      result = result.filter(item => new Date(item.timestamp) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      // endDate에 하루를 더해 23:59:59까지 포함
      endDate.setDate(endDate.getDate() + 1);
      result = result.filter(item => new Date(item.timestamp) < endDate);
    }
    
    setFilteredData(result);
  };
  
  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      username: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    setFilteredData(historyData);
  };
  
  // 액션 이름 한글화
  const getActionName = (action: string) => {
    switch(action) {
      case 'create': return '등록';
      case 'update': return '수정';
      case 'delete': return '삭제';
      default: return action;
    }
  };
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDateToKorean(date);
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">IP 할당 내역 관리</h1>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">IP 할당 내역 관리</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* 필터 영역 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">필터 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사용자</label>
            <select
              name="username"
              value={filters.username}
              onChange={handleFilterChange}
              className="w-full border rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 사용자</option>
              {users.map(user => (
                <option key={user.id} value={user.username}>{user.username}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="w-full border rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 작업</option>
              <option value="create">등록</option>
              <option value="update">수정</option>
              <option value="delete">삭제</option>
            </select>
          </div>
          
          <div>
            <DateInput
              label="시작 날짜"
              name="startDate"
              value={filters.startDate}
              onChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
              className="w-full"
            />
          </div>
          
          <div>
            <DateInput
              label="종료 날짜"
              name="endDate"
              value={filters.endDate}
              onChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            초기화
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            필터 적용
          </button>
        </div>
      </div>
      
      {/* 이력 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기기 정보
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  세부 사항
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.user.username}</div>
                          <div className="text-sm text-gray-500">{item.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Laptop className="w-5 h-5 text-blue-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.device_name}</div>
                          <div className="text-sm text-gray-500">{item.device_mac}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.action === 'create' 
                          ? 'bg-green-100 text-green-800' 
                          : item.action === 'update' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {getActionName(item.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDate(item.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {historyData.length > 0 ? '필터 조건에 맞는 이력이 없습니다.' : '기기 이력 데이터가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 페이지네이션 추가 */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              전체 <span className="font-medium">{totalCount}</span>개 항목 중 
              <span className="font-medium"> {(currentPage - 1) * pageSize + 1}</span>-
              <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> 표시 중
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* 페이지 번호 */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // 항상 현재 페이지를 중심으로 표시
                  let pageNum;
                  if (totalPages <= 5) {
                    // 전체 페이지가 5개 이하면 모두 표시
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    // 현재 페이지가 앞쪽이면 1~5 표시
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    // 현재 페이지가 뒤쪽이면 마지막 5개 표시
                    pageNum = totalPages - 4 + i;
                  } else {
                    // 그 외에는 현재 페이지 중심으로 표시
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 