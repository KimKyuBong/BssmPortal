'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import dnsService, { DnsRequest, DnsRecord } from '@/services/dns';

export default function AdminDnsManagementPage() {
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<DnsRequest[]>([]);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<DnsRecord[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<DnsRequest[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', type: 'success' });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  // DNS 레코드 관리용 상태
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: DnsRecord | null }>({ open: false, record: null });
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; record: DnsRecord | null }>({ open: false, record: null });
  const [recordForm, setRecordForm] = useState({ domain: '', ip: '' });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await dnsService.getRequests();
      const allRequests = res.data;
      setRequests(allRequests.filter((req: DnsRequest) => req.status === '대기'));
      setRejectedRequests(allRequests.filter((req: DnsRequest) => req.status === '거절'));
    } catch (e) {
      setSnackbar({ open: true, message: '신청 목록을 불러오지 못했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await dnsService.getAllRecords();
      const allRecords = res.data;
      setRecords(allRecords);
      setApprovedRecords(allRecords); // 승인된 도메인들
      // 삭제된 도메인은 별도 API가 필요할 수 있으므로 일단 빈 배열로 설정
      setDeletedRecords([]);
    } catch (e) {
      setSnackbar({ open: true, message: '등록 도메인 목록을 불러오지 못했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 0) fetchRecords();
    else if (tab === 1) fetchRequests();
    else if (tab === 2) fetchRequests();
    else if (tab === 3) fetchRecords();
  }, [tab]);

  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar({ ...snackbar, open: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  const handleApprove = async (id: number) => {
    try {
      await dnsService.approveRequest(id);
      setSnackbar({ open: true, message: '승인 완료', type: 'success' });
      fetchRequests();
    } catch {
      setSnackbar({ open: true, message: '승인 실패', type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.id) return;
    try {
      await dnsService.rejectRequest(rejectDialog.id, rejectReason);
      setSnackbar({ open: true, message: '거절 완료', type: 'success' });
      setRejectDialog({ open: false, id: null });
      setRejectReason('');
      fetchRequests();
    } catch {
      setSnackbar({ open: true, message: '거절 실패', type: 'error' });
    }
  };

  const handleApply = async () => {
    try {
      await dnsService.applyDns();
      setSnackbar({ open: true, message: '동기화 완료', type: 'success' });
    } catch {
      setSnackbar({ open: true, message: '동기화 실패', type: 'error' });
    }
  };

  // DNS 레코드 관리 함수들
  const handleAddRecord = async () => {
    try {
      const response = await dnsService.createRecord(recordForm);
      setSnackbar({ open: true, message: '도메인이 추가되었습니다.', type: 'success' });
      setAddDialog(false);
      setRecordForm({ domain: '', ip: '' });
      fetchRecords();
    } catch (error: any) {
      let errorMessage = '도메인 추가 실패';
      if (error?.response?.data?.domain) {
        errorMessage = error.response.data.domain[0] || error.response.data.domain;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setSnackbar({ open: true, message: errorMessage, type: 'error' });
    }
  };

  const handleEditRecord = async () => {
    if (!editDialog.record) return;
    try {
      const response = await dnsService.updateRecord(editDialog.record.id, recordForm);
      setSnackbar({ open: true, message: '도메인이 수정되었습니다.', type: 'success' });
      setEditDialog({ open: false, record: null });
      setRecordForm({ domain: '', ip: '' });
      fetchRecords();
    } catch (error: any) {
      let errorMessage = '도메인 수정 실패';
      if (error?.response?.data?.domain) {
        errorMessage = error.response.data.domain[0] || error.response.data.domain;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setSnackbar({ open: true, message: errorMessage, type: 'error' });
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteDialog.record) return;
    try {
      await dnsService.deleteRecord(deleteDialog.record.id);
      setSnackbar({ open: true, message: '도메인이 삭제되었습니다.', type: 'success' });
      setDeleteDialog({ open: false, record: null });
      fetchRecords();
    } catch {
      setSnackbar({ open: true, message: '도메인 삭제 실패', type: 'error' });
    }
  };

  const openEditDialog = (record: DnsRecord) => {
    setRecordForm({ domain: record.original_domain, ip: record.ip });
    setEditDialog({ open: true, record });
  };

  const openAddDialog = () => {
    setRecordForm({ domain: '', ip: '' });
    setAddDialog(true);
  };

  // 스낵바 스타일 클래스
  const getSnackbarClasses = () => {
    const baseClasses = "fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300";
    switch (snackbar.type) {
      case 'success': return `${baseClasses} bg-green-500 text-white`;
      case 'error': return `${baseClasses} bg-red-500 text-white`;
      case 'warning': return `${baseClasses} bg-yellow-500 text-white`;
      case 'info': return `${baseClasses} bg-blue-500 text-white`;
      default: return `${baseClasses} bg-gray-500 text-white`;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">교내 DNS 관리</h1>
      
      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTab(0)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 0 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            승인된 도메인 ({approvedRecords.length})
          </button>
          <button
            onClick={() => setTab(1)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 1 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            신청 목록 ({requests.length})
          </button>
          <button
            onClick={() => setTab(2)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 2 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            거절된 신청 ({rejectedRequests.length})
          </button>
          <button
            onClick={() => setTab(3)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 3 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            삭제된 도메인 ({deletedRecords.length})
          </button>
        </nav>
      </div>

      {/* 승인된 도메인 목록 탭 */}
      {tab === 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">승인된 도메인 목록</h2>
            <button
              onClick={openAddDialog}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              도메인 추가
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도메인</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rec.original_domain}</div>
                          {rec.domain !== rec.original_domain && (
                            <div className="text-sm text-gray-500">({rec.domain})</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.ip}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.created_at}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditDialog(rec)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, record: rec })}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 동기화 버튼 - 승인된 도메인 탭에서만 표시 */}
          <div className="mt-4">
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              동기화(적용)
            </button>
          </div>
        </div>
      )}

      {/* 신청 목록 탭 */}
      {tab === 1 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">도메인 등록 신청 목록</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도메인</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사유</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">처리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{req.original_domain}</div>
                          {req.domain !== req.original_domain && (
                            <div className="text-sm text-gray-500">({req.domain})</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.ip}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.user}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          req.status === '대기' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === '승인' ? 'bg-green-100 text-green-800' :
                          req.status === '삭제됨' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {req.status === '대기' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => setRejectDialog({ open: true, id: req.id })}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              거절
                            </button>
                          </div>
                        )}
                        {req.status === '거절' && req.reject_reason && (
                          <div className="text-xs text-red-600">사유: {req.reject_reason}</div>
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

      {/* 거절된 신청 목록 탭 */}
      {tab === 2 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">거절된 도메인 신청 목록</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도메인</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">거절 사유</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">처리일</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rejectedRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{req.original_domain}</div>
                          {req.domain !== req.original_domain && (
                            <div className="text-sm text-gray-500">({req.domain})</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.ip}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.user}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {req.reject_reason || '사유 없음'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {req.processed_at || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 삭제된 도메인 목록 탭 */}
      {tab === 3 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">삭제된 도메인 목록</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도메인</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">삭제일</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rec.original_domain}</div>
                          {rec.domain !== rec.original_domain && (
                            <div className="text-sm text-gray-500">({rec.domain})</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.ip}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.created_at}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}



      {/* 스낵바 */}
      {snackbar.open && (
        <div className={getSnackbarClasses()}>
          <div className="flex items-center justify-between">
            <span>{snackbar.message}</span>
            <button
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              className="ml-4 text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 거절 다이얼로그 */}
      {rejectDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">도메인 등록 요청 거절</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">거절 사유</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRejectDialog({ open: false, id: null })}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                거절
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도메인 추가 다이얼로그 */}
      {addDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">새 도메인 추가</h3>
            
            {/* 도메인 형식 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📝 도메인 형식 안내</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>올바른 형식:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code>example.com</code> - 영문 도메인</li>
                  <li><code>사이트.kr</code> - 한글 + 영문 확장자</li>
                  <li><code>도메인.한국</code> - 한글 도메인</li>
                  <li><code>my-site.info</code> - 하이픈 포함 (시작/끝 제외)</li>
                </ul>
                <p className="mt-2"><strong>지원 확장자:</strong></p>
                <p className="text-xs">.com, .net, .org, .kr, .한국, .info, .app, .dev, .io, .tech 등</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  도메인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recordForm.domain}
                  onChange={e => setRecordForm({ ...recordForm, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: example.com, 사이트.kr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recordForm.ip}
                  onChange={e => setRecordForm({ ...recordForm, ip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 192.168.1.100"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setAddDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleAddRecord}
                disabled={!recordForm.domain || !recordForm.ip}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도메인 편집 다이얼로그 */}
      {editDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">도메인 편집</h3>
            
            {/* 도메인 형식 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📝 도메인 형식 안내</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>올바른 형식:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code>example.com</code> - 영문 도메인</li>
                  <li><code>사이트.kr</code> - 한글 + 영문 확장자</li>
                  <li><code>도메인.한국</code> - 한글 도메인</li>
                  <li><code>my-site.info</code> - 하이픈 포함 (시작/끝 제외)</li>
                </ul>
                <p className="mt-2"><strong>지원 확장자:</strong></p>
                <p className="text-xs">.com, .net, .org, .kr, .한국, .info, .app, .dev, .io, .tech 등</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  도메인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recordForm.domain}
                  onChange={e => setRecordForm({ ...recordForm, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: example.com, 사이트.kr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recordForm.ip}
                  onChange={e => setRecordForm({ ...recordForm, ip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 192.168.1.100"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditDialog({ open: false, record: null })}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleEditRecord}
                disabled={!recordForm.domain || !recordForm.ip}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도메인 삭제 확인 다이얼로그 */}
      {deleteDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">도메인 삭제 확인</h3>
            <p className="text-gray-700 mb-6">
              정말로 도메인 "{deleteDialog.record?.original_domain}"을(를) 삭제하시겠습니까?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteDialog({ open: false, record: null })}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleDeleteRecord}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 