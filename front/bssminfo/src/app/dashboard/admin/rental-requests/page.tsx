'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RefreshCw, 
  Download,
  Eye,
  Check,
  X,
  Search,
  Filter,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { RentalRequest } from '@/services/api';
import rentalService, { RENTAL_REQUEST_STATUS } from '@/services/rental';
import { 
  Card, 
  Heading, 
  Button,
  Input,
  Select,
  BaseTable,
  BaseTableHead,
  BaseTableBody,
  BaseTableRow,
  BaseTableHeaderCell,
  BaseTableCell,
  Badge,
  Spinner,
  Modal,
  Textarea
} from '@/components/ui/StyledComponents';
import dayjs from 'dayjs';

// 요청 상태에 따른 스타일 정의
const getRequestStatusStyle = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'APPROVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

export default function RentalRequestsPage() {
  const [allRequests, setAllRequests] = useState<RentalRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 상세 정보 모달 상태
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  
  // 승인/거부 모달 상태
  const [openActionModal, setOpenActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [requestIdToProcess, setRequestIdToProcess] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // 알림 상태
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'error' | 'info' | 'warning'}>({
    show: false,
    message: '',
    type: 'info'
  });

  // 전체 요청 목록 로드
  const loadAllRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await rentalService.getRentalRequests();
      
      if (result.success && result.data) {
        let requestData: RentalRequest[] = [];
        
        if (Array.isArray(result.data)) {
          requestData = result.data;
        } else if (result.data.results && Array.isArray(result.data.results)) {
          requestData = result.data.results;
        }
        
        setAllRequests(requestData);
      } else {
        console.error('요청 데이터를 불러오는데 실패했습니다:', result.message);
        showNotification('요청 데이터를 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('요청 데이터 로드 중 오류 발생:', error);
      showNotification('요청 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 프론트엔드 필터링 함수
  const filterRequestsData = useCallback(() => {
    let filtered = [...allRequests];

    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.user?.username?.toLowerCase().includes(query) ||
        (item.equipment_detail && item.equipment_detail.asset_number?.toLowerCase().includes(query)) ||
        (item.request_reason && item.request_reason.toLowerCase().includes(query))
      );
    }

    // 상태 필터링
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // 유형 필터링
    if (typeFilter) {
      filtered = filtered.filter(item => item.request_type === typeFilter);
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [allRequests, searchQuery, statusFilter, typeFilter]);

  // 필터링된 데이터가 변경될 때마다 실행
  useEffect(() => {
    filterRequestsData();
  }, [filterRequestsData]);

  // 현재 페이지의 데이터 계산
  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, currentPage, pageSize]);

  // 페이지네이션 정보 계산
  const paginationInfo = useMemo(() => {
    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    return { totalItems, totalPages };
  }, [filteredRequests, pageSize]);

  // 데이터 새로고침
  const handleRefresh = () => {
    loadAllRequests();
  };

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 상세 정보 모달 열기
  const handleOpenDetailModal = (request: RentalRequest) => {
    setSelectedRequest(request);
    setOpenDetailModal(true);
  };

  // 승인/거부 모달 열기
  const handleOpenActionModal = (requestId: number, action: 'approve' | 'reject') => {
    setRequestIdToProcess(requestId);
    setActionType(action);
    setOpenActionModal(true);
  };

  // 요청 처리
  const handleProcessRequest = async (requestId: number | null, action: 'approve' | 'reject', reason?: string) => {
    if (!requestId) return;
    
    setActionLoading(true);
    try {
      let result;
      if (action === 'approve') {
        result = await rentalService.approveRequest(requestId);
      } else {
        result = await rentalService.rejectRequest(requestId, reason || '');
      }
      
      if (result.success) {
        showNotification(
          action === 'approve' ? '요청이 승인되었습니다.' : '요청이 거부되었습니다.',
          'success'
        );
        setOpenActionModal(false);
        setRejectReason('');
        loadAllRequests(); // 목록 새로고침
      } else {
        showNotification(result.message || '처리 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('요청 처리 중 오류:', error);
      showNotification('요청 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 엑셀 내보내기
  const handleExportExcel = async () => {
    try {
      const response = await rentalService.exportRequestsToExcel();
      if (response.success && response.data) {
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `대여요청목록_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('엑셀 파일이 다운로드되었습니다.', 'success');
      }
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      showNotification('엑셀 내보내기에 실패했습니다.', 'error');
    }
  };

  // 알림 표시 함수
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadAllRequests();
  }, [loadAllRequests]);

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Heading level={1} className="text-2xl font-bold text-primary mb-2">
              대여/반납 요청 관리
            </Heading>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              사용자의 장비 대여 및 반납 요청을 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="secondary"
              onClick={handleExportExcel}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              엑셀 다운로드
            </Button>
            <Button 
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>
      </Card>

      {/* 검색 및 필터 섹션 */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* 검색어 입력 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="사용자명, 장비명, 사유 검색 (실시간 검색)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          {/* 필터 옵션들 */}
          <div className="flex flex-wrap gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="상태 필터"
              options={[
                { value: "", label: "전체" },
                { value: "PENDING", label: "승인 대기" },
                { value: "APPROVED", label: "승인됨" },
                { value: "REJECTED", label: "거부됨" },
                { value: "CANCELLED", label: "취소됨" }
              ]}
              className="w-40"
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="요청 유형"
              options={[
                { value: "", label: "전체" },
                { value: "RENT", label: "대여 신청" },
                { value: "RETURN", label: "반납 신청" }
              ]}
              className="w-40"
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('PENDING');
                setTypeFilter('');
              }}
              className="flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              필터 초기화
            </Button>
          </div>
        </div>
      </Card>

      {/* 요청 목록 테이블 */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <BaseTable>
                <BaseTableHead>
                  <BaseTableRow>
                    <BaseTableHeaderCell>사용자</BaseTableHeaderCell>
                    <BaseTableHeaderCell>요청 유형</BaseTableHeaderCell>
                    <BaseTableHeaderCell>장비명</BaseTableHeaderCell>
                    <BaseTableHeaderCell>요청일</BaseTableHeaderCell>
                    <BaseTableHeaderCell>요청 사유</BaseTableHeaderCell>
                    <BaseTableHeaderCell>상태</BaseTableHeaderCell>
                    <BaseTableHeaderCell>작업</BaseTableHeaderCell>
                  </BaseTableRow>
                </BaseTableHead>
                <BaseTableBody>
                  {currentPageData.map((request) => (
                    <BaseTableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <BaseTableCell>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="font-medium">{request.user.username}</span>
                        </div>
                      </BaseTableCell>
                      <BaseTableCell>
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-2 text-gray-400" />
                          {request.request_type_display}
                        </div>
                      </BaseTableCell>
                      <BaseTableCell>
                        {request.equipment_detail ? request.equipment_detail.asset_number : '정보 없음'}
                      </BaseTableCell>
                      <BaseTableCell>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {dayjs(request.created_at).format('YYYY-MM-DD')}
                        </div>
                      </BaseTableCell>
                      <BaseTableCell>
                        <div className="max-w-xs">
                          <div className="truncate" title={request.request_reason || '사유 없음'}>
                            {request.request_reason || '-'}
                          </div>
                        </div>
                      </BaseTableCell>
                      <BaseTableCell>
                        <Badge className={getRequestStatusStyle(request.status)}>
                          {request.status_display}
                        </Badge>
                      </BaseTableCell>
                      <BaseTableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDetailModal(request)}
                            className="p-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {request.status === 'PENDING' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenActionModal(request.id, 'approve')}
                                className="p-2"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleOpenActionModal(request.id, 'reject')}
                                className="p-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </BaseTableCell>
                    </BaseTableRow>
                  ))}
                  {currentPageData.length === 0 && (
                    <BaseTableRow>
                      <BaseTableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-500 dark:text-gray-400">
                          {loading ? '로딩 중...' : '요청이 없습니다.'}
                        </div>
                      </BaseTableCell>
                    </BaseTableRow>
                  )}
                </BaseTableBody>
              </BaseTable>
            </div>
            
            {/* 페이지네이션 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                총 {paginationInfo.totalItems.toLocaleString()}개 중 {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, paginationInfo.totalItems).toLocaleString()}개 표시
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">페이지당:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2"
                  >
                    처음
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2"
                  >
                    이전
                  </Button>
                  
                  <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {currentPage} / {paginationInfo.totalPages}
                  </span>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === paginationInfo.totalPages}
                    className="p-2"
                  >
                    다음
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(paginationInfo.totalPages)}
                    disabled={currentPage === paginationInfo.totalPages}
                    className="p-2"
                  >
                    마지막
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 요청 상세 정보 모달 */}
      <Modal
        isOpen={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Heading level={2} className="text-xl font-bold">
                요청 상세 정보
              </Heading>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">사용자</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.user.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">요청 유형</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.request_type_display}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">장비명</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedRequest.equipment_detail ? selectedRequest.equipment_detail.asset_number : '정보 없음'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">장비 종류</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedRequest.equipment_detail ? selectedRequest.equipment_detail.equipment_type_display : '정보 없음'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">요청일</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {dayjs(selectedRequest.created_at).format('YYYY-MM-DD HH:mm')}
                </p>
              </div>
              {selectedRequest.expected_return_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">반납 예정일</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {dayjs(selectedRequest.expected_return_date).format('YYYY-MM-DD')}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">상태</label>
                <Badge className={getRequestStatusStyle(selectedRequest.status)}>
                  {selectedRequest.status_display}
                </Badge>
              </div>
              {selectedRequest.processed_by && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">처리자</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.processed_by.name}</p>
                </div>
              )}
              {selectedRequest.processed_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">처리일시</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {dayjs(selectedRequest.processed_at).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
              )}
            </div>
            
            {selectedRequest.request_reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">요청사유</label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.request_reason}</p>
                </div>
              </div>
            )}
            
            {selectedRequest.reject_reason && (
              <div>
                <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">거부 사유</label>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-900 dark:text-red-300">{selectedRequest.reject_reason}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setOpenDetailModal(false)}
              >
                닫기
              </Button>
              {selectedRequest.status === 'PENDING' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setOpenDetailModal(false);
                      handleOpenActionModal(selectedRequest.id, 'approve');
                    }}
                  >
                    승인
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setOpenDetailModal(false);
                      handleOpenActionModal(selectedRequest.id, 'reject');
                    }}
                  >
                    거부
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 승인/거부 모달 */}
      <Modal
        isOpen={openActionModal}
        onClose={() => {
          setOpenActionModal(false);
          setRejectReason('');
        }}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Heading level={2} className="text-xl font-bold">
              {actionType === 'approve' ? '요청 승인' : '요청 거부'}
            </Heading>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {actionType === 'approve' 
              ? '이 요청을 승인하시겠습니까? 승인 시 장비 상태가 변경됩니다.' 
              : '이 요청을 거부하시겠습니까?'}
          </p>
          
          {actionType === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">거절 사유</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거절 사유를 입력하세요"
                rows={4}
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setOpenActionModal(false);
                setRejectReason('');
              }}
              disabled={actionLoading}
            >
              취소
            </Button>
            <Button
              variant={actionType === 'approve' ? 'primary' : 'danger'}
              onClick={() => {
                if (actionType === 'reject' && !rejectReason) {
                  showNotification('거절 사유를 입력해주세요.', 'error');
                  return;
                }
                requestIdToProcess && handleProcessRequest(requestIdToProcess, actionType, rejectReason);
              }}
              disabled={actionLoading}
              className="flex items-center"
            >
              {actionLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {actionType === 'approve' ? '승인' : '거부'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 알림 */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          notification.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
} 