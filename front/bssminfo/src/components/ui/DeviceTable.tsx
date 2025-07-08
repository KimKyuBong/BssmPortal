import React from 'react';
import { Laptop, Edit, Trash2, Download, X, RefreshCw, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Device } from '@/services/ip';
import { BaseTable, BaseTableHead, BaseTableHeaderCell, BaseTableBody, BaseTableRow, BaseTableCell, Button } from './StyledComponents';
import Tooltip from './Tooltip';

interface DeviceTableProps {
  devices: Device[];
  selectedDevices?: number[];
  onDeviceSelect?: (deviceId: number, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onToggleActive?: (deviceId: number, currentStatus: boolean) => void;
  onEdit?: (deviceId: number) => void;
  onDelete?: (deviceId: number) => void;
  onDnsRequest?: (device: Device) => void;
  onDnsResubmit?: (device: Device) => void;
  onViewRejectReason?: (device: Device) => void;
  onDnsDelete?: (device: Device) => void;
  onSslDownload?: (device: Device) => void;
  showActions?: boolean;
  className?: string;
}

// DNS 상태를 한글로 변환하는 함수
const getStatusDisplay = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': '대기',
    'approved': '승인',
    'rejected': '거절',
    'deleted': '삭제됨',
    'none': '없음'
  };
  return statusMap[status] || status;
};

export default function DeviceTable({
  devices,
  selectedDevices = [],
  onDeviceSelect,
  onToggleActive,
  onEdit,
  onDelete,
  onDnsRequest,
  onDnsResubmit,
  onViewRejectReason,
  onDnsDelete,
  onSslDownload,
  showActions = true,
  className = ''
}: DeviceTableProps) {
  const getDnsInfo = (device: Device) => {
    return device.dns_info || { status: 'none' };
  };

  return (
    <BaseTable className={className}>
      <BaseTableHead>
        <BaseTableRow>
          <BaseTableHeaderCell>기기 정보</BaseTableHeaderCell>
          <BaseTableHeaderCell>MAC 주소</BaseTableHeaderCell>
          <BaseTableHeaderCell>IP 주소</BaseTableHeaderCell>
          <BaseTableHeaderCell>상태</BaseTableHeaderCell>
          <BaseTableHeaderCell className="min-w-[200px]">DNS 상태</BaseTableHeaderCell>
          <BaseTableHeaderCell>작업</BaseTableHeaderCell>
        </BaseTableRow>
      </BaseTableHead>
      <BaseTableBody>
        {devices.map((device) => {
          const isSelected = selectedDevices.includes(device.id);
          const dnsInfo = getDnsInfo(device);
          
          // 디버깅 로그
          if (isSelected) {
            console.log('선택된 행:', device.id, device.device_name, 'isSelected:', isSelected);
          }
          
          return (
            <BaseTableRow 
              key={device.id} 
              isSelected={isSelected}
              onClick={(e) => onDeviceSelect?.(device.id, e)}
            >
              <BaseTableCell>
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Laptop className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-primary">
                      {device.device_name || '이름 없음'}
                    </div>
                    <div className="text-sm text-secondary">
                      {device.mac_address ? `MAC: ${device.mac_address.substring(0, 8)}...` : '정보 없음'}
                    </div>
                  </div>
                </div>
              </BaseTableCell>
              <BaseTableCell className="text-secondary">
                {device.mac_address || '-'}
              </BaseTableCell>
              <BaseTableCell>
                <div>
                  <div className="text-primary font-medium">{device.assigned_ip || '-'}</div>
                </div>
              </BaseTableCell>
              <BaseTableCell>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  device.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {device.is_active ? '활성' : '비활성'}
                </span>
              </BaseTableCell>
              <BaseTableCell className="min-w-[200px]">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      dnsInfo.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : dnsInfo.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : dnsInfo.status === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {getStatusDisplay(dnsInfo.status)}
                    </span>
                    {dnsInfo.domain && (
                      <span className="text-xs text-secondary">{dnsInfo.domain}</span>
                    )}
                  </div>
                  
                  {/* DNS 관련 버튼들 */}
                  <div className="flex flex-wrap gap-1">
                    {(dnsInfo.status === 'none' || dnsInfo.status === 'deleted') && (
                      <Tooltip content="DNS 등록 신청">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDnsRequest?.(device);
                          }}
                          className="inline-flex items-center text-xs"
                        >
                          <PlusCircle className="w-3 h-3 mr-1" />
                          DNS 신청
                        </Button>
                      </Tooltip>
                    )}
                    {dnsInfo.status === 'rejected' && (
                      <Tooltip content="DNS 재신청">
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDnsResubmit?.(device);
                          }}
                          className="inline-flex items-center text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          재신청
                        </Button>
                      </Tooltip>
                    )}
                    {dnsInfo.status === 'approved' && (
                      <Tooltip content="SSL 패키지 다운로드 (매번 새로운 개인키가 생성되며, 이전에 받은 인증서는 사용할 수 없습니다)">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSslDownload?.(device);
                          }}
                          className="inline-flex items-center text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          SSL 다운로드
                        </Button>
                      </Tooltip>
                    )}
                    {dnsInfo.status === 'approved' && (
                      <Tooltip content="DNS 삭제">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDnsDelete?.(device);
                          }}
                          className="inline-flex items-center text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          삭제
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </BaseTableCell>
              <BaseTableCell>
                <div className="flex items-center space-x-2">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={e => {
                        e.stopPropagation();
                        onEdit(device.id);
                      }}
                      className="inline-flex items-center"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      수정
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={device.is_active ? 'secondary' : 'success'}
                    onClick={e => {
                      e.stopPropagation();
                      onToggleActive?.(device.id, device.is_active);
                    }}
                  >
                    {device.is_active ? '비활성화' : '활성화'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={e => {
                      e.stopPropagation();
                      onDelete?.(device.id);
                    }}
                  >
                    삭제
                  </Button>
                </div>
              </BaseTableCell>
            </BaseTableRow>
          );
        })}
        
        {devices.length === 0 && (
          <BaseTableRow>
            <BaseTableCell 
              colSpan={showActions ? 6 : 5} 
              className="text-center text-secondary"
            >
              등록된 기기가 없거나 검색 결과가 없습니다.
            </BaseTableCell>
          </BaseTableRow>
        )}
      </BaseTableBody>
    </BaseTable>
  );
} 