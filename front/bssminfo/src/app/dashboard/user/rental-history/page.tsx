'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Info, Search, RefreshCw, Clock, CheckCircle, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import authService from '@/services/auth';
import rentalService from '@/services/rental';
import { Rental, RentalRequest, RENTAL_STATUS } from '@/services/api';
import { message } from 'antd';
import dayjs from 'dayjs';

export default function RentalHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentRentals, setCurrentRentals] = useState<Rental[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [rentalHistory, setRentalHistory] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'requests' | 'history'>('current');
  const [returnLoading, setReturnLoading] = useState<number | null>(null);
  
  // 반납 신청 모달 상태
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const userResponse = await authService.getCurrentUser();
        if (!userResponse.success || !userResponse.data) {
          router.push('/login');
          return;
        }
        
        setUser(userResponse.data);
        await fetchAllData();
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        console.error('Rental data error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndData();
  }, [router]);
  
  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCurrentRentals(),
        fetchRentalRequests(),
        fetchRentalHistory()
      ]);
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRentals = async () => {
    try {
      const response = await rentalService.getMyRentals();
      if (response.success && response.data) {
        let rentalData: Rental[];
        if ('results' in response.data) {
          rentalData = response.data.results;
        } else {
          rentalData = response.data;
        }
        
        console.log('현재 대여 데이터:', rentalData);
        console.log('첫 번째 대여의 pending_request:', rentalData[0]?.pending_request);
        
        setCurrentRentals(rentalData);
      }
    } catch (err) {
      console.error('Current rentals error:', err);
    }
  };

  const fetchRentalRequests = async () => {
    try {
      const response = await rentalService.getMyRequests();
      if (response.success && response.data) {
        if ('results' in response.data) {
          setRentalRequests(response.data.results);
        } else {
          setRentalRequests(response.data);
        }
      }
    } catch (err) {
      console.error('Rental requests error:', err);
    }
  };

  const fetchRentalHistory = async () => {
    try {
      const response = await rentalService.getMyRentalHistory();
      if (response.success && response.data) {
        if ('results' in response.data) {
          setRentalHistory(response.data.results);
        } else {
          setRentalHistory(response.data);
        }
      }
    } catch (err) {
      console.error('Rental history error:', err);
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    message.success('데이터가 새로고침되었습니다.');
  };

  // 반납 신청 모달 열기
  const handleOpenReturnModal = (rental: Rental) => {
    setSelectedRental(rental);
    setReturnReason('');
    setShowReturnModal(true);
  };

  // 반납 신청 처리
  const handleReturnRequest = async () => {
    if (!selectedRental) return;
    
    if (!returnReason.trim()) {
      message.warning('반납 사유를 입력해주세요.');
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
        message.success('반납 신청이 완료되었습니다.');
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
              message.warning(`이미 ${errorDetail.existing_request.request_type}이 진행 중입니다. (${dayjs(errorDetail.existing_request.requested_date).format('MM-DD HH:mm')})`);
            } else {
              message.error(errorDetail.detail || '반납 신청 중 오류가 발생했습니다.');
            }
          } else if (typeof result.error === 'string') {
            message.error(result.error);
          } else {
            message.error('반납 신청 중 오류가 발생했습니다.');
          }
        }
      }
    } catch (error) {
      console.error('반납 신청 중 오류 발생:', error);
      message.error('반납 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmittingReturn(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('YYYY-MM-DD HH:mm');
  };
  
  const getRentalStatusClass = (status: string) => {
    switch (status) {
      case RENTAL_STATUS.RENTED:
        return 'bg-green-100 text-green-800';
      case RENTAL_STATUS.OVERDUE:
        return 'bg-red-100 text-red-800';
      case RENTAL_STATUS.RETURNED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <History className="h-8 w-8 text-blue-500 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">내 대여 관리</h1>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'current'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4 mr-2" />
          현재 대여 ({currentRentals.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'requests'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          신청 내역 ({rentalRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="h-4 w-4 mr-2" />
          대여 이력 ({rentalHistory.length})
        </button>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
            placeholder="장비 이름 또는 유형 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 현재 대여 현황 */}
      {activeTab === 'current' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">현재 대여 현황</h2>
          {currentRentals.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">현재 대여 중인 장비가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장비 정보</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대여일</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">반납 예정일</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentRentals
                    .filter(rental => 
                      rental.equipment?.asset_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      rental.equipment?.equipment_type_display?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((rental) => (
                    <tr key={rental.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {rental.equipment.manufacturer} {rental.equipment.model_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rental.equipment.equipment_type_display} - {rental.equipment.asset_number}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(rental.rental_date)}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(rental.due_date)}</td>
                      <td className="py-4 px-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRentalStatusClass(rental.status)}`}>
                          {rental.status_display}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{rental.notes || '-'}</td>
                      <td className="py-4 px-4 text-sm">
                        {rental.status === 'RENTED' || rental.status === 'OVERDUE' ? (
                          rental.pending_request ? (
                            <div className="flex flex-col">
                              <div className="flex items-center mb-1">
                                <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                                <span className="text-yellow-600 text-xs font-medium">
                                  반납 신청 중
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs space-y-1">
                                <div>신청일: {dayjs(rental.pending_request.requested_date).format('MM-DD HH:mm')}</div>
                                {rental.pending_request.request_reason && (
                                  <div>사유: {rental.pending_request.request_reason}</div>
                                )}
                                <div className="text-blue-600">관리자 승인 대기 중</div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenReturnModal(rental)}
                              className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              반납 신청
                            </button>
                          )
                        ) : (
                          <span className="text-gray-400 text-sm">반납 완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 대여 신청 내역 */}
      {activeTab === 'requests' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">대여 신청 내역</h2>
          {rentalRequests.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">신청한 대여 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장비 정보</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청 유형</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청일</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">반납 예정일</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청 사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rentalRequests
                    .filter(request => 
                      request.equipment_detail?.asset_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      request.equipment_detail?.equipment_type_display?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.equipment_detail?.manufacturer} {request.equipment_detail?.model_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.equipment_detail?.equipment_type_display} - {request.equipment_detail?.asset_number}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{request.request_type_display}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(request.requested_date)}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {request.expected_return_date ? formatDate(request.expected_return_date) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRequestStatusClass(request.status)}`}>
                          {request.status_display}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{request.request_reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 대여 이력 */}
      {activeTab === 'history' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">대여 이력</h2>
          {rentalHistory.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">대여 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장비 정보</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대여일</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">반납일</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rentalHistory
                    .filter(rental => 
                      rental.equipment?.asset_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      rental.equipment?.equipment_type_display?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((rental) => (
                    <tr key={rental.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {rental.equipment.manufacturer} {rental.equipment.model_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rental.equipment.equipment_type_display} - {rental.equipment.asset_number}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(rental.rental_date)}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {rental.return_date ? formatDate(rental.return_date) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRentalStatusClass(rental.status)}`}>
                          {rental.status_display}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{rental.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* 반납 신청 모달 */}
      {showReturnModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">반납 신청</h3>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedRental(null);
                  setReturnReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <h4 className="font-medium text-gray-900 mb-2">선택된 장비</h4>
                <div className="text-sm text-gray-600">
                  <div>{selectedRental.equipment.manufacturer} {selectedRental.equipment.model_name}</div>
                  <div>{selectedRental.equipment.equipment_type_display} - {selectedRental.equipment.asset_number}</div>
                  <div className="mt-1 text-gray-500">
                    대여일: {formatDate(selectedRental.rental_date)}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반납 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="반납 사유를 입력해주세요 (예: 사용 완료, 고장, 기타 사유 등)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {returnReason.length}/500자
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedRental(null);
                  setReturnReason('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={submittingReturn}
              >
                취소
              </button>
              <button
                onClick={handleReturnRequest}
                disabled={submittingReturn || !returnReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {submittingReturn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    처리 중...
                  </>
                ) : (
                  '반납 신청하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}