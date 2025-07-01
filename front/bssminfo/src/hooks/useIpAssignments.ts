import { useState, useEffect, useCallback } from 'react';
import { DeviceHistory } from '@/services/admin';
import adminService from '@/services/admin';

export const useIpAssignments = () => {
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchDeviceHistory = useCallback(async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getAllIpAssignments(page, search);
      if (response.success && response.data) {
        // 응답 데이터에서 results 배열 추출
        const results = response.data.results || response.data;
        const historyData = Array.isArray(results) ? results : [];
        
        setDeviceHistory(historyData);
        
        // 페이지네이션 정보 설정
        if (response.data.total_pages !== undefined) {
          setTotalPages(response.data.total_pages);
          setTotalCount(response.data.total_count || historyData.length);
          setCurrentPage(response.data.current_page || page);
        } else {
          setTotalPages(1);
          setTotalCount(historyData.length);
          setCurrentPage(1);
        }
      } else {
        setError(response.message || 'IP 할당 내역을 가져오는데 실패했습니다.');
        setDeviceHistory([]);
      }
    } catch (err) {
      console.error('IP 할당 내역 조회 오류:', err);
      setError('IP 할당 내역을 가져오는데 실패했습니다.');
      setDeviceHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchDeviceHistory(page, searchTerm);
  }, [fetchDeviceHistory, searchTerm]);

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchDeviceHistory(1, searchTerm);
  }, [fetchDeviceHistory, searchTerm]);

  // 검색 핸들러
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    fetchDeviceHistory(1, searchTerm);
  }, [fetchDeviceHistory, searchTerm]);

  // IP 할당 삭제 핸들러
  const handleDeleteAssignment = useCallback(async (id: number) => {
    try {
      const response = await adminService.deleteIpAssignment(id);
      if (response.success) {
        // 목록 새로고침
        await fetchDeviceHistory(currentPage, searchTerm);
        return true;
      } else {
        setError(response.message || 'IP 할당 삭제에 실패했습니다.');
        return false;
      }
    } catch (err) {
      console.error('IP 할당 삭제 오류:', err);
      setError('IP 할당 삭제 중 오류가 발생했습니다.');
      return false;
    }
  }, [fetchDeviceHistory, currentPage, searchTerm]);

  // IP 주소 추출 함수
  const extractIpAddress = useCallback((details: string): string => {
    const ipMatch = details.match(/IP: (\d+\.\d+\.\d+\.\d+)/);
    return ipMatch ? ipMatch[1] : '-';
  }, []);

  useEffect(() => {
    fetchDeviceHistory(currentPage, searchTerm);
  }, [fetchDeviceHistory, currentPage, searchTerm]);

  return {
    deviceHistory,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    handleSearch,
    handleDeleteAssignment,
    extractIpAddress,
    fetchDeviceHistory,
  };
};

export default useIpAssignments; 