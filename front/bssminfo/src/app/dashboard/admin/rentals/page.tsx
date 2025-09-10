'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Table, Modal, Form, Input, DatePicker, Select, message, Space, Tag } from 'antd';
import { ExportOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DatePickerProps } from 'antd';
import rentalService, { RENTAL_REQUEST_STATUS, User } from '@/services/rental';
import type { Equipment, Rental, RentalRequest } from '@/services/api';
import type { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon';

const { Option } = Select;

export default function AdminRentalsPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 장비 목록 조회
  const fetchEquipment = async () => {
    try {
      const response = await rentalService.getAllEquipment();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setEquipment(response.data);
        } else if (response.data && typeof response.data === 'object' && 'results' in response.data) {
          setEquipment((response.data as { results: Equipment[] }).results);
        }
      }
    } catch (error) {
      console.error('장비 목록 조회 오류:', error);
      message.error('장비 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 대여 목록 조회
  const fetchRentals = async () => {
    try {
      const response = await rentalService.getAllRentals();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setRentals(response.data);
        } else if (response.data && typeof response.data === 'object' && 'results' in response.data) {
          setRentals((response.data as { results: Rental[] }).results);
        }
      }
    } catch (error) {
      console.error('대여 목록 조회 오류:', error);
      message.error('대여 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 대여 요청 목록 조회
  const fetchRequests = async () => {
    try {
      const response = await rentalService.getAllRequests();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setRequests(response.data);
        } else if (response.data && typeof response.data === 'object' && 'results' in response.data) {
          setRequests((response.data as { results: RentalRequest[] }).results);
        }
      }
    } catch (error) {
      console.error('대여 요청 조회 오류:', error);
      message.error('대여 요청 내역을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      const response = await rentalService.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      message.error('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchEquipment();
    fetchRentals();
    fetchRequests();
    fetchUsers();
  }, []);

  // 대여 요청 처리
  const handleProcessRequest = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      setLoading(true);
      if (action === 'APPROVE') {
        await rentalService.approveRequest(requestId);
        message.success('대여 요청이 승인되었습니다.');
      } else {
        await rentalService.rejectRequest(requestId);
        message.success('대여 요청이 거부되었습니다.');
      }
      // 모든 데이터 즉시 새로고침
      await Promise.all([
        fetchRequests(),
        fetchRentals()
      ]);
    } catch (error) {
      console.error('대여 요청 처리 오류:', error);
      message.error('대여 요청 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 대여 요청 테이블 컬럼
  const requestColumns = [
    {
      title: '물품번호',
      dataIndex: ['equipment_detail', 'asset_number'],
      key: 'equipment_name',
      render: (_: any, record: RentalRequest) => 
        record.equipment_detail ? 
          (record.equipment_detail.asset_number || 
           `${record.equipment_detail.manufacturer} ${record.equipment_detail.model_name}`) 
          : '정보 없음',
    },
    {
      title: '요청자',
      dataIndex: ['user', 'username'],
      key: 'user_name',
      render: (username: string, record: RentalRequest) => (
        <div>
          <div className="font-medium">{record.user.name}</div>
          <div className="text-sm text-gray-500">{record.user.username}</div>
        </div>
      ),
    },
    {
      title: '요청일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '유형',
      dataIndex: 'request_type',
      key: 'request_type',
      render: (type: string) => type === 'RENT' ? '대여 신청' : '반납 신청',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'PENDING':
            return <Tag color="orange">대기 중</Tag>;
          case 'APPROVED':
            return <Tag color="green">승인됨</Tag>;
          case 'REJECTED':
            return <Tag color="red">거부됨</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: '반납 예정일',
      dataIndex: 'expected_return_date',
      key: 'expected_return_date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '요청사유',
      dataIndex: 'request_reason',
      key: 'request_reason',
      render: (reason: string) => reason || '-',
    },
    {
      title: '거절사유',
      dataIndex: 'reject_reason',
      key: 'reject_reason',
      render: (reason: string) => reason || '-',
    },
    {
      title: '처리자',
      dataIndex: ['processed_by', 'username'],
      key: 'processed_by',
      render: (username: string) => username || '-',
    },
    {
      title: '처리일',
      dataIndex: 'processed_at',
      key: 'processed_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: RentalRequest) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => handleProcessRequest(record.id, 'APPROVE')}
              >
                승인
              </Button>
              <Button
                danger
                size="small"
                onClick={() => handleProcessRequest(record.id, 'REJECT')}
              >
                거절
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 대여 목록 테이블 컬럼
  const rentalColumns = [
    {
      title: '대여자',
      dataIndex: ['user', 'username'],
      key: 'user_name',
      render: (username: string, record: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {record.user.name || record.user.username}
          </div>
          {record.user.name && record.user.username && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ({record.user.username})
            </div>
          )}
        </div>
      ),
    },
    {
      title: '장비명',
      dataIndex: ['equipment', 'asset_number'],
      key: 'equipment_name',
      render: (asset_number: string, record: any) => 
        record.equipment ? 
          (record.equipment.asset_number || 
           `${record.equipment.manufacturer} ${record.equipment.model_name}`) 
          : '정보 없음',
    },
    {
      title: '대여일',
      dataIndex: 'rental_date',
      key: 'rental_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '반납 예정일',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '실제 반납일',
      dataIndex: 'return_date',
      key: 'return_date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'RENTED':
            return <Tag color="blue">대여 중</Tag>;
          case 'RETURNED':
            return <Tag color="green">반납됨</Tag>;
          case 'OVERDUE':
            return <Tag color="red">연체</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: '비고',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes || '-',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">장비 대여 관리</h1>
        <Button type="default" className="flex items-center gap-2" onClick={() => rentalService.exportRequestsToExcel()}>
          <ExportOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />
          <span>엑셀 내보내기</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 대여 요청 목록 */}
        <Card title="대여 요청 목록">
          <Table
            columns={requestColumns}
            dataSource={requests}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </Card>

        {/* 대여 목록 */}
        <Card title="전체 대여 목록">
          <Table
            columns={rentalColumns}
            dataSource={rentals}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </Card>
      </div>
    </div>
  );
} 