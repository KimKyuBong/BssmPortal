'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Info, RefreshCw, Clock, CheckCircle, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import authService from '@/services/auth';
import rentalService from '@/services/rental';
import { Rental, RentalRequest, RENTAL_STATUS } from '@/services/api';
import dayjs from 'dayjs';
import { useToastContext } from '@/contexts/ToastContext';
import { formatDateToKorean } from '@/utils/dateUtils';
import { Card, Button, BaseTable, BaseTableHead, BaseTableHeaderCell, BaseTableBody, BaseTableRow, BaseTableCell, Heading, Text, Input } from '@/components/ui/StyledComponents';

export default function RentalHistoryPage() {
  const { showSuccess } = useToastContext();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentRentals, setCurrentRentals] = useState<Rental[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [rentalHistory, setRentalHistory] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'requests' | 'history'>('current');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
        await fetchAllData();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCurrentRentals(),
        fetchRentalRequests(),
        fetchRentalHistory()
      ]);
    } catch (error) {
      console.error('Data fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRentals = async () => {
    try {
      const response = await rentalService.getMyRentals();
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.results;
        setCurrentRentals(data);
      }
    } catch (error) {
      console.error('Current rentals fetch failed:', error);
    }
  };

  const fetchRentalRequests = async () => {
    try {
      const response = await rentalService.getMyRequests();
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.results;
        setRentalRequests(data);
      }
    } catch (error) {
      console.error('Rental requests fetch failed:', error);
    }
  };

  const fetchRentalHistory = async () => {
    try {
      const response = await rentalService.getMyRentalHistory();
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.results;
        setRentalHistory(data);
      }
    } catch (error) {
      console.error('Rental history fetch failed:', error);
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    showSuccess('새로고침 완료', '데이터가 새로고침되었습니다.');
  };

  const handleOpenReturnModal = (rental: Rental) => {
    setSelectedRental(rental);
    setShowReturnModal(true);
  };

  // 반납 신청 처리
  const handleReturnRequest = async () => {
    if (!selectedRental) return;
    
    if (!returnReason.trim()) {
      showSuccess('입력 오류', '반납 사유를 입력해주세요.');
      return;
    }

    try {
      setSubmittingReturn(true);
      
      const result = await rentalService.createRentalRequest({
        equipment: selectedRental.equipment.id,
        request_type: "RETURN",
        request_reason: returnReason.trim()
      });

      if (result && (result.success || result.data)) {
        showSuccess('반납 신청 완료', '반납 신청이 완료되었습니다.');
        setShowReturnModal(false);
        setSelectedRental(null);
        setReturnReason('');
        // 데이터 갱신
        await fetchAllData();
      } else {
        // 이미 진행 중인 요청이 있는 경우
        if (result.error) {
          if (typeof result.error === 'object' && 'detail' in result.error) {
            const errorDetail = result.error as { detail: string; existing_request?: any };
            if (errorDetail.detail === "이미 진행 중인 요청이 있습니다." && errorDetail.existing_request) {
              showSuccess('진행 중인 요청', `이미 ${errorDetail.existing_request.request_type}이 진행 중입니다. (${dayjs(errorDetail.existing_request.requested_date).format('MM-DD HH:mm')})`);
            } else {
              showSuccess('반납 신청 실패', errorDetail.detail || '반납 신청 중 오류가 발생했습니다.');
            }
          } else if (typeof result.error === 'string') {
            showSuccess('반납 신청 실패', result.error);
          } else {
            showSuccess('반납 신청 실패', '반납 신청 중 오류가 발생했습니다.');
          }
        }
      }
    } catch (error) {
      console.error('반납 신청 중 오류 발생:', error);
      showSuccess('반납 신청 오류', '반납 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDateToKorean(date);
  };

  // 대여 상태에 따른 CSS 클래스 반환
  const getRentalStatusClass = (status: string) => {
    switch (status) {
      case 'RENTED':
        return 'bg-blue-100 text-blue-800';
      case 'RETURNED':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 요청 상태에 따른 CSS 클래스 반환
  const getRequestStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <History className="h-8 w-8 text-blue-500 mr-3" />
            <Heading level={1} className="text-2xl font-bold text-primary">
              내 대여 관리
            </Heading>
          </div>
          <Button
            onClick={handleRefresh}
            variant="secondary"
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </Card>

      {/* 탭 네비게이션 */}
      <Card>
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'current'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 mr-2" />
            현재 대여 ({currentRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'requests'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            신청 내역 ({rentalRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <History className="h-4 w-4 mr-2" />
            대여 이력 ({rentalHistory.length})
          </button>
        </div>
      </Card>

      {/* 현재 대여 현황 */}
      {activeTab === 'current' && (
        <Card>
          <Heading level={2} className="text-xl font-semibold mb-4">
            현재 대여 현황
          </Heading>
          {currentRentals.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <Text className="text-gray-500 text-lg">현재 대여 중인 장비가 없습니다.</Text>
            </div>
          ) : (
            <BaseTable>
              <BaseTableHead>
                <BaseTableRow>
                  <BaseTableHeaderCell>장비 정보</BaseTableHeaderCell>
                  <BaseTableHeaderCell>대여일</BaseTableHeaderCell>
                  <BaseTableHeaderCell>반납 예정일</BaseTableHeaderCell>
                  <BaseTableHeaderCell>상태</BaseTableHeaderCell>
                  <BaseTableHeaderCell>비고</BaseTableHeaderCell>
                  <BaseTableHeaderCell>작업</BaseTableHeaderCell>
                </BaseTableRow>
              </BaseTableHead>
              <BaseTableBody>
                {currentRentals
                  .map((rental) => (
                  <BaseTableRow key={rental.id}>
                    <BaseTableCell>
                      <div>
                        <Text className="text-sm font-medium text-primary">
                          {rental.equipment.manufacturer} {rental.equipment.model_name}
                        </Text>
                        <Text className="text-sm text-secondary">
                          {rental.equipment.equipment_type_display} - {rental.equipment.asset_number}
                        </Text>
                      </div>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{formatDate(rental.rental_date)}</Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{formatDate(rental.due_date)}</Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRentalStatusClass(rental.status)}`}>
                        {rental.status_display}
                      </span>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{rental.notes || '-'}</Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      {rental.status === 'RENTED' || rental.status === 'OVERDUE' ? (
                        rental.pending_request ? (
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                              <Text className="text-yellow-600 text-xs font-medium">
                                반납 신청 중
                              </Text>
                            </div>
                            <div className="text-secondary text-xs space-y-1">
                              <div>신청일: {dayjs(rental.pending_request.requested_date).format('MM-DD HH:mm')}</div>
                              {rental.pending_request.request_reason && (
                                <div>사유: {rental.pending_request.request_reason}</div>
                              )}
                              <div className="text-blue-600">관리자 승인 대기 중</div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleOpenReturnModal(rental)}
                            variant="danger"
                            size="sm"
                            className="flex items-center"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            반납 신청
                          </Button>
                        )
                      ) : (
                        <Text className="text-gray-400 text-sm">반납 완료</Text>
                      )}
                    </BaseTableCell>
                  </BaseTableRow>
                ))}
              </BaseTableBody>
            </BaseTable>
          )}
        </Card>
      )}

      {/* 대여 신청 내역 */}
      {activeTab === 'requests' && (
        <Card>
          <Heading level={2} className="text-xl font-semibold mb-4">
            대여 신청 내역
          </Heading>
          {rentalRequests.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <Text className="text-gray-500 text-lg">신청한 대여 내역이 없습니다.</Text>
            </div>
          ) : (
            <BaseTable>
              <BaseTableHead>
                <BaseTableRow>
                  <BaseTableHeaderCell>장비 정보</BaseTableHeaderCell>
                  <BaseTableHeaderCell>요청 유형</BaseTableHeaderCell>
                  <BaseTableHeaderCell>신청일</BaseTableHeaderCell>
                  <BaseTableHeaderCell>반납 예정일</BaseTableHeaderCell>
                  <BaseTableHeaderCell>상태</BaseTableHeaderCell>
                  <BaseTableHeaderCell>요청 사유</BaseTableHeaderCell>
                </BaseTableRow>
              </BaseTableHead>
              <BaseTableBody>
                {rentalRequests
                  .map((request) => (
                  <BaseTableRow key={request.id}>
                    <BaseTableCell>
                      <div>
                        <Text className="text-sm font-medium text-primary">
                          {request.equipment_detail?.manufacturer} {request.equipment_detail?.model_name}
                        </Text>
                        <Text className="text-sm text-secondary">
                          {request.equipment_detail?.equipment_type_display} - {request.equipment_detail?.asset_number}
                        </Text>
                      </div>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{request.request_type_display}</Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{formatDate(request.requested_date)}</Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">
                        {request.expected_return_date ? formatDate(request.expected_return_date) : '-'}
                      </Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRequestStatusClass(request.status)}`}>
                        {request.status_display}
                      </span>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{request.request_reason || '-'}</Text>
                    </BaseTableCell>
                  </BaseTableRow>
                ))}
              </BaseTableBody>
            </BaseTable>
          )}
        </Card>
      )}

      {/* 대여 이력 */}
      {activeTab === 'history' && (
        <Card>
          <Heading level={2} className="text-xl font-semibold mb-4">
            대여 이력
          </Heading>
          {rentalHistory.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <Text className="text-gray-500 text-lg">대여 이력이 없습니다.</Text>
            </div>
          ) : (
            <BaseTable>
              <BaseTableHead>
                <BaseTableRow>
                  <BaseTableHeaderCell>장비 정보</BaseTableHeaderCell>
                  <BaseTableHeaderCell>대여일</BaseTableHeaderCell>
                  <BaseTableHeaderCell>반납일</BaseTableHeaderCell>
                  <BaseTableHeaderCell>상태</BaseTableHeaderCell>
                  <BaseTableHeaderCell>비고</BaseTableHeaderCell>
                </BaseTableRow>
              </BaseTableHead>
              <BaseTableBody>
                {rentalHistory
                  .map((rental) => (
                  <BaseTableRow key={rental.id}>
                    <BaseTableCell>
                      <div>
                        <Text className="text-sm font-medium text-primary">
                          {rental.equipment.manufacturer} {rental.equipment.model_name}
                        </Text>
                        <Text className="text-sm text-secondary">
                          {rental.equipment.equipment_type_display} - {rental.equipment.asset_number}
                        </Text>
                      </div>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{formatDate(rental.rental_date)}</Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">
                        {rental.return_date ? formatDate(rental.return_date) : '-'}
                      </Text>
                    </BaseTableCell>
                    <BaseTableCell>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRentalStatusClass(rental.status)}`}>
                        {rental.status_display}
                      </span>
                    </BaseTableCell>
                    <BaseTableCell>
                      <Text className="text-sm text-secondary">{rental.notes || '-'}</Text>
                    </BaseTableCell>
                  </BaseTableRow>
                ))}
              </BaseTableBody>
            </BaseTable>
          )}
        </Card>
      )}

      {/* 반납 신청 모달 */}
      {showReturnModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <Heading level={3} className="text-lg font-medium mb-4">
              반납 신청
            </Heading>
            
            <div className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">
                <strong>장비:</strong> {selectedRental.equipment.manufacturer} {selectedRental.equipment.model_name}
              </Text>
              <Text className="text-sm text-gray-600">
                <strong>반납 예정일:</strong> {formatDate(selectedRental.due_date)}
              </Text>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                반납 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="반납 사유를 입력해주세요..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedRental(null);
                  setReturnReason('');
                }}
                variant="secondary"
              >
                취소
              </Button>
              <Button
                onClick={handleReturnRequest}
                disabled={submittingReturn || !returnReason.trim()}
                variant="danger"
              >
                {submittingReturn ? '처리 중...' : '반납 신청'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}