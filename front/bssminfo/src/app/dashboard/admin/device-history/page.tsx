'use client';

import React, { useState, useEffect } from 'react';
import adminService from '@/services/admin';

export default function DeviceHistoryPage() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceHistory = async () => {
      try {
        const historyResponse = await adminService.getDeviceHistory();
        
        if (historyResponse.success && historyResponse.data) {
          const allData = historyResponse.data;
          setHistoryData(allData);
          
          // 프론트엔드에서 페이지네이션 처리
          const totalItems = allData.length;
          setTotalCount(totalItems);
          setTotalPages(Math.ceil(totalItems / pageSize));
          
          // 현재 페이지에 해당하는 데이터만 필터링
          const startIndex = (currentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedItems = allData.slice(startIndex, endIndex);
          
          setFilteredData(paginatedItems);
          
          console.log('전체 기기 이력 데이터:', {
            totalCount: totalItems,
            page: currentPage,
            pageSize: pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
            resultsCount: paginatedItems.length
          });
        } else {
          console.error('기기 이력 데이터 로드 실패:', historyResponse.error);
          setError('기기 이력 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('기기 이력 데이터 로드 오류:', err);
        setError('기기 이력 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchDeviceHistory();
  }, [currentPage, pageSize]);

  // 페이지 변경 처리
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">기기 이력 관리</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC 주소</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기기 이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP 주소</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업일자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상세 설명</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-center" colSpan={7}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{item.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.user?.username || '알 수 없음'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.device_mac}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.device_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.assigned_ip || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.action === 'update' && item.details?.includes('블랙리스트')
                        ? <span className="text-red-600 font-bold">블랙리스트로 인한 IP 변경</span>
                        : item.action === 'create' ? '등록'
                        : item.action === 'delete' ? '삭제'
                        : '수정'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(item.timestamp || item.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 간단한 페이지네이션 컨트롤 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex justify-between">
            <button 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              이전
            </button>
            
            <span className="px-4 py-2">
              {currentPage} / {totalPages} 페이지
            </span>
            
            <button 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 