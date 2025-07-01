'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Download,
  Upload,
  X
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
  Spinner
} from '@/components/ui/StyledComponents';
import EquipmentSearchFilter from '@/components/equipment/EquipmentSearchFilter';
import EquipmentBulkUploadModal from '@/components/equipment/EquipmentBulkUploadModal';
import EquipmentFormModal from '@/components/equipment/EquipmentFormModal';
import EquipmentTable from '@/components/equipment/EquipmentTable';
import EquipmentSearchInput from '@/components/equipment/EquipmentSearchInput';
import Pagination from '@/components/ui/Pagination';
import { useToastContext } from '@/contexts/ToastContext';

export default function EquipmentManagementPage() {
  const { showSuccess, showError } = useToastContext();

  // 상태 관리
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState('asset_number');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 상세 정보 모달 상태
  const [openDetailModal, setOpenDetailModal] = useState(false);

  // 대여 관리 모달 상태
  const [openRentalModal, setOpenRentalModal] = useState(false);
  const [selectedRentalEquipment, setSelectedRentalEquipment] = useState<Equipment | null>(null);
  
  // 이력 보기 모달 상태
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [selectedHistoryEquipment, setSelectedHistoryEquipment] = useState<Equipment | null>(null);
  const [equipmentHistory, setEquipmentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 새로운 대여 생성 모달 상태
  const [openNewRentalModal, setOpenNewRentalModal] = useState(false);
  const [selectedEquipmentForRental, setSelectedEquipmentForRental] = useState<Equipment | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [rentalNotes, setRentalNotes] = useState<string>('');
  const [rentalLoading, setRentalLoading] = useState(false);

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
            // 전체 검색
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
    setSearchType('asset_number');
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

  // 파일 변경 핸들러
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setUploadFile(file);
    setUploadResult(null);
  };

  // 업로드 제출 핸들러
  const handleUploadSubmit = async () => {
    if (!uploadFile) return;

    setUploadLoading(true);
    try {
      const response = await equipmentService.importEquipmentFromExcel(uploadFile);
      setUploadResult({
        success: response.success,
        message: response.message || (response.success ? '장비가 성공적으로 등록되었습니다.' : '업로드에 실패했습니다.')
      });
      
      if (response.success) {
        setUploadFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        loadAllEquipment(); // 목록 새로고침
        // 성공 시 모달 닫기
        setTimeout(() => {
          setIsBulkUploadModalOpen(false);
          setUploadResult(null);
        }, 2000);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: '업로드 중 오류가 발생했습니다.'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // 템플릿 다운로드
  const downloadTemplate = () => {
    const template = [
      {
        '물품번호': 'EQ001',
        '제조사': '삼성',
        '모델명': '갤럭시북',
        '유형': 'LAPTOP',
        '일련번호': 'SN123456789',
        '관리번호': 'MG001',
        '설명': '삼성 갤럭시북 노트북',
        '상태': 'AVAILABLE',
        '생산년도': '2023',
        '구매일': '2023-01-15',
        '구매가격': '1500000',
        '취득일': '2023-01-15'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '장비템플릿');
    XLSX.writeFile(wb, '장비_등록_템플릿.xlsx');
  };

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
          showError('장비 추가 실패', '장비 추가에 실패했습니다.');
        }
      } else {
        if (!selectedEquipment) return;
        const response = await equipmentService.updateEquipment(selectedEquipment.id, data);
        if (response.success) {
          showSuccess('장비 수정 완료', '장비가 성공적으로 수정되었습니다.');
          loadAllEquipment();
        } else {
          showError('장비 수정 실패', '장비 수정에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('장비 저장 실패:', error);
      showError('장비 저장 오류', '장비 저장 중 오류가 발생했습니다.');
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
    // confirm 대신 토스트로 확인 메시지 표시하고 바로 삭제 처리
    showError('장비 삭제', '정말로 이 장비를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    handleDeleteEquipment(id);
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
    setSelectedHistoryEquipment(equipment);
    setOpenHistoryModal(true);
    setHistoryLoading(true);
    
    try {
      const response = await equipmentService.getEquipmentHistory(equipment.id);
      if (response.success && response.data) {
        setEquipmentHistory(response.data);
      } else {
        setEquipmentHistory([]);
      }
    } catch (error) {
      console.error('장비 이력 로드 실패:', error);
      setEquipmentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 새로운 대여 생성 모달 열기
  const handleOpenNewRentalDialog = async (equipment: Equipment) => {
    setSelectedEquipmentForRental(equipment);
    setOpenNewRentalModal(true);
    
    // 사용자 목록 로드
    try {
      const response = await adminService.getAllUsers(1);
      if (response && response.results) {
        setUsers(response.results);
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    }
    
    // 기본 반납 예정일 설정 (30일 후)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    setDueDate(defaultDueDate.toISOString().split('T')[0]);
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
      const response = await equipmentService.updateEquipment(id, { status: newStatus });
      if (response.success) {
        showSuccess('상태 변경 완료', '장비 상태가 성공적으로 변경되었습니다.');
        loadAllEquipment();
      } else {
        showError('상태 변경 실패', '장비 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('장비 상태 변경 실패:', error);
      showError('상태 변경 오류', '장비 상태 변경 중 오류가 발생했습니다.');
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
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              엑셀 일괄 등록
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
        <EquipmentTable
          equipment={currentPageData}
          loading={loading}
          onEdit={handleOpenEditDialog}
          onDelete={handleOpenDeleteDialog}
          onRental={handleOpenRentalDialog}
          onNewRental={handleOpenNewRentalDialog}
          onHistory={handleOpenHistoryDialog}
          onStatusChange={handleStatusChange}
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

      {/* 엑셀 일괄 등록 모달 */}
      <EquipmentBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => {
          setIsBulkUploadModalOpen(false);
          setUploadResult(null);
          setUploadFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        fileInputRef={fileInputRef}
        uploadFile={uploadFile}
        uploadLoading={uploadLoading}
        uploadResult={uploadResult}
        onFileChange={handleFileChange}
        onUploadSubmit={handleUploadSubmit}
        onDownloadTemplate={downloadTemplate}
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
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRentalEquipment.rental?.user.name || '없음'}</p>
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
                          {history.user?.username || '-'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장비명</label>
                <p className="text-sm text-gray-900">{selectedEquipmentForRental.asset_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
                <p className="text-sm text-gray-900">{selectedEquipmentForRental.model_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">현재 상태</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                  selectedEquipmentForRental.status === 'AVAILABLE' ? 'bg-green-100 text-green-800 border-green-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  {selectedEquipmentForRental.status_display}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대여자 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">대여자를 선택하세요</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.user_name || user.username} ({user.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  반납 예정일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비고
                </label>
                <textarea
                  value={rentalNotes}
                  onChange={(e) => setRentalNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="대여 관련 비고사항을 입력하세요"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setOpenNewRentalModal(false)}
                disabled={rentalLoading}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateRental}
                disabled={rentalLoading || !selectedUserId || !dueDate}
              >
                {rentalLoading ? '처리 중...' : '대여 생성'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
} 