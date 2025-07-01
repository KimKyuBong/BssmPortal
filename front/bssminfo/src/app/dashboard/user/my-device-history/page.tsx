'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import ipService from '@/services/ip';
import { Laptop, User, Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { userService } from '@/services/userService';
import { DateInput } from '@/components/ui/StyledComponents';
import { formatDateToKorean } from '@/utils/dateUtils';

// 기기 이력 타입 정의
interface DeviceHistory {
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
  action: string; // 'create', 'update', 'delete'
  timestamp: string;
  details: string;
}

// 필터 타입 정의
interface HistoryFilters {
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

export default function MyDeviceHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<DeviceHistory[]>([]);
  const [filteredData, setFilteredData] = useState<DeviceHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // 필터 상태
  const [filters, setFilters] = useState<HistoryFilters>({
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
      
      // 내 기기 이력 데이터 가져오기 - 페이지네이션 적용
      console.log('내 기기 이력 요청 매개변수:', { page, pageSize });
      const historyResponse = await ipService.getMyDeviceHistory(page, pageSize);
      console.log('내 기기 이력 응답:', historyResponse);
      
      if (historyResponse.success && historyResponse.data) {
        const paginatedData = historyResponse.data;
        setTotalCount(paginatedData.total_count);
        setCurrentPage(paginatedData.page);
        setPageSize(paginatedData.page_size);
        setTotalPages(paginatedData.total_pages);
        
        console.log('내 기기 이력 데이터:', {
          totalCount: paginatedData.total_count,
          page: paginatedData.page,
          pageSize: paginatedData.page_size,
          totalPages: paginatedData.total_pages,
          resultsCount: paginatedData.results.length
        });
        
        setHistoryData(paginatedData.results);
        setFilteredData(paginatedData.results);
      } else {
        console.error('내 기기 이력 데이터 로드 실패:', historyResponse.error || historyResponse.message);
        setError('내 기기 이력 데이터를 불러올 수 없습니다.');
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
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/dashboard/user')}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <h1 className="text-2xl font-bold text-primary">내 IP 할당 내역</h1>
          </div>
        </div>
        
        {error && (
          <div className="card mb-6">
            <div className="flex items-center text-red-700 dark:text-red-300" role="alert">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* 필터 영역 */}
        <div className="card mb-6">
          <h2 className="text-lg font-medium text-primary mb-4">필터 설정</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">작업 유형</label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="input-field"
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
              className="btn-secondary"
            >
              초기화
            </button>
            <button
              onClick={applyFilters}
              className="btn-primary"
            >
              필터 적용
            </button>
          </div>
        </div>
        
        {/* 이력 목록 */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">
                    기기 정보
                  </th>
                  <th scope="col">
                    작업
                  </th>
                  <th scope="col">
                    시간
                  </th>
                  <th scope="col">
                    세부 사항
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center">
                          <Laptop className="w-5 h-5 text-blue-500 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-primary">{item.device_name}</div>
                            <div className="text-sm text-secondary">{item.device_mac}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.action === 'create' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : item.action === 'update' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {getActionName(item.action)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-sm text-secondary">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(item.timestamp)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-sm text-secondary">
                        {item.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-secondary py-8">
                      {historyData.length > 0 ? '필터 조건에 맞는 이력이 없습니다.' : '기기 이력 데이터가 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* 페이지네이션 추가 */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="text-sm text-secondary">
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
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 