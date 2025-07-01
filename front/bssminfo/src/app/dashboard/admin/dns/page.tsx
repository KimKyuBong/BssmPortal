'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Globe, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import dnsService, { DnsRequest, DnsRecord } from '@/services/dns';
import { parseDomain, convertDomainsToUnicode, punycodeToUnicode, unicodeToPunycode } from '@/utils/punycode';
import { 
  Card, 
  Heading, 
  Text, 
  Input, 
  Button, 
  Badge,
  Alert,
  Modal,
  Tabs,
  Tab,
  Textarea
} from '@/components/ui/StyledComponents';
import DnsTable from '@/components/admin/DnsTable';

export default function AdminDnsManagementPage() {
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<DnsRequest[]>([]);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<DnsRecord[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<DnsRequest[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  // DNS 레코드 관리용 상태
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: DnsRecord | null }>({ open: false, record: null });
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; record: DnsRecord | null }>({ open: false, record: null });
  const [recordForm, setRecordForm] = useState({ domain: '', ip: '' });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });
    
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await dnsService.getRequests();
      const allRequests = res.data;
      // 타입 캐스팅으로 변환
      const convertedRequests = allRequests.map((req: any) => {
        const isPunycode = req.domain && req.domain.includes('xn--');
        return {
          ...req,
          domain: isPunycode ? punycodeToUnicode(req.domain) : req.domain,
          original_domain: req.domain
        };
      });
      setRequests(convertedRequests.filter((req: any) => req.status === '대기'));
      setRejectedRequests(convertedRequests.filter((req: any) => req.status === '거절'));
    } catch (e) {
      showNotification('신청 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await dnsService.getAllRecords();
      const allRecords = res.data;
      // 타입 캐스팅으로 변환
      const convertedRecords = allRecords.map((rec: any) => {
        const isPunycode = rec.domain && rec.domain.includes('xn--');
        return {
          ...rec,
          domain: isPunycode ? punycodeToUnicode(rec.domain) : rec.domain,
          original_domain: rec.domain
        };
      });
      setRecords(convertedRecords);
      setApprovedRecords(convertedRecords);
      setDeletedRecords([]);
    } catch (e) {
      showNotification('등록 도메인 목록을 불러오지 못했습니다.', 'error');
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

  // 퓨니코드 변환 테스트
  useEffect(() => {
    console.log('퓨니코드 변환 테스트:');
    console.log('한글 -> 퓨니코드:', unicodeToPunycode('한글.bssm.hs.kr'));
    console.log('퓨니코드 -> 한글:', punycodeToUnicode('xn--bj0bj06e.bssm.hs.kr'));
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await dnsService.approveRequest(id);
      showNotification('승인 완료', 'success');
      fetchRequests();
    } catch {
      showNotification('승인 실패', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.id) return;
    try {
      await dnsService.rejectRequest(rejectDialog.id, rejectReason);
      showNotification('거절 완료', 'success');
      setRejectDialog({ open: false, id: null });
      setRejectReason('');
      fetchRequests();
    } catch {
      showNotification('거절 실패', 'error');
    }
  };

  const handleApply = async () => {
    try {
      await dnsService.applyDns();
      showNotification('동기화 완료', 'success');
    } catch {
      showNotification('동기화 실패', 'error');
    }
  };

  // DNS 레코드 관리 함수들
  const handleAddRecord = async () => {
    try {
      const response = await dnsService.createRecord(recordForm);
      showNotification('도메인이 추가되었습니다.', 'success');
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
      showNotification(errorMessage, 'error');
    }
  };

  const handleEditRecord = async () => {
    if (!editDialog.record) return;
    try {
      const response = await dnsService.updateRecord(editDialog.record.id, recordForm);
      showNotification('도메인이 수정되었습니다.', 'success');
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
      showNotification(errorMessage, 'error');
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteDialog.record) return;
    try {
      await dnsService.deleteRecord(deleteDialog.record.id);
      showNotification('도메인이 삭제되었습니다.', 'success');
      setDeleteDialog({ open: false, record: null });
      fetchRecords();
    } catch {
      showNotification('도메인 삭제 실패', 'error');
    }
  };

  const handleDownloadSslPackage = async (domain: string) => {
    try {
      const response = await dnsService.downloadSslPackage(domain);
      
      if (response.success && response.data) {
        // ZIP 파일 다운로드
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${domain}_ssl_package.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('SSL 패키지 다운로드 완료 - 매번 새로운 개인키가 생성됩니다', 'success');
      } else {
        throw new Error('SSL 패키지 다운로드에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('SSL 패키지 다운로드 실패:', error);
      let errorMessage = 'SSL 패키지 다운로드에 실패했습니다.';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      showNotification(errorMessage, 'error');
    }
  };

  const openEditDialog = (record: DnsRecord) => {
    setRecordForm({ domain: record.original_domain || record.domain || '', ip: record.ip });
    setEditDialog({ open: true, record });
  };

  const openAddDialog = () => {
    setRecordForm({ domain: '', ip: '' });
    setAddDialog(true);
  };

  // 도메인 입력 시 퓨니코드 변환 결과를 보여주는 함수
  const getDomainPreview = (domain: string) => {
    if (!domain) return null;
    
    try {
      // 한글이 포함된 도메인인지 확인
      const hasKorean = /[가-힣]/.test(domain);
      if (hasKorean) {
        const punycode = unicodeToPunycode(domain);
        return {
          original: domain,
          punycode: punycode,
          type: 'korean'
        };
      }
      
      // 퓨니코드인지 확인
      if (domain.includes('xn--')) {
        const unicode = punycodeToUnicode(domain);
        return {
          original: unicode,
          punycode: domain,
          type: 'punycode'
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const domainPreview = getDomainPreview(recordForm.domain);

  return (
    <div className="p-4 lg:p-6">
      {/* 알림 표시 */}
      {notification.show && (
        <div className="mb-4">
          <Alert 
            type={notification.type} 
            message={notification.message}
            onClose={() => setNotification(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}

      <Heading level={1} className="mb-6 flex items-center">
        <Globe className="w-8 h-8 mr-3 text-blue-500" />
        교내 DNS 관리
      </Heading>
      
      {/* 탭 네비게이션 */}
      <Tabs className="mb-6">
        <nav className="-mb-px flex space-x-8">
          <Tab
            active={tab === 0}
            onClick={() => setTab(0)}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            승인된 도메인 ({approvedRecords.length})
          </Tab>
          <Tab
            active={tab === 1}
            onClick={() => setTab(1)}
            icon={<Clock className="w-4 h-4" />}
          >
            신청 목록 ({requests.length})
          </Tab>
          <Tab
            active={tab === 2}
            onClick={() => setTab(2)}
            icon={<XCircle className="w-4 h-4" />}
          >
            거절된 신청 ({rejectedRequests.length})
          </Tab>
          <Tab
            active={tab === 3}
            onClick={() => setTab(3)}
            icon={<AlertCircle className="w-4 h-4" />}
          >
            삭제된 도메인 ({deletedRecords.length})
          </Tab>
        </nav>
      </Tabs>

      {/* 승인된 도메인 목록 탭 */}
      {tab === 0 && (
        <div className="space-y-6">
          {/* 헤더 및 액션 카드 */}
          <Card>
            <div className="flex justify-between items-center">
              <Heading level={3}>승인된 도메인 목록</Heading>
              <Button
                onClick={openAddDialog}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>도메인 추가</span>
              </Button>
            </div>
          </Card>
          
          {/* 테이블 카드 */}
          <Card>
            <DnsTable
              type="approved"
              data={approvedRecords}
              loading={loading}
              isAdmin={true}
              onEdit={openEditDialog}
              onDelete={(record) => setDeleteDialog({ open: true, record })}
              onDownloadSslPackage={handleDownloadSslPackage}
            />
          </Card>
          
          {/* 동기화 버튼 카드 */}
          <Card>
            <Button
              onClick={handleApply}
              className="flex items-center space-x-2"
            >
              <Globe className="w-4 h-4" />
              <span>동기화(적용)</span>
            </Button>
          </Card>
        </div>
      )}

      {/* 신청 목록 탭 */}
      {tab === 1 && (
        <div className="space-y-6">
          {/* 헤더 카드 */}
          <Card>
            <Heading level={3}>도메인 등록 신청 목록</Heading>
          </Card>
          
          {/* 테이블 카드 */}
          <Card>
            <DnsTable
              type="pending"
              data={requests}
              loading={loading}
              onApprove={handleApprove}
              onReject={(id) => setRejectDialog({ open: true, id })}
            />
          </Card>
        </div>
      )}

      {/* 거절된 신청 탭 */}
      {tab === 2 && (
        <div className="space-y-6">
          {/* 헤더 카드 */}
          <Card>
            <Heading level={3}>거절된 도메인 신청 목록</Heading>
          </Card>
          
          {/* 테이블 카드 */}
          <Card>
            <DnsTable
              type="rejected"
              data={rejectedRequests}
              loading={loading}
            />
          </Card>
        </div>
      )}

      {/* 삭제된 도메인 탭 */}
      {tab === 3 && (
        <div className="space-y-6">
          {/* 헤더 카드 */}
          <Card>
            <Heading level={3}>삭제된 도메인 목록</Heading>
          </Card>
          
          {/* 테이블 카드 */}
          <Card>
            <DnsTable
              type="deleted"
              data={deletedRecords}
              loading={loading}
            />
          </Card>
        </div>
      )}

      {/* 거절 다이얼로그 */}
      {rejectDialog.open && (
        <Modal isOpen={rejectDialog.open} onClose={() => setRejectDialog({ open: false, id: null })}>
          <Heading level={3} className="mb-4">도메인 등록 요청 거절</Heading>
          <div className="mb-4">
            <Text className="block text-sm font-medium mb-2">거절 사유</Text>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="거절 사유를 입력하세요"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setRejectDialog({ open: false, id: null })}
              variant="secondary"
            >
              취소
            </Button>
            <Button
              onClick={handleReject}
              variant="danger"
            >
              거절
            </Button>
          </div>
        </Modal>
      )}

      {/* 도메인 추가 다이얼로그 */}
      {addDialog && (
        <Modal isOpen={addDialog} onClose={() => setAddDialog(false)}>
          <Heading level={3} className="mb-4">새 도메인 추가</Heading>
          
          {/* 도메인 형식 안내 */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Text className="text-sm text-blue-800 dark:text-blue-200">
              <strong>도메인 형식 안내:</strong><br />
              • 일반 도메인: example.bssm.hs.kr<br />
              • 한글 도메인: 한글.bssm.hs.kr (자동으로 punycode 변환)<br />
              • IP 주소: 10.129.50.88
            </Text>
          </div>
          
          <div className="space-y-4">
            <div>
              <Text className="block text-sm font-medium mb-2">도메인</Text>
              <Input
                value={recordForm.domain}
                onChange={e => setRecordForm(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="example.bssm.hs.kr"
              />
              
              {/* 퓨니코드 변환 미리보기 */}
              {domainPreview && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Text className="text-sm font-medium mb-2">도메인 변환 결과:</Text>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">
                        {domainPreview.original}
                      </span>
                      <Badge variant="info" className="ml-2 text-xs">
                        {domainPreview.type === 'korean' ? '한글 도메인' : '변환 결과'}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {domainPreview.punycode}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        (퓨니코드)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Text className="block text-sm font-medium mb-2">IP 주소</Text>
              <Input
                value={recordForm.ip}
                onChange={e => setRecordForm(prev => ({ ...prev, ip: e.target.value }))}
                placeholder="10.129.50.88"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={() => setAddDialog(false)}
              variant="secondary"
            >
              취소
            </Button>
            <Button
              onClick={handleAddRecord}
              variant="primary"
            >
              추가
            </Button>
          </div>
        </Modal>
      )}

      {/* 도메인 수정 다이얼로그 */}
      {editDialog.open && editDialog.record && (
        <Modal isOpen={editDialog.open} onClose={() => setEditDialog({ open: false, record: null })}>
          <Heading level={3} className="mb-4">도메인 수정</Heading>
          
          <div className="space-y-4">
            <div>
              <Text className="block text-sm font-medium mb-2">도메인</Text>
              <Input
                value={recordForm.domain}
                onChange={e => setRecordForm(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="example.bssm.hs.kr"
              />
              
              {/* 퓨니코드 변환 미리보기 */}
              {domainPreview && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Text className="text-sm font-medium mb-2">도메인 변환 결과:</Text>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">
                        {domainPreview.original}
                      </span>
                      <Badge variant="info" className="ml-2 text-xs">
                        {domainPreview.type === 'korean' ? '한글 도메인' : '변환 결과'}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {domainPreview.punycode}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        (퓨니코드)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Text className="block text-sm font-medium mb-2">IP 주소</Text>
              <Input
                value={recordForm.ip}
                onChange={e => setRecordForm(prev => ({ ...prev, ip: e.target.value }))}
                placeholder="10.129.50.88"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={() => setEditDialog({ open: false, record: null })}
              variant="secondary"
            >
              취소
            </Button>
            <Button
              onClick={handleEditRecord}
              variant="primary"
            >
              수정
            </Button>
          </div>
        </Modal>
      )}

      {/* 도메인 삭제 확인 다이얼로그 */}
      {deleteDialog.open && deleteDialog.record && (
        <Modal isOpen={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, record: null })}>
          <Heading level={3} className="mb-4">도메인 삭제 확인</Heading>
          
          <Text className="mb-4">
            정말로 도메인 <strong>{deleteDialog.record.domain}</strong>을(를) 삭제하시겠습니까?
          </Text>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setDeleteDialog({ open: false, record: null })}
              variant="secondary"
            >
              취소
            </Button>
            <Button
              onClick={handleDeleteRecord}
              variant="danger"
            >
              삭제
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
} 