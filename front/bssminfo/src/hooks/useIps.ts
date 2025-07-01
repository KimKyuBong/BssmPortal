import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ipService, { Device } from '@/services/ip';

export const useIps = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<Record<number, boolean>>({});
  const [lastSelectedDevice, setLastSelectedDevice] = useState<number | null>(null);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchDevices = useCallback(async (page: number = 1, search: string = '', size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      // 페이지네이션과 검색 파라미터를 포함한 API 호출
      const response = await ipService.getAllIps(page, search, size);
      if (response.success) {
        // 응답 데이터가 배열인지 확인하고 처리
        if (Array.isArray(response.data)) {
          setDevices(response.data || []);
          setTotalPages(1);
          setTotalCount(response.data.length);
        } else if (response.data && typeof response.data === 'object') {
          // 페이지네이션 정보가 포함된 응답 처리
          const { results, total_pages, total_count, current_page } = response.data;
          setDevices(results || []);
          setTotalPages(total_pages || 1);
          setTotalCount(total_count || 0);
          setCurrentPage(current_page || page);
        } else {
          console.error('API 응답이 올바르지 않습니다:', response.data);
          setDevices([]);
          setError('장치 데이터 형식이 올바르지 않습니다.');
        }
      } else {
        setError(response.message || '장치 목록을 불러오는데 실패했습니다.');
        setDevices([]);
      }
    } catch (err) {
      setError('장치 목록을 불러오는데 실패했습니다.');
      console.error(err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchDevices(page, deviceSearchTerm, pageSize);
  }, [fetchDevices, deviceSearchTerm, pageSize]);

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 페이지 크기가 변경되면 첫 페이지로 이동
    fetchDevices(1, deviceSearchTerm, newPageSize);
  }, [fetchDevices, deviceSearchTerm]);

  // 검색 핸들러
  const handleSearch = useCallback(() => {
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    fetchDevices(1, deviceSearchTerm, pageSize);
  }, [fetchDevices, deviceSearchTerm, pageSize]);

  useEffect(() => {
    fetchDevices(currentPage, deviceSearchTerm, pageSize);
  }, [fetchDevices, currentPage, deviceSearchTerm, pageSize]);

  const handleDeleteDevice = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ipService.deleteIp(id);
      if (response.success) {
        setDevices(prev => prev.filter(device => device.id !== id));
        setSelectedDevices(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        return true;
      } else {
        setError(response.message || '장치 삭제에 실패했습니다.');
        return false;
      }
    } catch (err) {
      setError('장치 삭제에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleDeviceActive = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ipService.toggleIpActive(id);
      if (response.success) {
        setDevices(prev => 
          prev.map(device => 
            device.id === id 
              ? { ...device, is_active: !device.is_active } 
              : device
          )
        );
        return true;
      } else {
        setError(response.message || '장치 상태 변경에 실패했습니다.');
        return false;
      }
    } catch (err) {
      setError('장치 상태 변경에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBulkToggleDeviceActive = useCallback(async (activate: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const selectedIds = Object.entries(selectedDevices)
        .filter(([_, selected]) => selected)
        .map(([id, _]) => parseInt(id));
      
      if (selectedIds.length === 0) {
        setError('선택된 장치가 없습니다.');
        setLoading(false);
        return false;
      }

      const results = await Promise.all(
        selectedIds.map(async id => {
          const device = devices.find(d => d.id === id);
          if (!device) return false;
          
          // 이미 원하는 상태라면 건너뛰기
          if (device.is_active === activate) return true;
          
          const response = await ipService.toggleIpActive(id);
          return response.success;
        })
      );

      // 모든 작업이 성공했는지 확인
      const allSucceeded = results.every(success => success);
      
      if (allSucceeded) {
        // 장치 목록 새로고침
        await fetchDevices(currentPage, deviceSearchTerm, pageSize);
        return true;
      } else {
        setError('일부 장치의 상태 변경에 실패했습니다.');
        await fetchDevices(currentPage, deviceSearchTerm, pageSize);
        return false;
      }
    } catch (err) {
      setError('장치 상태 변경에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [devices, selectedDevices, fetchDevices, currentPage, deviceSearchTerm, pageSize]);

  const handleBulkDeleteDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedIds = Object.entries(selectedDevices)
        .filter(([_, selected]) => selected)
        .map(([id, _]) => parseInt(id));
      
      if (selectedIds.length === 0) {
        setError('선택된 장치가 없습니다.');
        setLoading(false);
        return false;
      }

      const results = await Promise.all(
        selectedIds.map(async id => {
          const response = await ipService.deleteIp(id);
          return response.success;
        })
      );

      // 모든 작업이 성공했는지 확인
      const allSucceeded = results.every(success => success);
      
      if (allSucceeded) {
        // 장치 목록 새로고침
        await fetchDevices(currentPage, deviceSearchTerm, pageSize);
        setSelectedDevices({});
        return true;
      } else {
        setError('일부 장치의 삭제에 실패했습니다.');
        await fetchDevices(currentPage, deviceSearchTerm, pageSize);
        return false;
      }
    } catch (err) {
      setError('장치 삭제에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedDevices, fetchDevices, currentPage, deviceSearchTerm, pageSize]);

  const exportToExcel = useCallback(() => {
    try {
      // 엑셀로 내보낼 데이터 준비
      const exportData = devices.map(device => ({
        ID: device.id,
        '장치 이름': device.device_name,
        'MAC 주소': device.mac_address,
        'IP 주소': device.assigned_ip || 'N/A',
        '소유자': device.username || 'N/A',
        '상태': device.is_active ? '활성' : '비활성',
        '마지막 접속': device.last_access || 'N/A',
        '생성일': device.created_at
      }));

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '장치 목록');
      
      // 엑셀 파일로 저장
      XLSX.writeFile(workbook, `장치_목록_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      return true;
    } catch (err) {
      setError('엑셀 파일 생성에 실패했습니다.');
      console.error(err);
      return false;
    }
  }, [devices]);

  const handleDeviceSelection = useCallback((id: number, event: React.MouseEvent) => {
    setSelectedDevices(prev => {
      const newSelectedDevices = { ...prev };
      
      // 체크박스 클릭의 경우 (Ctrl/Cmd 키가 눌리지 않은 경우)
      if (!event.ctrlKey && !event.metaKey) {
        // 단순 토글
        newSelectedDevices[id] = !newSelectedDevices[id];
        setLastSelectedDevice(id);
      } 
      // Shift 키를 누른 경우, 마지막 선택된 항목부터 현재 항목까지 범위 선택
      else if (event.shiftKey && lastSelectedDevice !== null) {
        const deviceIds = devices.map(device => device.id);
        const startIdx = deviceIds.indexOf(lastSelectedDevice);
        const endIdx = deviceIds.indexOf(id);
        
        if (startIdx !== -1 && endIdx !== -1) {
          const start = Math.min(startIdx, endIdx);
          const end = Math.max(startIdx, endIdx);
          
          for (let i = start; i <= end; i++) {
            newSelectedDevices[deviceIds[i]] = true;
          }
        }
      } 
      // Ctrl/Cmd 키를 누른 경우, 개별 토글
      else if (event.ctrlKey || event.metaKey) {
        newSelectedDevices[id] = !newSelectedDevices[id];
        setLastSelectedDevice(id);
      } 
      // 아무 키도 누르지 않은 경우, 기존 선택을 취소하고 새로 선택
      else {
        Object.keys(newSelectedDevices).forEach(key => {
          newSelectedDevices[parseInt(key)] = false;
        });
        newSelectedDevices[id] = true;
        setLastSelectedDevice(id);
      }
      
      return newSelectedDevices;
    });
  }, [devices, lastSelectedDevice]);

  // 필터링된 장치 목록
  const filteredDevices = useMemo(() => {
    if (!deviceSearchTerm.trim()) return devices;
    
    const searchTermLower = deviceSearchTerm.toLowerCase();
    return devices.filter(device => 
      device.mac_address.toLowerCase().includes(searchTermLower) ||
      device.device_name.toLowerCase().includes(searchTermLower) ||
      (device.assigned_ip && device.assigned_ip.toLowerCase().includes(searchTermLower)) ||
      (device.username && device.username.toLowerCase().includes(searchTermLower))
    );
  }, [devices, deviceSearchTerm]);

  // 선택된 장치 수
  const selectedDeviceCount = Object.values(selectedDevices).filter(selected => selected).length;

  // 선택된 장치 목록
  const selectedDeviceList = useMemo(() => {
    return devices.filter(device => selectedDevices[device.id]);
  }, [devices, selectedDevices]);

  return {
    devices,
    filteredDevices,
    loading,
    error,
    selectedDevices,
    selectedDeviceCount,
    selectedDeviceList,
    deviceSearchTerm,
    setDeviceSearchTerm,
    fetchDevices,
    handleDeleteDevice,
    handleToggleDeviceActive,
    handleBulkToggleDeviceActive,
    handleBulkDeleteDevices,
    exportToExcel,
    handleDeviceSelection,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    handlePageChange,
    handleSearch,
    handlePageSizeChange,
  };
};

export default useIps; 