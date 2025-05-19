'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Table, Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DatePickerProps } from 'antd';
import rentalService from '@/services/rental';
import type { Equipment, Rental, RentalRequest } from '@/services/api';

const { Option } = Select;

export default function RentalsPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RentalRequest | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 장비 목록 조회
  const fetchEquipment = async () => {
    try {
      const response = await rentalService.getAvailableEquipment();
      if (response.success && response.data) {
        setEquipment(response.data);
      }
    } catch (error) {
      console.error('장비 목록 조회 오류:', error);
      message.error('장비 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 대여 목록 조회
  const fetchRentals = async (requestData?: RentalRequest[]) => {
    try {
      const response = await rentalService.getMyRentals();
      let rentalData: Rental[] = [];
      
      // response.data가 배열인지 PaginatedResponse인지 확인
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          rentalData = response.data;
        } else if ('results' in response.data) {
          rentalData = response.data.results;
        }
      }
      
      // 요청 목록이 제공되었거나 내부 상태 사용
      const requestsToUse = requestData || requests;
      
      // 요청 목록을 사용하여 반납 대기 중인 장비 상태 표시
      if (rentalData.length > 0 && requestsToUse.length > 0) {
        rentalData = rentalData.map(rental => {
          // 현재 대여 항목에 대한 PENDING 상태의 반납 요청이 있는지 확인
          const pendingReturnRequest = requestsToUse.find(
            req => req.equipment === rental.equipment.id && 
                   req.request_type === 'RETURN' && 
                   req.status === 'PENDING'
          );
          
          // 반납 신청 중인 경우 표시 정보 추가
          if (pendingReturnRequest) {
            return {
              ...rental,
              is_return_pending: true,
              return_request_id: pendingReturnRequest.id,
              request_reason: pendingReturnRequest.request_reason
            };
          }
          
          return rental;
        });
      }
      
      setRentals(rentalData);
    } catch (error) {
      console.error('대여 목록 조회 오류:', error);
      message.error('대여 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 대여 요청 목록 조회
  const fetchRequests = async () => {
    try {
      const response = await rentalService.getMyRequests();
      let requestData: RentalRequest[] = [];
      
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          requestData = response.data;
        } else if (response.data && typeof response.data === 'object' && 'results' in response.data) {
          requestData = (response.data as { results: RentalRequest[] }).results;
        }
        setRequests(requestData);
        return requestData; // 요청 데이터 반환
      }
      return []; // 빈 배열 반환
    } catch (error) {
      console.error('대여 요청 조회 오류:', error);
      message.error('대여 요청 내역을 불러오는 중 오류가 발생했습니다.');
      return []; // 오류 발생 시 빈 배열 반환
    }
  };

  // loadData 함수를 컴포넌트 레벨로 추출
  const loadData = async () => {
    try {
      // 장비 목록과 요청 목록 동시에 로드
      const [equipmentResponse, requestData] = await Promise.all([
        fetchEquipment(),
        fetchRequests()
      ]);
      
      // 요청 목록을 사용하여 대여 목록 로드
      await fetchRentals(requestData);
    } catch (error) {
      console.error('데이터 로드 중 오류 발생:', error);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 대여 요청 처리
  const handleRequestRental = async (values: any) => {
    try {
      setLoading(true);
      const result = await rentalService.createRentalRequest({
        equipment: values.equipment,
        request_type: "RENT",
        expected_return_date: values.due_date?.format('YYYY-MM-DD'),
        request_reason: values.notes || null
      });
      
      if (result.success) {
        message.success('대여 요청이 성공적으로 제출되었습니다.');
        setIsModalVisible(false);
        form.resetFields();
        await loadData();
      } else {
        const errorDetail = typeof result.error === 'object' && result.error ? result.error.detail : undefined;
        const errorMessage = errorDetail || result.message || '대여 요청 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('대여 요청 오류:', error);
      message.error('대여 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 요청 사유 수정 처리
  const handleEditReason = async (values: any) => {
    try {
      setLoading(true);
      if (!editingRequest) {
        message.error('수정할 요청 정보가 없습니다.');
        return;
      }

      const updatedRequest = {
        ...editingRequest,
        request_reason: values.reason
      };

      const result = await rentalService.createRentalRequest({
        equipment: updatedRequest.equipment,
        request_type: updatedRequest.request_type,
        expected_return_date: updatedRequest.expected_return_date || undefined,
        request_reason: values.reason
      });
      
      if (result.success) {
        message.success('요청 사유가 성공적으로 수정되었습니다.');
        setIsEditModalVisible(false);
        editForm.resetFields();
        // 전체 데이터 새로고침
        await loadData();
      } else {
        const errorDetail = typeof result.error === 'object' && result.error ? result.error.detail : undefined;
        const errorMessage = errorDetail || result.message || '요청 수정 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('요청 수정 오류:', error);
      message.error('요청 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 대여 요청 모달 열기
  const showModal = () => {
    setIsModalVisible(true);
  };

  // 대여 요청 모달 닫기
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 사유 수정 모달 열기
  const showEditModal = (request: RentalRequest) => {
    setEditingRequest(request);
    editForm.setFieldsValue({
      reason: request.request_reason || ''
    });
    setIsEditModalVisible(true);
  };

  // 사유 수정 모달 닫기
  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setEditingRequest(null);
  };

  // 대여 요청 모달 제출
  const handleOk = () => {
    form.submit();
  };

  // 사유 수정 모달 제출
  const handleEditOk = () => {
    editForm.submit();
  };

  // 대여 요청 테이블 컬럼
  const requestColumns = [
    {
      title: '장비명',
      dataIndex: ['equipment_detail', 'name'],
      key: 'equipment_name',
      render: (_: any, record: RentalRequest) => 
        record.equipment_detail ? record.equipment_detail.name : '정보 없음',
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
            return '대기 중';
          case 'APPROVED':
            return '승인됨';
          case 'REJECTED':
            return '거부됨';
          default:
            return status;
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
      title: '작업',
      key: 'action',
      render: (_: any, record: RentalRequest) => (
        record.status === 'PENDING' ? (
          <Button 
            icon={<EditOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />} 
            onClick={() => showEditModal(record)}
            size="small"
          >
            사유 수정
          </Button>
        ) : null
      ),
    },
  ];

  // 대여 목록 테이블 컬럼
  const rentalColumns = [
    {
      title: '장비명',
      dataIndex: ['equipment', 'name'],
      key: 'equipment_name',
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
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        if (record.is_return_pending) {
          return <span style={{ color: '#ff9800' }}>반납 신청 중</span>;
        }
        
        // 대여 신청 중인지 확인
        const pendingRentRequest = requests.find(
          req => req.equipment === record.equipment.id && 
                req.request_type === 'RENT' && 
                req.status === 'PENDING'
        );
        
        if (pendingRentRequest) {
          return <span style={{ color: '#2196f3' }}>대여 신청 중</span>;
        }
        
        switch (status) {
          case 'ACTIVE':
          case 'RENTED':
            return '대여 중';
          case 'RETURNED':
            return '반납됨';
          case 'OVERDUE':
            return <span style={{ color: '#f44336' }}>연체</span>;
          default:
            return status;
        }
      },
    },
    {
      title: '비고',
      dataIndex: 'notes',
      key: 'notes',
      render: (_: string, record: any) => {
        // 반납 신청 중이면 사유 표시
        if (record.is_return_pending && record.request_reason) {
          return <span>{record.request_reason}</span>;
        }
        
        // 대여 신청 중이면 사유 표시
        const pendingRentRequest = requests.find(
          req => req.equipment === record.equipment.id && 
                req.request_type === 'RENT' && 
                req.status === 'PENDING'
        );
        
        if (pendingRentRequest && pendingRentRequest.request_reason) {
          return <span>{pendingRentRequest.request_reason}</span>;
        }
        
        return record.notes || '-';
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: any) => {
        // 반납 신청 중이거나 대여 신청 중인 경우 사유 수정 버튼 표시
        const pendingReturnRequest = requests.find(
          req => req.equipment === record.equipment.id && 
                 req.request_type === 'RETURN' && 
                 req.status === 'PENDING'
        );
        
        const pendingRentRequest = requests.find(
          req => req.equipment === record.equipment.id && 
                 req.request_type === 'RENT' && 
                 req.status === 'PENDING'
        );
        
        if (pendingReturnRequest) {
          return (
            <Button 
              icon={<EditOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />} 
              onClick={() => showEditModal(pendingReturnRequest)}
              size="small"
            >
              사유 수정
            </Button>
          );
        }
        
        if (pendingRentRequest) {
          return (
            <Button 
              icon={<EditOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />} 
              onClick={() => showEditModal(pendingRentRequest)}
              size="small"
            >
              사유 수정
            </Button>
          );
        }
        
        return null;
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">장비 대여 관리</h1>
        <Button type="primary" icon={<PlusOutlined onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}} />} onClick={showModal}>
          대여 요청
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 대여 요청 목록 */}
        <Card title="대여 요청 내역">
          <Table
            columns={requestColumns}
            dataSource={requests}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </Card>

        {/* 대여 목록 */}
        <Card title="현재 대여 중인 장비">
          <Table
            columns={rentalColumns}
            dataSource={rentals}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </Card>
      </div>

      {/* 대여 요청 모달 */}
      <Modal
        title="장비 대여 요청"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRequestRental}
        >
          <Form.Item
            name="equipment"
            label="장비 선택"
            rules={[{ required: true, message: '장비를 선택해주세요' }]}
          >
            <Select placeholder="장비를 선택하세요">
              {equipment.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="due_date"
            label="반납 예정일"
            rules={[{ required: true, message: '반납 예정일을 선택해주세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="대여 사유"
            rules={[{ required: true, message: '대여 사유를 입력해주세요' }]}
          >
            <Input.TextArea rows={4} placeholder="대여 사유를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 사유 수정 모달 */}
      <Modal
        title="요청 사유 수정"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditReason}
        >
          <Form.Item
            name="reason"
            label="사유"
            rules={[{ required: true, message: '사유를 입력해주세요' }]}
          >
            <Input.TextArea rows={4} placeholder="요청 사유를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 