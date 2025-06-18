'use client';

import React, { useState, useEffect } from 'react';
import { Box, Tab, Tabs, Typography, Button, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, MenuItem, Pagination } from '@mui/material';
import { Assignment, AssignmentReturned, Delete, Refresh as RefreshIcon, Add as AddIcon, Key } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Rental as ApiRental, RentalRequest, Equipment as ApiEquipment, SimpleUser, PaginatedResponse } from '@/services/api';
import rentalService from '@/services/rental';
import equipmentService from '@/services/equipment';
import 'dayjs/locale/ko';
import dayjs from 'dayjs';
import { message } from 'antd';

// 대여 상태에 따른 Chip 색상 정의
const getRentalStatusColor = (rental: Rental, requestList: RentalRequest[]) => {
  const hasPendingReturnRequest = requestList.some(
    (req: RentalRequest) => req.equipment === rental.equipment.id && 
                           req.request_type === 'RETURN' && 
                           req.status === 'PENDING'
  );

  if (hasPendingReturnRequest) {
    return 'warning';
  }
  switch (rental.status) {
    case 'RENTED': return 'primary';
    case 'RETURNED': return 'success';
    case 'OVERDUE': return 'error';
    default: return 'default';
  }
};

// 대여 상태 표시 텍스트
const getRentalStatusDisplay = (rental: Rental, requestList: RentalRequest[]) => {
  const hasPendingReturnRequest = requestList.some(
    (req: RentalRequest) => req.equipment === rental.equipment.id && 
                           req.request_type === 'RETURN' && 
                           req.status === 'PENDING'
  );

  if (hasPendingReturnRequest) {
    return '반납신청중';
  }
  return rental.status_display;
};

// 요청 상태에 따른 Chip 색상 정의
const getRequestStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'info';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    case 'CANCELLED': return 'default';
    default: return 'default';
  }
};

// 탭 패널 컴포넌트
function TabPanel(props: { children?: React.ReactNode; index: number; value: number; }) {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rental-tabpanel-${index}`}
      aria-labelledby={`rental-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface Equipment extends ApiEquipment {
  mac_addresses: Array<{
    mac_address: string;
    is_primary: boolean;
  }>;
  equipment_type_display: string;
  manufacture_year?: number;
  purchase_date?: string;
}

interface Rental extends ApiRental {
  expected_return_date: string;
  actual_return_date: string | null;
  status_display: string;
  due_date: string;
  return_date: string | null;
  is_return_pending?: boolean;
}

interface User {
  id: number;
  username: string;
}

export default function RentalsPage() {
  const [tabValue, setTabValue] = useState<number>(0);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openRentDialog, setOpenRentDialog] = useState<boolean>(false);
  const [openReturnDialog, setOpenReturnDialog] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [returnDate, setReturnDate] = useState<any>(dayjs().add(7, 'day')); // 기본값은 7일 후
  const [notes, setNotes] = useState<string>('');
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // 페이지네이션 상태
  const [rentalPage, setRentalPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [totalRentals, setTotalRentals] = useState<number>(0);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [totalRentalPages, setTotalRentalPages] = useState<number>(1);
  const [totalRequestPages, setTotalRequestPages] = useState<number>(1);
  const [exportStartDate, setExportStartDate] = useState<dayjs.Dayjs | null>(null);
  const [exportEndDate, setExportEndDate] = useState<dayjs.Dayjs | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    syncData();
  }, [rentalPage, requestPage]);

  // 탭 변경 핸들러
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // 대여 페이지 변경 핸들러
  const handleRentalPageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setRentalPage(value);
  };
  
  // 요청 페이지 변경 핸들러
  const handleRequestPageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setRequestPage(value);
  };

  // 모든 데이터 동기화 함수
  const syncData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEquipmentData(),
        loadRentalData(),
        loadRequestData()
      ]);
    } catch (error) {
      console.error('데이터 동기화 중 오류 발생:', error);
      message.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 장비 데이터 로드
  const loadEquipmentData = async () => {
    try {
      console.log('대여 가능한 장비 조회 시작...');
      // 대여 가능한 장비 목록 조회
      const equipmentResult = await equipmentService.getAvailableEquipment();
      console.log('대여 가능한 장비 조회 결과:', equipmentResult);
      
      if (equipmentResult.success && equipmentResult.data) {
        console.log('대여 가능한 장비 수:', equipmentResult.data.length);
        setEquipment(equipmentResult.data);
      } else {
        console.error('대여 가능한 장비 조회 실패:', equipmentResult);
        setEquipment([]);
      }
    } catch (error) {
      console.error('장비 데이터 로드 중 오류 발생:', error);
      message.error('장비 데이터를 불러오는 중 오류가 발생했습니다.');
      setEquipment([]);
    }
  };
  
  // 요청 데이터 로드
  const loadRequestData = async () => {
    try {
      const response = await rentalService.getMyRequests(requestPage);
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setRequests(response.data);
          setTotalRequests(response.data.length);
          setTotalRequestPages(Math.ceil(response.data.length / 10));
        } else if ('results' in response.data) {
          const paginatedData = response.data as PaginatedResponse<RentalRequest>;
          setRequests(paginatedData.results);
          setTotalRequests(paginatedData.count);
          setTotalRequestPages(Math.ceil(paginatedData.count / 10));
        }
      }
    } catch (error) {
      console.error('요청 데이터 로드 실패:', error);
    }
  };
  
  // 대여 데이터 로드
  const loadRentalData = async () => {
    try {
      const response = await rentalService.getMyRentals(rentalPage);
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setRentals(response.data);
          setTotalRentals(response.data.length);
          setTotalRentalPages(Math.ceil(response.data.length / 10));
        } else if ('results' in response.data) {
          const paginatedData = response.data as PaginatedResponse<ApiRental>;
          setRentals(paginatedData.results);
          setTotalRentals(paginatedData.count);
          setTotalRentalPages(Math.ceil(paginatedData.count / 10));
        }
      }
    } catch (error) {
      console.error('대여 데이터 로드 실패:', error);
    }
  };

  // 대여 신청 다이얼로그 열기
  const handleOpenRentDialog = () => {
    loadEquipmentData();
    setOpenRentDialog(true);
  };

  // 반납 신청 다이얼로그 열기
  const handleOpenReturnDialog = (rentalId: number) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;
    
    setSelectedRental(rental);
    setOpenReturnDialog(true);
  };

  // 대여 신청 처리
  const handleSubmitRentRequest = async () => {
    if (!selectedEquipment || !returnDate) {
      message.warning('장비와 반납 예정일을 모두 선택해주세요.');
      return;
    }

    console.log('대여 신청 시작');
    setLoading(true);
    try {
      console.log('대여 신청 API 요청 전송');
      const result = await rentalService.createRentalRequest({
        equipment: selectedEquipment,
        request_type: "RENTAL",
        expected_return_date: returnDate.toISOString(),
        request_reason: notes
      });
      console.log('대여 신청 API 응답:', result);

      // 응답 처리 개선 - success 필드가 없어도 성공으로 처리
      if (result && (result.success || result.data)) {
        message.success('대여 신청이 완료되었습니다.');
        setOpenRentDialog(false);
        resetDialogFields();
        
        console.log('데이터 갱신 시작');
        // 데이터 갱신
        await syncData();
        console.log('데이터 갱신 완료');
      } else {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.detail || '대여 신청 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('대여 신청 중 오류 발생:', error);
      message.error('대여 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 다이얼로그 필드 초기화
  const resetDialogFields = () => {
    setSelectedEquipment(null);
    setSelectedRental(null);
    setReturnDate(dayjs().add(7, 'day'));
    setNotes('');
  };

  // 모달 닫기 함수
  const closeReturnModal = () => {
    setOpenReturnDialog(false);
    setSelectedRental(null);
    setNotes('');
  };

  // 반납 신청 처리
  const handleSubmitReturnRequest = async () => {
    if (!selectedRental) {
      message.warning('반납할 기기를 선택해주세요.');
      return;
    }

    // 먼저 모달 닫기
    console.log('모달 닫기...');
    setOpenReturnDialog(false);
    
    setLoading(true);
    try {
      console.log('반납 신청 시작...', selectedRental);

      const rentalRequestData = {
        equipment: selectedRental.equipment.id,
        request_type: 'RETURN' as const,
        expected_return_date: selectedRental.expected_return_date,
        request_reason: notes
      };
      console.log('요청 데이터:', rentalRequestData);

      const response = await rentalService.createRentalRequest(rentalRequestData);
      console.log('반납 신청 응답:', response);

      // 응답 처리 개선 - success 필드가 없어도 성공으로 처리
      if (response && (response.success || response.data)) {
        // 성공 메시지 표시
        console.log('성공 메시지 표시...');
        message.success('반납 요청이 성공적으로 제출되었습니다.');

        // 나머지 상태 초기화
        setSelectedRental(null);
        setNotes('');

        // 데이터 새로고침
        console.log('데이터 새로고침 시작...');
        setTimeout(async () => {
          await syncData();
          console.log('데이터 새로고침 완료');
        }, 500);
      } else {
        throw new Error('반납 요청에 실패했습니다.');
      }
    } catch (error) {
      console.error('반납 신청 오류:', error);
      message.error('반납 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 반납 신청 버튼 컴포넌트
  const ReturnButton = ({ rental }: { rental: Rental }) => {
    // 이미 반납 신청이 진행 중인지 확인
    const hasPendingReturnRequest = requests.some(
      req => req.equipment === rental.equipment.id && 
             req.request_type === "RETURN" && 
             req.status === "PENDING"
    );

    return (
      <Button
        variant="outlined"
        size="small"
        color="primary"
        startIcon={<AssignmentReturned />}
        disabled={rental.status !== 'RENTED' || hasPendingReturnRequest}
        onClick={() => handleOpenReturnDialog(rental.id)}
      >
        {hasPendingReturnRequest ? '반납 신청 중' : '반납 신청'}
      </Button>
    );
  };

  // 알림 표시
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // 알림 닫기
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const handleExport = async () => {
    try {
      const response = await rentalService.exportRentals({
        start_date: exportStartDate?.format('YYYY-MM-DD'),
        end_date: exportEndDate?.format('YYYY-MM-DD')
      });
      if (response.success) {
        message.success('대여 내역이 성공적으로 내보내졌습니다.');
      }
    } catch (error) {
      message.error('대여 내역 내보내기 중 오류가 발생했습니다.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary' }}>
          장비 대여 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenRentDialog}
            disabled={loading}
            title={equipment.length === 0 ? '대여 가능한 장비가 없습니다.' : '대여 신청'}
          >
            대여 신청 {equipment.length > 0 && `(${equipment.length})`}
          </Button>
          <IconButton onClick={syncData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="내 대여 현황" id="rental-tab-0" aria-controls="rental-tabpanel-0" />
          <Tab label="대여 신청 내역" id="rental-tab-1" aria-controls="rental-tabpanel-1" />
        </Tabs>

        {/* 내 대여 현황 탭 */}
        <TabPanel value={tabValue} index={0}>
          {rentals.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              현재 대여 중인 장비가 없습니다.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  총 {totalRentals}개의 대여 내역이 있습니다.
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>물품번호</TableCell>
                      <TableCell>제조사</TableCell>
                      <TableCell>모델명</TableCell>
                      <TableCell>일련번호</TableCell>
                      <TableCell>장비 유형</TableCell>
                      <TableCell>제작년도</TableCell>
                      <TableCell>구입일시</TableCell>
                      <TableCell>대여일</TableCell>
                      <TableCell>반납 예정일</TableCell>
                      <TableCell>실제 반납일</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>비고</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rentals.map((rental) => (
                      <TableRow key={rental.id}>
                        <TableCell>{(rental as any).equipment_detail?.manufacturer || rental.equipment.manufacturer}</TableCell>
                        <TableCell>{(rental as any).equipment_detail?.model_name || rental.equipment.model_name}</TableCell>
                        <TableCell>{(rental as any).equipment_detail?.asset_number || rental.equipment.asset_number}</TableCell>
                        <TableCell>{(rental as any).equipment_detail?.equipment_type_display || rental.equipment.equipment_type_display}</TableCell>
                        <TableCell>{(rental as any).equipment_detail?.manufacture_year || rental.equipment.manufacture_year || '-'}</TableCell>
                        <TableCell>{(rental as any).equipment_detail?.purchase_date ? dayjs((rental as any).equipment_detail.purchase_date).format('YYYY-MM-DD') : rental.equipment.purchase_date ? dayjs(rental.equipment.purchase_date).format('YYYY-MM-DD') : '-'}</TableCell>
                        <TableCell>{dayjs(rental.rental_date).format('YYYY-MM-DD')}</TableCell>
                        <TableCell>{dayjs(rental.due_date).format('YYYY-MM-DD')}</TableCell>
                        <TableCell>{rental.return_date ? dayjs(rental.return_date).format('YYYY-MM-DD') : '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getRentalStatusDisplay(rental, requests)}
                            color={getRentalStatusColor(rental, requests)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{rental.notes || '-'}</TableCell>
                        <TableCell>
                          <ReturnButton rental={rental} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {totalRentalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <Pagination 
                    count={totalRentalPages} 
                    page={rentalPage} 
                    onChange={handleRentalPageChange} 
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        {/* 대여 신청 내역 탭 */}
        <TabPanel value={tabValue} index={1}>
          {requests.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              신청한 대여 내역이 없습니다.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  총 {totalRequests}개의 신청 내역이 있습니다.
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>장비명</TableCell>
                      <TableCell>제조사</TableCell>
                      <TableCell>모델명</TableCell>
                      <TableCell>일련번호</TableCell>
                      <TableCell>장비 유형</TableCell>
                      <TableCell>제작년도</TableCell>
                      <TableCell>구입일시</TableCell>
                      <TableCell>요청 유형</TableCell>
                      <TableCell>신청일</TableCell>
                      <TableCell>반납 예정일</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>요청사유</TableCell>
                      <TableCell>거절사유</TableCell>
                      <TableCell>처리자</TableCell>
                      <TableCell>처리일</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((request: RentalRequest) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.equipment_detail ? request.equipment_detail.manufacturer : '정보 없음'}</TableCell>
                        <TableCell>{request.equipment_detail ? request.equipment_detail.model_name : '정보 없음'}</TableCell>
                        <TableCell>{request.equipment_detail ? request.equipment_detail.asset_number : '정보 없음'}</TableCell>
                        <TableCell>{request.equipment_detail ? request.equipment_detail.equipment_type_display : '정보 없음'}</TableCell>
                        <TableCell>{request.equipment_detail ? (request.equipment_detail.manufacture_year || '-') : '-'}</TableCell>
                        <TableCell>{request.equipment_detail && request.equipment_detail.purchase_date ? dayjs(request.equipment_detail.purchase_date).format('YYYY-MM-DD') : '-'}</TableCell>
                        <TableCell>{request.request_type_display}</TableCell>
                        <TableCell>{dayjs(request.requested_date).format('YYYY-MM-DD HH:mm')}</TableCell>
                        <TableCell>{request.expected_return_date ? dayjs(request.expected_return_date).format('YYYY-MM-DD') : '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={request.status_display} 
                            color={getRequestStatusColor(request.status)} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{request.request_reason || '-'}</TableCell>
                        <TableCell>{request.reject_reason || '-'}</TableCell>
                        <TableCell>{request.processed_by ? request.processed_by.username : '-'}</TableCell>
                        <TableCell>{request.processed_at ? dayjs(request.processed_at).format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {totalRequestPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <Pagination 
                    count={totalRequestPages} 
                    page={requestPage} 
                    onChange={handleRequestPageChange} 
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>
      </Paper>

      {/* 대여 신청 다이얼로그 */}
      <Dialog open={openRentDialog} onClose={() => setOpenRentDialog(false)} fullWidth>
        <DialogTitle>장비 대여 신청</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              {equipment.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  현재 대여 가능한 장비가 없습니다.
                </Alert>
              ) : (
                <TextField
                  select
                  label="대여할 장비"
                  fullWidth
                  value={selectedEquipment || ''}
                  onChange={(e) => setSelectedEquipment(Number(e.target.value))}
                  required
                >
                  <MenuItem value="">
                    <em>장비를 선택하세요</em>
                  </MenuItem>
                  {equipment.map((equipment) => (
                    <MenuItem key={equipment.id} value={equipment.id}>
                      {equipment.manufacturer} {equipment.model_name} ({equipment.equipment_type_display}) - {equipment.asset_number || equipment.serial_number}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="반납 예정일"
                  value={returnDate}
                  onChange={(newValue) => setReturnDate(newValue)}
                  disablePast
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="신청 사유"
                multiline
                rows={4}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="장비 대여 목적을 입력하세요"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRentDialog(false)} color="inherit">
            취소
          </Button>
          <Button 
            onClick={handleSubmitRentRequest} 
            color="primary" 
            variant="contained"
            disabled={loading || equipment.length === 0}
          >
            신청하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 반납 신청 다이얼로그 */}
      <Dialog 
        open={openReturnDialog} 
        onClose={closeReturnModal} 
        fullWidth
        sx={{ zIndex: 1500 }}
      >
        <DialogTitle>장비 반납 신청</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="반납 사유"
                multiline
                rows={4}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="특이사항이 있다면 입력해주세요"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={closeReturnModal} 
            color="inherit"
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmitReturnRequest} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            반납 신청
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 