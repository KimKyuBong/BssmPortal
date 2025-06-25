'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, CircularProgress, Snackbar, Alert, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Grid, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Chip, MenuItem, Card, 
  CardContent, CardActions, Chip as MuiChip, FormControl, InputLabel, Select
} from '@mui/material';
import { Assignment, Refresh as RefreshIcon, Add as AddIcon, Info as InfoIcon, FilterList } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Equipment as ApiEquipment } from '@/services/api';
import rentalService from '@/services/rental';
import equipmentService from '@/services/equipment';
import 'dayjs/locale/ko';
import dayjs from 'dayjs';
import { message } from 'antd';

interface Equipment extends ApiEquipment {
  mac_addresses: Array<{
    mac_address: string;
    is_primary: boolean;
  }>;
  equipment_type_display: string;
  manufacture_year?: number;
  purchase_date?: string;
}

// 장비 유형 옵션
const EQUIPMENT_TYPE_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'LAPTOP', label: '노트북' },
  { value: 'MACBOOK', label: '맥북' },
  { value: 'TABLET', label: '태블릿' },
  { value: 'DESKTOP', label: '데스크톱' },
  { value: 'MONITOR', label: '모니터' },
  { value: 'PRINTER', label: '프린터' },
  { value: 'PROJECTOR', label: '프로젝터' },
  { value: 'OTHER', label: '기타' },
];

export default function RentalsPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openRentDialog, setOpenRentDialog] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [returnDate, setReturnDate] = useState<any>(dayjs().add(7, 'day'));
  const [notes, setNotes] = useState<string>('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('ALL');
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // 초기 데이터 로드
  useEffect(() => {
    loadEquipmentData();
  }, []);

  // 장비 유형 필터링 적용
  useEffect(() => {
    if (selectedEquipmentType === 'ALL') {
      setFilteredEquipment(equipment);
    } else {
      const filtered = equipment.filter(eq => eq.equipment_type === selectedEquipmentType);
      setFilteredEquipment(filtered);
    }
  }, [equipment, selectedEquipmentType]);

  // 장비 데이터 로드
  const loadEquipmentData = async () => {
    try {
      console.log('대여 가능한 장비 조회 시작...');
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // 대여 신청 다이얼로그 열기
  const handleOpenRentDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setReturnDate(dayjs().add(7, 'day'));
    setNotes('');
    setOpenRentDialog(true);
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
        equipment: selectedEquipment.id,
        request_type: "RENTAL",
        expected_return_date: returnDate.toISOString(),
        request_reason: notes
      });
      console.log('대여 신청 API 응답:', result);

      if (result && (result.success || result.data)) {
        message.success('대여 신청이 완료되었습니다.');
        setOpenRentDialog(false);
        resetDialogFields();
        
        // 데이터 갱신
        await loadEquipmentData();
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
    setReturnDate(dayjs().add(7, 'day'));
    setNotes('');
  };

  // 장비 유형별 통계 계산
  const getEquipmentTypeStats = () => {
    const stats: { [key: string]: number } = {};
    EQUIPMENT_TYPE_OPTIONS.forEach(option => {
      if (option.value === 'ALL') {
        stats[option.value] = equipment.length;
      } else {
        stats[option.value] = equipment.filter(eq => eq.equipment_type === option.value).length;
      }
    });
    return stats;
  };

  const equipmentStats = getEquipmentTypeStats();

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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary' }}>
          대여 가능한 장비 목록
        </Typography>
        <IconButton onClick={loadEquipmentData} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* 장비 유형별 통계 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterList sx={{ mr: 1 }} />
          장비 유형별 현황
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {EQUIPMENT_TYPE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={`${option.label} (${equipmentStats[option.value]})`}
              color={selectedEquipmentType === option.value ? 'primary' : 'default'}
              variant={selectedEquipmentType === option.value ? 'filled' : 'outlined'}
              onClick={() => setSelectedEquipmentType(option.value)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* 장비 유형 필터 */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>장비 유형 선택</InputLabel>
          <Select
            value={selectedEquipmentType}
            label="장비 유형 선택"
            onChange={(e) => setSelectedEquipmentType(e.target.value)}
          >
            {EQUIPMENT_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label} ({equipmentStats[option.value]})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {filteredEquipment.length === 0 && !loading ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {selectedEquipmentType === 'ALL' 
            ? '현재 대여 가능한 장비가 없습니다.'
            : `${EQUIPMENT_TYPE_OPTIONS.find(opt => opt.value === selectedEquipmentType)?.label} 유형의 대여 가능한 장비가 없습니다.`
          }
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredEquipment.map((equipment) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={equipment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" noWrap>
                      {equipment.manufacturer} {equipment.model_name}
                    </Typography>
                    <Chip 
                      label={equipment.equipment_type_display} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>관리번호:</strong> {equipment.management_number || '미지정'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>시리얼번호:</strong> {equipment.serial_number}
                  </Typography>
                  
                  {equipment.manufacture_year && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>제작년도:</strong> {equipment.manufacture_year}
                    </Typography>
                  )}
                  
                  {equipment.purchase_date && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>구매일:</strong> {dayjs(equipment.purchase_date).format('YYYY-MM-DD')}
                    </Typography>
                  )}
                  
                  {equipment.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {equipment.description}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Assignment />}
                    onClick={() => handleOpenRentDialog(equipment)}
                    fullWidth
                  >
                    대여 신청
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 대여 신청 다이얼로그 */}
      <Dialog open={openRentDialog} onClose={() => setOpenRentDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          장비 대여 신청
          {selectedEquipment && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedEquipment.manufacturer} {selectedEquipment.model_name} ({selectedEquipment.equipment_type_display})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="선택된 장비"
                fullWidth
                value={selectedEquipment ? `${selectedEquipment.manufacturer} ${selectedEquipment.model_name}` : ''}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
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
            disabled={loading}
          >
            신청하기
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