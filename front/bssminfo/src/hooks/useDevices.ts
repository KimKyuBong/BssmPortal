import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import deviceService, { Device } from '@/services/device';

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<Record<number, boolean>>({});
  const [lastSelectedDevice, setLastSelectedDevice] = useState<number | null>(null);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deviceService.getAllDevices();
      if (response.success) {
        // 응답 데이터가 배열인지 확인하고 처리
        if (Array.isArray(response.data)) {
          setDevices(response.data || []);
        } else {
          console.error('API 응답이 배열이 아닙니다:', response.data);
          // 빈 배열로 초기화하여 UI 오류 방지
          setDevices([]);
          setError('장치 데이터 형식이 올바르지 않습니다.');
        }
      } else {
        setError(response.message || '장치 목록을 불러오는데 실패했습니다.');
        setDevices([]); // 오류 발생 시 빈 배열로 초기화
      }
    } catch (err) {
      setError('장치 목록을 불러오는데 실패했습니다.');
      console.error(err);
      setDevices([]); // 오류 발생 시 빈 배열로 초기화
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleDeleteDevice = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await deviceService.deleteDevice(id);
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
      const response = await deviceService.toggleDeviceActive(id);
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
          
          const response = await deviceService.toggleDeviceActive(id);
          return response.success;
        })
      );

      // 모든 작업이 성공했는지 확인
      const allSucceeded = results.every(success => success);
      
      if (allSucceeded) {
        // 장치 목록 새로고침
        await fetchDevices();
        return true;
      } else {
        setError('일부 장치의 상태 변경에 실패했습니다.');
        await fetchDevices();
        return false;
      }
    } catch (err) {
      setError('장치 상태 변경에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [devices, selectedDevices, fetchDevices]);

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
          const response = await deviceService.deleteDevice(id);
          return response.success;
        })
      );

      // 모든 작업이 성공했는지 확인
      const allSucceeded = results.every(success => success);
      
      if (allSucceeded) {
        // 장치 목록 새로고침
        await fetchDevices();
        setSelectedDevices({});
        return true;
      } else {
        setError('일부 장치의 삭제에 실패했습니다.');
        await fetchDevices();
        return false;
      }
    } catch (err) {
      setError('장치 삭제에 실패했습니다.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedDevices, fetchDevices]);

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
      
      // Shift 키를 누른 경우, 마지막 선택된 항목부터 현재 항목까지 범위 선택
      if (event.shiftKey && lastSelectedDevice !== null) {
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
  };
};

export default useDevices; 