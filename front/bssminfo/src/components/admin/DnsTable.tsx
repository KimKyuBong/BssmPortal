'use client';

import React from 'react';
import { Edit, Trash2, CheckCircle, XCircle, Download } from 'lucide-react';
import { 
  BaseTable, 
  BaseTableHead, 
  BaseTableBody, 
  BaseTableRow, 
  BaseTableHeaderCell, 
  BaseTableCell, 
  Button, 
  Badge,
  Text
} from '@/components/ui/StyledComponents';
import { DnsRecord, DnsRequest } from '@/services/dns';
import { parseDomain } from '@/utils/punycode';
import dnsService from '@/services/dns';

interface DnsTableProps {
  type: 'approved' | 'pending' | 'rejected' | 'deleted';
  data: DnsRecord[] | DnsRequest[];
  loading: boolean;
  isAdmin?: boolean; // 관리자 페이지 여부
  onEdit?: (record: DnsRecord) => void;
  onDelete?: (record: DnsRecord) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onDownloadSsl?: (domain: string) => void;
  onDownloadSslPackage?: (domain: string) => void;
}

// 도메인 표시 컴포넌트
const DomainDisplay = ({ domain, originalDomain }: { domain: string; originalDomain?: string }) => {
  if (!domain) return <span>-</span>;
  
  // 원본 도메인이 있고 현재 도메인과 다른 경우 (punycode 변환된 경우)
  if (originalDomain && originalDomain !== domain) {
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center">
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            {domain}
          </span>
          <Badge variant="info" className="ml-2 text-xs">
            한글 도메인
          </Badge>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {originalDomain}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            (퓨니코드)
          </span>
        </div>
      </div>
    );
  }
  
  // 일반 도메인인 경우
  return (
    <div className="flex flex-col">
      <span className="text-base font-semibold text-gray-900 dark:text-white">
        {domain}
      </span>
      {domain.includes('xn--') && (
        <div className="flex items-center mt-1">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {domain}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            (원문)
          </span>
        </div>
      )}
    </div>
  );
};

// DNS 상태를 한글로 변환하는 함수
const getStatusDisplay = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': '대기',
    'approved': '승인',
    'rejected': '거절',
    'deleted': '삭제됨'
  };
  return statusMap[status] || status;
};

export default function DnsTable({
  type,
  data,
  loading,
  isAdmin,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onDownloadSsl,
  onDownloadSslPackage
}: DnsTableProps) {

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {type === 'approved' && '승인된 도메인이 없습니다.'}
        {type === 'pending' && '대기 중인 신청이 없습니다.'}
        {type === 'rejected' && '거절된 신청이 없습니다.'}
        {type === 'deleted' && '삭제된 도메인이 없습니다.'}
      </div>
    );
  }

  // 승인된 도메인 목록
  if (type === 'approved') {
    const records = data as DnsRecord[];
    return (
      <BaseTable>
        <BaseTableHead>
          <BaseTableRow>
            <BaseTableHeaderCell>ID</BaseTableHeaderCell>
            <BaseTableHeaderCell>도메인</BaseTableHeaderCell>
            <BaseTableHeaderCell>IP</BaseTableHeaderCell>
            <BaseTableHeaderCell>등록일</BaseTableHeaderCell>
            <BaseTableHeaderCell>관리</BaseTableHeaderCell>
          </BaseTableRow>
        </BaseTableHead>
        <BaseTableBody>
          {records.map((rec) => (
            <BaseTableRow key={rec.id}>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{rec.id}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <DomainDisplay 
                  domain={rec.domain || ''} 
                  originalDomain={rec.original_domain}
                />
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white font-mono">{rec.ip}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">
                  {new Date(rec.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </BaseTableCell>
              <BaseTableCell>
                <div className="flex items-center space-x-2">
                  {onEdit && (
                    <Button
                      onClick={() => onEdit(rec)}
                      size="sm"
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>수정</span>
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      onClick={() => onDelete(rec)}
                      size="sm"
                      variant="danger"
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>삭제</span>
                    </Button>
                  )}
                  {onDownloadSsl && (isAdmin || rec.ssl_enabled) && (
                    <Button
                      onClick={() => onDownloadSsl(rec.original_domain || rec.domain || '')}
                      size="sm"
                      variant="primary"
                      className="flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>SSL</span>
                    </Button>
                  )}
                  {onDownloadSslPackage && isAdmin && (
                    <Button
                      onClick={() => onDownloadSslPackage(rec.original_domain || rec.domain || '')}
                      size="sm"
                      variant="success"
                      className="flex items-center space-x-1"
                      title="SSL 패키지 다운로드 (인증서 + 개인키 + CA + 설정파일) - 매번 새로운 개인키가 생성됩니다"
                    >
                      <Download className="w-3 h-3" />
                      <span>SSL 패키지</span>
                    </Button>
                  )}
                </div>
              </BaseTableCell>
            </BaseTableRow>
          ))}
        </BaseTableBody>
      </BaseTable>
    );
  }

  // 신청 목록
  if (type === 'pending') {
    const requests = data as DnsRequest[];
    return (
      <BaseTable>
        <BaseTableHead>
          <BaseTableRow>
            <BaseTableHeaderCell>ID</BaseTableHeaderCell>
            <BaseTableHeaderCell>도메인</BaseTableHeaderCell>
            <BaseTableHeaderCell>IP</BaseTableHeaderCell>
            <BaseTableHeaderCell>신청자</BaseTableHeaderCell>
            <BaseTableHeaderCell>사유</BaseTableHeaderCell>
            <BaseTableHeaderCell>상태</BaseTableHeaderCell>
            <BaseTableHeaderCell>처리</BaseTableHeaderCell>
          </BaseTableRow>
        </BaseTableHead>
        <BaseTableBody>
          {requests.map((req) => (
            <BaseTableRow key={req.id}>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{req.id}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <DomainDisplay 
                  domain={req.domain || ''} 
                  originalDomain={req.original_domain}
                />
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white font-mono">{req.ip}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{req.user}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{req.reason}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Badge variant={req.status === 'pending' ? 'warning' : 'success'}>
                  {getStatusDisplay(req.status)}
                </Badge>
              </BaseTableCell>
              <BaseTableCell>
                <div className="flex items-center space-x-2">
                  {onApprove && (
                    <Button
                      onClick={() => onApprove(req.id)}
                      variant="success"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>승인</span>
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      onClick={() => onReject(req.id)}
                      variant="danger"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>거절</span>
                    </Button>
                  )}
                </div>
              </BaseTableCell>
            </BaseTableRow>
          ))}
        </BaseTableBody>
      </BaseTable>
    );
  }

  // 거절된 신청 목록
  if (type === 'rejected') {
    const requests = data as DnsRequest[];
    return (
      <BaseTable>
        <BaseTableHead>
          <BaseTableRow>
            <BaseTableHeaderCell>ID</BaseTableHeaderCell>
            <BaseTableHeaderCell>도메인</BaseTableHeaderCell>
            <BaseTableHeaderCell>IP</BaseTableHeaderCell>
            <BaseTableHeaderCell>신청자</BaseTableHeaderCell>
            <BaseTableHeaderCell>거절 사유</BaseTableHeaderCell>
            <BaseTableHeaderCell>처리일</BaseTableHeaderCell>
          </BaseTableRow>
        </BaseTableHead>
        <BaseTableBody>
          {requests.map((req) => (
            <BaseTableRow key={req.id}>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{req.id}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <DomainDisplay 
                  domain={req.domain || ''} 
                  originalDomain={req.original_domain}
                />
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white font-mono">{req.ip}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{req.user}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{req.reject_reason}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">
                  {req.processed_at ? new Date(req.processed_at).toLocaleDateString('ko-KR') : '-'}
                </Text>
              </BaseTableCell>
            </BaseTableRow>
          ))}
        </BaseTableBody>
      </BaseTable>
    );
  }

  // 삭제된 도메인 목록
  if (type === 'deleted') {
    const records = data as DnsRecord[];
    return (
      <BaseTable>
        <BaseTableHead>
          <BaseTableRow>
            <BaseTableHeaderCell>ID</BaseTableHeaderCell>
            <BaseTableHeaderCell>도메인</BaseTableHeaderCell>
            <BaseTableHeaderCell>IP</BaseTableHeaderCell>
            <BaseTableHeaderCell>등록일</BaseTableHeaderCell>
            <BaseTableHeaderCell>삭제일</BaseTableHeaderCell>
          </BaseTableRow>
        </BaseTableHead>
        <BaseTableBody>
          {records.map((rec) => (
            <BaseTableRow key={rec.id}>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">{rec.id}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <DomainDisplay 
                  domain={rec.domain || ''} 
                  originalDomain={rec.original_domain}
                />
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white font-mono">{rec.ip}</Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">
                  {new Date(rec.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </BaseTableCell>
              <BaseTableCell>
                <Text className="text-sm text-gray-900 dark:text-white">
                  {(rec as any).deleted_at ? new Date((rec as any).deleted_at).toLocaleDateString('ko-KR') : '-'}
                </Text>
              </BaseTableCell>
            </BaseTableRow>
          ))}
        </BaseTableBody>
      </BaseTable>
    );
  }

  return null;
} 