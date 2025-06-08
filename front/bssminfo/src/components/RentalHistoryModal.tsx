import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import { X } from 'lucide-react';

interface User {
  id: number;
  username: string;
}

interface EquipmentDetail {
  id: number;
  name: string;
  manufacturer: string;
  model_name: string;
}

interface RentalDetail {
  id: number;
  device_name?: string;
  mac_address?: string;
  assigned_ip?: string;
  created_at?: string;
  last_access?: string;
  is_active?: boolean;
  equipment_detail?: EquipmentDetail;
  rental_date?: string;
  due_date?: string;
  status_display?: string;
}

interface RentalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  modalType: 'ip' | 'device' | null;
  rentals: RentalDetail[];
  loading: boolean;
}

export default function RentalHistoryModal({
  isOpen,
  onClose,
  selectedUser,
  modalType,
  rentals,
  loading
}: RentalHistoryModalProps) {
  if (!isOpen || !selectedUser || !modalType) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h6">
              {selectedUser.username}의 {modalType === 'ip' ? 'IP' : '기기'} 대여 내역
            </Typography>
            <IconButton onClick={onClose}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : rentals.length === 0 ? (
            <Typography className="text-center p-4">
              대여 내역이 없습니다.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {modalType === 'ip' ? (
                      <>
                        <TableCell>장비명</TableCell>
                        <TableCell>MAC 주소</TableCell>
                        <TableCell>IP 주소</TableCell>
                        <TableCell>대여일</TableCell>
                        <TableCell>마지막 접속</TableCell>
                        <TableCell>상태</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>장비명</TableCell>
                        <TableCell>제조사</TableCell>
                        <TableCell>모델명</TableCell>
                        <TableCell>대여일</TableCell>
                        <TableCell>반납 예정일</TableCell>
                        <TableCell>상태</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentals.map((rental) => (
                    <TableRow key={rental.id}>
                      {modalType === 'ip' ? (
                        <>
                          <TableCell>{rental.device_name}</TableCell>
                          <TableCell>{rental.mac_address}</TableCell>
                          <TableCell>{rental.assigned_ip}</TableCell>
                          <TableCell>{new Date(rental.created_at || '').toLocaleString()}</TableCell>
                          <TableCell>{new Date(rental.last_access || '').toLocaleString()}</TableCell>
                          <TableCell>{rental.is_active ? '활성' : '비활성'}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{rental.equipment_detail?.name}</TableCell>
                          <TableCell>{rental.equipment_detail?.manufacturer}</TableCell>
                          <TableCell>{rental.equipment_detail?.model_name}</TableCell>
                          <TableCell>{new Date(rental.rental_date || '').toLocaleString()}</TableCell>
                          <TableCell>{new Date(rental.due_date || '').toLocaleString()}</TableCell>
                          <TableCell>{rental.status_display}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>
    </div>
  );
} 