'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Laptop, Calendar, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import rentalService from '@/services/rental';
import { DeviceHistory } from '@/services/admin';

export default function UserIpAssignmentsPage() {
  const router = useRouter();
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchIpAssignments(page);
  }, [page]);

  const fetchIpAssignments = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await rentalService.getUserIpAssignments();
      if (response.success && response.data) {
        // 페이지네이션 정보 설정
        setTotalCount(response.data.total_count || 0);
        setTotalPages(response.data.total_pages || 1);
        
        // 결과 데이터 설정
        if (response.data.results && Array.isArray(response.data.results)) {
          setDeviceHistory(response.data.results);
        } else {
          setDeviceHistory([]);
        }
      } else {
        setError(response.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('IP 발급 내역 조회 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '없음';
    return dayjs(dateString).locale('ko').format('YYYY년 MM월 DD일 HH:mm');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            등록
          </span>
        );
      case 'delete':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            삭제
          </span>
        );
      case 'update':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            수정
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {action}
          </span>
        );
    }
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
            <h1 className="text-2xl font-bold text-primary">내 IP 발급 내역</h1>
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

        {deviceHistory.length === 0 ? (
          <div className="card">
            <div className="text-center py-8">
              <Laptop className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-secondary">등록된 IP 발급 내역이 없습니다.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card mb-6">
              <div className="text-sm text-secondary">
                총 <span className="font-medium">{typeof totalCount === 'number' && !isNaN(totalCount) ? totalCount : 0}</span>개의 내역이 있습니다.
              </div>
            </div>
            
            <div className="card">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">
                        작업
                      </th>
                      <th scope="col">
                        MAC 주소
                      </th>
                      <th scope="col">
                        기기 이름
                      </th>
                      <th scope="col">
                        상세 내역
                      </th>
                      <th scope="col">
                        발급 일시
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceHistory.map((history) => (
                      <tr key={history.id}>
                        <td className="whitespace-nowrap">
                          {getActionBadge(history.action)}
                        </td>
                        <td className="whitespace-nowrap text-sm text-secondary">
                          {history.device_mac}
                        </td>
                        <td className="whitespace-nowrap text-sm font-medium text-primary">
                          {history.device_name}
                        </td>
                        <td className="whitespace-nowrap text-sm text-secondary">
                          {history.details}
                        </td>
                        <td className="whitespace-nowrap text-sm text-secondary">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(history.timestamp)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className={`p-2 rounded-md ${
                          page === 1 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        이전
                      </button>
                      
                      {/* 페이지 번호 */}
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // 항상 현재 페이지를 중심으로 표시
                          let pageNum;
                          if (totalPages <= 5) {
                            // 전체 페이지가 5개 이하면 모두 표시
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            // 현재 페이지가 앞쪽이면 1~5 표시
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            // 현재 페이지가 뒤쪽이면 마지막 5개 표시
                            pageNum = totalPages - 4 + i;
                          } else {
                            // 그 외에는 현재 페이지 중심으로 표시
                            pageNum = page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 rounded-md ${
                                page === pageNum
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
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className={`p-2 rounded-md ${
                          page === totalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}