'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Download,
  Upload,
  X,
  Edit
} from 'lucide-react';
import { Equipment } from '@/services/api';
import equipmentService from '@/services/equipment';
import rentalService from '@/services/rental';
import adminService from '@/services/admin';
import * as XLSX from 'xlsx';
import { 
  Card, 
  Heading, 
  Button,
  Modal,
  Spinner,
  RentalCreationModal
} from '@/components/ui/StyledComponents';
import UserSearchSelect from '@/components/ui/UserSearchSelect';
import EquipmentSearchFilter from '@/components/equipment/EquipmentSearchFilter';
import EquipmentBulkUpdateModal from '@/components/equipment/EquipmentBulkUpdateModal';
import EquipmentFormModal from '@/components/equipment/EquipmentFormModal';
import EquipmentTable from '@/components/equipment/EquipmentTable';
import EquipmentSearchInput from '@/components/equipment/EquipmentSearchInput';
import Pagination from '@/components/ui/Pagination';
import { useToastContext } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ModelBatchUpdate from './ModelBatchUpdate';
import BatchStatusChangeModal from '@/components/equipment/BatchStatusChangeModal';

export default function EquipmentManagementPage() {
  const { showSuccess, showError } = useToastContext();

  // 상태 관리
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // 일괄 업데이트 모달 상태
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentForRental, setSelectedEquipmentForRental] = useState<Equipment | null>(null);
  const [selectedHistoryEquipment, setSelectedHistoryEquipment] = useState<Equipment | null>(null);
  const [selectedRentalEquipment, setSelectedRentalEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [batchStatusModal, setBatchStatusModal] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const updateFileInputRef = useRef<HTMLInputElement>(null);

  // 상세 정보 모달 상태
  const [openDetailModal, setOpenDetailModal] = useState(false);

  // 대여 관리 모달 상태
  const [openRentalModal, setOpenRentalModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [rentalNotes, setRentalNotes] = useState<string>('');
  const [rentalLoading, setRentalLoading] = useState(false);

  // 이력 보기 모달 상태
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [equipmentHistory, setEquipmentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 새로운 대여 생성 모달 상태
  const [openNewRentalModal, setOpenNewRentalModal] = useState(false);

  // 삭제 확인 다이얼로그 상태
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    equipmentId: null as number | null,
    equipmentName: ''
  });

  // 모델별 일괄 업데이트 모달 상태
  const [isModelBatchUpdateModalOpen, setIsModelBatchUpdateModalOpen] = useState(false);

  // 전체 장비 목록 로드
  const loadAllEquipment = useCallback(async () => {
    setLoading(true);
    try {
      // 페이지 크기를 크게 설정하여 모든 데이터를 가져옴
      const response = await equipmentService.getEquipmentList(1, 1000);
      
      if (response.success && response.data) {
        setAllEquipment(response.data.results);
      }
    } catch (error) {
      console.error('장비 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 프론트엔드 필터링 함수
  const filterEquipmentData = useCallback(() => {
    let filtered = [...allEquipment];

    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(equipment => {
        switch (searchType) {
          case 'all':
            // 통합 검색
            return (
              equipment.asset_number?.toLowerCase().includes(query) ||
              equipment.manufacturer?.toLowerCase().includes(query) ||
              equipment.model_name?.toLowerCase().includes(query) ||
              equipment.serial_number?.toLowerCase().includes(query) ||
              equipment.description?.toLowerCase().includes(query) ||
              equipment.management_number?.toLowerCase().includes(query) ||
              equipment.rental?.user.name.toLowerCase().includes(query) ||
              equipment.rental?.user.username.toLowerCase().includes(query)
            );
          case 'asset_number':
            return equipment.asset_number?.toLowerCase().includes(query);
          case 'manufacturer':
            return equipment.manufacturer?.toLowerCase().includes(query);
          case 'model_name':
            return equipment.model_name?.toLowerCase().includes(query);
          case 'serial_number':
            return equipment.serial_number?.toLowerCase().includes(query);
          case 'description':
            return equipment.description?.toLowerCase().includes(query);
          case 'rental_user':
            return equipment.rental?.user.name.toLowerCase().includes(query) ||
                   equipment.rental?.user.username.toLowerCase().includes(query);
          case 'manufacture_year':
            return equipment.manufacture_year?.toString().includes(query);
          case 'purchase_date':
            return equipment.purchase_date?.includes(query);
          case 'acquisition_date':
            return equipment.acquisition_date?.includes(query);
          default:
            // 기본값도 통합 검색으로 처리
            return (
              equipment.asset_number?.toLowerCase().includes(query) ||
              equipment.manufacturer?.toLowerCase().includes(query) ||
              equipment.model_name?.toLowerCase().includes(query) ||
              equipment.serial_number?.toLowerCase().includes(query) ||
              equipment.description?.toLowerCase().includes(query) ||
              equipment.management_number?.toLowerCase().includes(query) ||
              equipment.rental?.user.name.toLowerCase().includes(query) ||
              equipment.rental?.user.username.toLowerCase().includes(query)
            );
        }
      });
    }

    // 상태 필터링
    if (statusFilter) {
      filtered = filtered.filter(equipment => equipment.status === statusFilter);
    }

    // 타입 필터링
    if (typeFilter) {
      filtered = filtered.filter(equipment => equipment.equipment_type === typeFilter);
    }

    setFilteredEquipment(filtered);
    setCurrentPage(1); // 필터링 시 첫 페이지로 이동
  }, [allEquipment, searchQuery, searchType, statusFilter, typeFilter]);

  // 필터링된 데이터가 변경될 때마다 실행
  useEffect(() => {
    filterEquipmentData();
  }, [filterEquipmentData]);

  // 검색어 변경 핸들러 (실시간 검색)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 필터 초기화
  const handleResetFilters = useCallback(() => {
    setSearchType('all');
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 현재 페이지의 데이터 계산
  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEquipment.slice(startIndex, endIndex);
  }, [filteredEquipment, currentPage, pageSize]);

  // 페이지네이션 정보 계산
  const paginationInfo = useMemo(() => {
    const totalItems = filteredEquipment.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    return { totalItems, totalPages };
  }, [filteredEquipment, pageSize]);


  // 엑셀 내보내기
  const handleExportExcel = async () => {
    try {
      const response = await equipmentService.exportEquipmentToExcel();
      if (response.success && response.data) {
        // 파일 다운로드 로직
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `장비목록_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
    }
  };

  // 일괄 업데이트 파일 변경 핸들러
  const handleUpdateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUpdateFile(file);
      setUpdateResult(null);
    }
  };

  // 일괄 업데이트 제출 핸들러
  const handleUpdateSubmit = async () => {
    if (!updateFile) return;

    setUpdateLoading(true);
    try {
      const response = await equipmentService.bulkUpdateEquipmentFromExcel(updateFile);
      setUpdateResult(response.data);
      
      if (response.data?.success) {
        const { created, updated, errors } = response.data.results;
        const totalProcessed = created + updated;
        
        if (totalProcessed > 0) {
          let message = `🎉 총 ${totalProcessed}개의 장비가 성공적으로 처리되었습니다!`;
          if (created > 0 && updated > 0) {
            message += ` (새로 등록: ${created}개, 업데이트: ${updated}개)`;
          } else if (created > 0) {
            message += ` (새로 등록: ${created}개)`;
          } else if (updated > 0) {
            message += ` (업데이트: ${updated}개)`;
          }
          
          if (errors.length > 0) {
            message += ` (오류: ${errors.length}개)`;
          }
          
          showSuccess(message);
        } else {
          showError('처리된 장비가 없습니다. 파일을 확인해주세요.');
        }
        
        loadAllEquipment(); // 목록 새로고침
        
        // 성공 시 모달 닫기 (오류가 있으면 더 오래 보여줌)
        const closeDelay = errors.length > 0 ? 5000 : 3000;
        setTimeout(() => {
          setIsBulkUpdateModalOpen(false);
          setUpdateResult(null);
          setUpdateFile(null);
        }, closeDelay);
      }
    } catch (error: any) {
      const errorMessage = error.message || '업데이트 중 오류가 발생했습니다.';
      showError(`❌ ${errorMessage}`);
      setUpdateResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  // 장비 추가/수정 제출 핸들러
  const handleFormSubmit = async (data: any) => {
    setFormLoading(true);
    try {
      if (formModalMode === 'add') {
        const response = await equipmentService.createEquipment(data);
        if (response.success) {
          showSuccess('장비 추가 완료', '장비가 성공적으로 추가되었습니다.');
          loadAllEquipment();
        } else {
          // 상세한 오류 메시지 표시
          const errorMessage = response.message || 
            (typeof response.error === 'object' ? response.error.detail : response.error) || 
            '장비 추가에 실패했습니다.';
          showError('장비 추가 실패', errorMessage);
        }
      } else {
        if (!selectedEquipment) return;
        const response = await equipmentService.updateEquipment(selectedEquipment.id, data);
        if (response.success) {
          showSuccess('장비 수정 완료', '장비가 성공적으로 수정되었습니다.');
          loadAllEquipment();
        } else {
          // 상세한 오류 메시지 표시
          const errorMessage = response.message || 
            (typeof response.error === 'object' ? response.error.detail : response.error) || 
            '장비 수정에 실패했습니다.';
          showError('장비 수정 실패', errorMessage);
        }
      }
    } catch (error: any) {
      console.error('장비 저장 실패:', error);
      
      // 예상치 못한 오류 처리
      let errorMessage = '장비 저장 중 예상치 못한 오류가 발생했습니다.';
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 400:
            // 400 오류의 경우 백엔드에서 반환하는 구체적인 오류 메시지 사용
            if (errorData && typeof errorData === 'object') {
              const fieldErrors = Object.entries(errorData)
                .map(([field, messages]) => {
                  const message = Array.isArray(messages) ? messages[0] : messages;
                  const fieldName = {
                    'serial_number': '일련번호',
                    'model_name': '모델명',
                    'manufacturer': '제조사',
                    'equipment_type': '장비 유형',
                    'status': '상태',
                    'purchase_date': '구매일',
                    'acquisition_date': '취득일',
                    'manufacture_year': '제작년도',
                    'purchase_price': '구매가격'
                  }[field] || field;
                  return `${fieldName}: ${message}`;
                })
                .join(', ');
              errorMessage = fieldErrors || '입력 정보를 확인해주세요.';
            } else {
              errorMessage = errorData.detail || '잘못된 요청입니다. 입력 정보를 확인해주세요.';
            }
            break;
          case 401:
            errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
            break;
          case 403:
            errorMessage = '권한이 없습니다. 관리자 권한이 필요합니다.';
            break;
          case 404:
            errorMessage = '요청한 장비를 찾을 수 없습니다.';
            break;
          case 500:
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            break;
          default:
            errorMessage = errorData.detail || `오류가 발생했습니다. (${status})`;
        }
      } else if (error.request) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      }
      
      showError('장비 저장 실패', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // 이벤트 핸들러들
  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchType(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  const handleOpenAddDialog = () => {
    setFormModalMode('add');
    setSelectedEquipment(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditDialog = (item: Equipment) => {
    setFormModalMode('edit');
    setSelectedEquipment(item);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteDialog = (id: number) => {
    const equipment = allEquipment.find(eq => eq.id === id);
    setDeleteConfirm({
      isOpen: true,
      equipmentId: id,
      equipmentName: equipment?.model_name || equipment?.asset_number || '알 수 없는 장비'
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.equipmentId) {
      await handleDeleteEquipment(deleteConfirm.equipmentId);
      setDeleteConfirm({
        isOpen: false,
        equipmentId: null,
        equipmentName: ''
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({
      isOpen: false,
      equipmentId: null,
      equipmentName: ''
    });
  };

  const handleDeleteEquipment = async (id: number) => {
    try {
      const response = await equipmentService.deleteEquipment(id);
      if (response.success) {
        showSuccess('장비 삭제 완료', '장비가 성공적으로 삭제되었습니다.');
        loadAllEquipment();
      } else {
        showError('장비 삭제 실패', '장비 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('장비 삭제 실패:', error);
      showError('장비 삭제 오류', '장비 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleOpenRentalDialog = (item: Equipment) => {
    setSelectedRentalEquipment(item);
    setOpenRentalModal(true);
  };

  const handleOpenHistoryDialog = async (equipment: Equipment) => {
    console.log('=== 장비 이력 조회 시작 ===');
    console.log('선택된 장비:', equipment);
    
    setSelectedHistoryEquipment(equipment);
    setOpenHistoryModal(true);
    setHistoryLoading(true);
    
    try {
      console.log(`장비 이력 조회 시작: 장비 ID=${equipment.id}, 관리번호=${equipment.asset_number}`);
      const response = await equipmentService.getEquipmentHistory(equipment.id);
      console.log('장비 이력 조회 응답:', response);
      
      if (response.success && response.data) {
        console.log(`장비 이력 조회 성공: ${response.data.length}건`);
        setEquipmentHistory(response.data);
      } else {
        console.warn('장비 이력 조회 실패:', response);
        setEquipmentHistory([]);
        // 사용자에게 알림
        showError('이력 조회 실패', '장비 이력을 조회하는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('장비 이력 로드 실패:', error);
      setEquipmentHistory([]);
      // 사용자에게 알림
      showError('이력 조회 오류', '장비 이력을 조회하는 중 오류가 발생했습니다.');
    } finally {
      setHistoryLoading(false);
      console.log('=== 장비 이력 조회 완료 ===');
    }
  };

  // 새로운 대여 생성 모달 열기
  const handleOpenNewRentalDialog = async (equipment: Equipment) => {
    setSelectedEquipmentForRental(equipment);
    setOpenNewRentalModal(true);
    
    // 사용자 목록 로드 (모든 사용자)
    try {
      const response = await adminService.getAllUsersSimple();
      if (response && Array.isArray(response)) {
        setUsers(response);
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      // 대체 방법으로 페이지네이션된 API 사용
      try {
        const fallbackResponse = await adminService.getAllUsers(1);
        if (fallbackResponse && fallbackResponse.results) {
          setUsers(fallbackResponse.results);
        }
      } catch (fallbackError) {
        console.error('대체 사용자 목록 로드 실패:', fallbackError);
      }
    }
    
    // 기본 반납 예정일 설정 (30일 후)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    setDueDate(defaultDueDate.toISOString().split('T')[0]);
  };

  // 사용자 선택 핸들러
  const handleUserSelect = (selectedUserId: number | null) => {
    setSelectedUserId(selectedUserId);
  };

  // 대여 생성 처리
  const handleCreateRental = async () => {
    if (!selectedEquipmentForRental || !selectedUserId || !dueDate) {
      showError('입력 오류', '모든 필수 정보를 입력해주세요.');
      return;
    }

    setRentalLoading(true);
    try {
      const response = await rentalService.createRentalByAdmin({
        equipment: selectedEquipmentForRental.id,
        user: selectedUserId,
        due_date: dueDate,
        notes: rentalNotes
      });

      if (response.success) {
        // 성공 처리
        showSuccess('대여 생성 완료', response.message);
        setOpenNewRentalModal(false);
        setSelectedEquipmentForRental(null);
        setSelectedUserId(null);
        setDueDate('');
        setRentalNotes('');
        // 장비 목록 새로고침
        loadAllEquipment();
      } else {
        // 실패 처리 - 상세한 에러 메시지 표시
        const errorMessage = response.message || (typeof response.error === 'object' ? response.error.detail : response.error) || '대여 생성에 실패했습니다.';
        showError('대여 생성 실패', errorMessage);
      }
    } catch (error: any) {
      console.error('대여 생성 실패:', error);
      
      // 예상치 못한 오류 처리
      let errorMessage = '대여 생성 중 예상치 못한 오류가 발생했습니다.';
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage = errorData.detail || '잘못된 요청입니다. 입력 정보를 확인해주세요.';
            break;
          case 401:
            errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
            break;
          case 403:
            errorMessage = '권한이 없습니다. 관리자 권한이 필요합니다.';
            break;
          case 404:
            errorMessage = '요청한 장비나 사용자를 찾을 수 없습니다.';
            break;
          case 405:
            errorMessage = '허용되지 않는 요청입니다. 시스템 오류입니다.';
            break;
          case 409:
            errorMessage = '이미 대여 중인 장비입니다.';
            break;
          case 500:
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            break;
          default:
            errorMessage = errorData.detail || `오류가 발생했습니다. (${status})`;
        }
      } else if (error.request) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      }
      
      showError('대여 생성 실패', errorMessage);
    } finally {
      setRentalLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED') => {
    try {
      const response = await equipmentService.changeEquipmentStatus(id, newStatus);
      if (response.success) {
        const message = (response as any).message || '장비 상태가 성공적으로 변경되었습니다.';
        showSuccess('상태 변경 완료', message);
        loadAllEquipment();
      } else {
        const errorMessage = (response as any).error?.message || '장비 상태 변경에 실패했습니다.';
        showError('상태 변경 실패', errorMessage);
      }
    } catch (error) {
      console.error('장비 상태 변경 실패:', error);
      showError('상태 변경 오류', '장비 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 전체 선택/해제 토글 (키보드 단축키용)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEquipmentIds(currentPageData.map(eq => eq.id));
    } else {
      setSelectedEquipmentIds([]);
    }
  };

  // 개별 선택/해제
  const handleSelectEquipment = (equipmentId: number, checked: boolean) => {
    console.log('[EquipmentSelection] 선택 변경:', { equipmentId, checked });
    
    if (checked) {
      setSelectedEquipmentIds(prev => {
        // 중복 선택 방지
        if (prev.includes(equipmentId)) {
          console.log('[EquipmentSelection] 이미 선택된 장비:', equipmentId);
          return prev;
        }
        const newSelection = [...prev, equipmentId];
        console.log('[EquipmentSelection] 새로운 선택 목록:', newSelection);
        return newSelection;
      });
    } else {
      setSelectedEquipmentIds(prev => {
        const newSelection = prev.filter(id => id !== equipmentId);
        console.log('[EquipmentSelection] 새로운 선택 목록:', newSelection);
        return newSelection;
      });
    }
  };

  // 마지막 선택된 인덱스 변경
  const handleLastSelectedIndexChange = (index: number) => {
    setLastSelectedIndex(index);
  };

  // 일괄 상태 변경 모달 열기
  const handleOpenBatchStatusModal = async () => {
    console.log('[BatchStatusModal] 모달 열기 시작');
    setBatchStatusModal(true);
    
    // 사용자 목록이 비어있으면 로드
    if (users.length === 0) {
      console.log('[BatchStatusModal] 사용자 목록이 비어있음, 로드 시작');
      try {
        const response = await adminService.getAllUsersSimple();
        console.log('[BatchStatusModal] getAllUsersSimple 응답:', response);
        if (response && Array.isArray(response)) {
          setUsers(response);
          console.log('[BatchStatusModal] 사용자 목록 설정 완료:', response.length);
        }
      } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
        // 대체 방법으로 페이지네이션된 API 사용
        try {
          const fallbackResponse = await adminService.getAllUsers(1);
          console.log('[BatchStatusModal] fallback 응답:', fallbackResponse);
          if (fallbackResponse && fallbackResponse.results) {
            setUsers(fallbackResponse.results);
            console.log('[BatchStatusModal] fallback 사용자 목록 설정 완료:', fallbackResponse.results.length);
          }
        } catch (fallbackError) {
          console.error('대체 사용자 목록 로드 실패:', fallbackError);
        }
      }
    } else {
      console.log('[BatchStatusModal] 기존 사용자 목록 사용:', users.length);
    }
  };

  // 일괄 상태 변경
  const handleBatchStatusChange = async (status: string, reason: string, userId?: number) => {
    if (!status || selectedEquipmentIds.length === 0) {
      showError('입력 오류', '상태를 선택하고 장비를 선택해주세요.');
      return;
    }

    // 대여중 상태일 때 사용자 확인
    if (status === 'RENTED' && !userId) {
      showError('입력 오류', '대여중 상태로 변경할 때는 사용자를 선택해주세요.');
      return;
    }

    setBatchLoading(true);
    try {
      const response = await equipmentService.batchChangeEquipmentStatus(selectedEquipmentIds, status, reason, userId);
      if (response.success) {
        const message = (response as any).message || '선택된 장비들의 상태가 변경되었습니다.';
        showSuccess('일괄 상태 변경 완료', message);
        setSelectedEquipmentIds([]);
        setBatchStatusModal(false);
        loadAllEquipment();
      } else {
        const errorMessage = (response as any).error?.message || '일괄 상태 변경에 실패했습니다.';
        showError('일괄 상태 변경 실패', errorMessage);
      }
    } catch (error) {
      console.error('일괄 상태 변경 실패:', error);
      showError('일괄 상태 변경 오류', '일괄 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setBatchLoading(false);
    }
  };

  // 컴포넌트 마운트 시 장비 목록 로드
  useEffect(() => {
    loadAllEquipment();
  }, [loadAllEquipment]);



  return (
    <div className="space-y-4">
      {/* 메인 카드 - 제목과 버튼들 */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Heading level={1} className="text-2xl font-bold text-primary">
            장비 관리
          </Heading>
          <div className="flex gap-2">
            <Button 
              variant="primary"
              onClick={handleOpenAddDialog}
              className="flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              장비 추가
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setIsBulkUpdateModalOpen(true)}
              className="flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              엑셀 일괄 등록/업데이트
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setIsModelBatchUpdateModalOpen(true)}
              className="flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              모델별 일괄 수정
            </Button>
            <Button 
              variant="secondary"
              onClick={handleExportExcel}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              엑셀로 내보내기
            </Button>
            <Button 
              variant="secondary"
              onClick={() => loadAllEquipment()}
              disabled={loading}
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
            {selectedEquipmentIds.length > 0 && (
              <Button 
                variant="primary"
                onClick={handleOpenBatchStatusModal}
                className="flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                선택된 {selectedEquipmentIds.length}개 상태 변경
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 검색 카드 */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* 검색어 입력 한 줄 */}
          <EquipmentSearchInput
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
          {/* 검색 항목 한 줄 */}
          <EquipmentSearchFilter
            searchType={searchType}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            onSearchTypeChange={handleSearchTypeChange}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onTypeFilterChange={handleTypeFilterChange}
            onResetFilters={handleResetFilters}
            onFilter={() => {
              // 검색 실행 (필터링은 이미 실시간으로 처리됨)
              setCurrentPage(1);
            }}
          />
        </div>
      </Card>

      {/* 장비 목록 테이블 카드 */}
      <Card className="p-0">
        {/* 선택 기능 안내 */}
        {selectedEquipmentIds.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedEquipmentIds.length}개 장비 선택됨
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-300">
                  행 클릭: 개별 선택 | Ctrl+클릭: 개별 토글 | Shift+클릭: 범위 선택 | Ctrl+A: 전체 선택 | Esc: 선택 해제
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedEquipmentIds([]);
                  setLastSelectedIndex(-1);
                }}
                className="text-xs"
              >
                선택 해제
              </Button>
            </div>
          </div>
        )}
        
        <EquipmentTable
          equipment={currentPageData}
          loading={loading}
          onEdit={handleOpenEditDialog}
          onDelete={handleOpenDeleteDialog}
          onRental={handleOpenRentalDialog}
          onNewRental={handleOpenNewRentalDialog}
          onHistory={handleOpenHistoryDialog}
          onStatusChange={handleStatusChange}
          onSelectAll={handleSelectAll}
          onSelectEquipment={handleSelectEquipment}
          selectedEquipmentIds={selectedEquipmentIds}
          lastSelectedIndex={lastSelectedIndex}
          onLastSelectedIndexChange={handleLastSelectedIndexChange}
        />
        
        {/* 페이지네이션 */}
        <Pagination
          currentPage={currentPage}
          totalPages={paginationInfo.totalPages}
          totalItems={paginationInfo.totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </Card>

      {/* 엑셀 일괄 등록/업데이트 모달 */}
      <EquipmentBulkUpdateModal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => {
          setIsBulkUpdateModalOpen(false);
          setUpdateResult(null);
          setUpdateFile(null);
          if (updateFileInputRef.current) {
            updateFileInputRef.current.value = '';
          }
        }}
        fileInputRef={updateFileInputRef}
        uploadFile={updateFile}
        uploadLoading={updateLoading}
        uploadResult={updateResult}
        onFileChange={handleUpdateFileChange}
        onUploadSubmit={handleUpdateSubmit}
        onDownloadTemplate={handleExportExcel}
      />

      {/* 장비 추가/수정 모달 */}
      <EquipmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedEquipment(null);
        }}
        mode={formModalMode}
        equipment={selectedEquipment}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      {/* 대여 관리 모달 */}
      <Modal
        isOpen={openRentalModal}
        onClose={() => setOpenRentalModal(false)}
        title={`대여 관리 - ${selectedRentalEquipment?.asset_number || ''}`}
        size="xl"
      >
        {selectedRentalEquipment && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">장비명</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRentalEquipment.asset_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">모델명</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRentalEquipment.model_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">현재 상태</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                  selectedRentalEquipment.status === 'RENTED' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700' :
                  selectedRentalEquipment.status === 'AVAILABLE' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700' :
                  'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}>
                  {selectedRentalEquipment.status_display}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">현재 대여자</label>
                {selectedRentalEquipment.rental?.user ? (
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    <div className="font-medium">
                      {selectedRentalEquipment.rental.user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedRentalEquipment.rental.user.username})
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">없음</p>
                )}
              </div>
              {selectedRentalEquipment.rental && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">대여일</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(selectedRentalEquipment.rental.rental_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">반납 예정일</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(selectedRentalEquipment.rental.due_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpenRentalModal(false)}
              >
                닫기
              </Button>
              {selectedRentalEquipment.status === 'RENTED' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    showError('반납 처리', '이 장비를 반납 처리하시겠습니까?');
                    handleStatusChange(selectedRentalEquipment.id, 'AVAILABLE');
                    setOpenRentalModal(false);
                  }}
                >
                  반납 처리
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* 이력 보기 모달 */}
      <Modal
        isOpen={openHistoryModal}
        onClose={() => setOpenHistoryModal(false)}
        title={`장비 이력 - ${selectedHistoryEquipment?.asset_number || ''}`}
        size="xl"
      >
        {selectedHistoryEquipment && (
          <>
            {historyLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : equipmentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">날짜</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">작업</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">사용자</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {equipmentHistory.map((history, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {new Date(history.created_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {history.action}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {history.user ? (
                            <div>
                              <div className="font-medium">
                                {history.user.name || history.user.username}
                              </div>
                              {history.user.name && history.user.username && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ({history.user.username})
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {history.details || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                이력이 없습니다.
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button
                variant="secondary"
                onClick={() => setOpenHistoryModal(false)}
              >
                닫기
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* 새로운 대여 생성 모달 */}
      <Modal
        isOpen={openNewRentalModal}
        onClose={() => setOpenNewRentalModal(false)}
        title={`새 대여 생성 - ${selectedEquipmentForRental?.asset_number || ''}`}
        size="xl"
      >
        {selectedEquipmentForRental && (
          <>
            {/* 장비 정보 섹션 */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">장비 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">관리번호</label>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedEquipmentForRental.asset_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">모델명</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEquipmentForRental.model_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제조사</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEquipmentForRental.manufacturer || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">현재 상태</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                    selectedEquipmentForRental.status === 'AVAILABLE' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                  }`}>
                    {selectedEquipmentForRental.status_display}
                  </span>
                </div>
              </div>
            </div>

            {/* 대여 정보 입력 섹션 */}
            <div className="space-y-4">
              {/* 대여자 검색 */}
              <UserSearchSelect
                users={users}
                selectedUserId={selectedUserId}
                onUserSelect={handleUserSelect}
                label="대여자 검색"
                placeholder="이름, 아이디, 이메일로 검색..."
                required={true}
              />

              {/* 반납 예정일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  반납 예정일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  비고
                </label>
                <textarea
                  value={rentalNotes}
                  onChange={(e) => setRentalNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="대여 관련 비고사항을 입력하세요"
                />
              </div>
            </div>
            
            {/* 버튼 영역 */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpenNewRentalModal(false);
                  setSelectedUserId(null);
                  setDueDate('');
                  setRentalNotes('');
                }}
                disabled={rentalLoading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateRental}
                disabled={rentalLoading || !selectedUserId || !dueDate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
              >
                {rentalLoading ? '처리 중...' : '대여 생성'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="장비 삭제 확인"
        message={`정말로 '${deleteConfirm.equipmentName}' 장비를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 영구적으로 삭제됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* 모델별 일괄 업데이트 모달 */}
      <ModelBatchUpdate
        open={isModelBatchUpdateModalOpen}
        onClose={() => {
          setIsModelBatchUpdateModalOpen(false);
          // 모달 닫기 후 장비 목록 새로고침
          loadAllEquipment();
        }}
      />

      {/* 일괄 상태 변경 모달 */}
      <BatchStatusChangeModal
        isOpen={batchStatusModal}
        onClose={() => setBatchStatusModal(false)}
        onConfirm={handleBatchStatusChange}
        selectedCount={selectedEquipmentIds.length}
        users={users}
        loading={batchLoading}
      />
    </div>
  );
} 