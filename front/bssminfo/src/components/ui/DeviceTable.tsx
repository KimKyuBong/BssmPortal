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
          <BaseTableHeaderCell>DNS 상태</BaseTableHeaderCell>
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
              <BaseTableCell className="relative">
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
                  <div className="text-xs text-secondary mt-1">{dnsInfo.domain}</div>
                )}
                <div className="inline-flex items-center space-x-1 ml-2 absolute top-1/2 -translate-y-1/2 right-2">
                  {(dnsInfo.status === 'none' || dnsInfo.status === 'deleted') && (
                    <Tooltip content="DNS 등록 신청">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDnsRequest?.(device);
                        }}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                      >
                        <PlusCircle className="w-5 h-5 text-blue-500" />
                      </button>
                    </Tooltip>
                  )}
                  {dnsInfo.status === 'rejected' && (
                    <Tooltip content="DNS 재신청">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDnsResubmit?.(device);
                        }}
                        className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900 rounded"
                      >
                        <RefreshCw className="w-5 h-5 text-yellow-500" />
                      </button>
                    </Tooltip>
                  )}
                  {dnsInfo.status === 'approved' && (
                    <Tooltip content="SSL 패키지 다운로드 (매번 새로운 개인키가 생성되며, 이전에 받은 인증서는 사용할 수 없습니다)">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSslDownload?.(device);
                        }}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                      >
                        <Download className="w-5 h-5 text-green-500" />
                      </button>
                    </Tooltip>
                  )}
                  {dnsInfo.status === 'approved' && (
                    <Tooltip content="DNS 삭제">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDnsDelete?.(device);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </Tooltip>
                  )}
                  {dnsInfo.status === 'rejected' && (
                    <Tooltip content="거절 사유 보기">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewRejectReason?.(device);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </Tooltip>
                  )}
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