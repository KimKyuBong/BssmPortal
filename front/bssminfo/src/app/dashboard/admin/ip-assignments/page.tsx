'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Pagination,
  Stack,
  Grid,
  InputAdornment,
  Snackbar
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { PaginatedResponse, DeviceHistory } from '@/services/admin';
import adminService from '@/services/admin';

export default function AdminIpAssignmentsPage() {
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Snackbar 상태 관리
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const fetchDeviceHistory = async (pageNum = 1, search = '') => {
    try {
      setLoading(true);
      const response = await adminService.getAllIpAssignments(pageNum, search);
      if (response.success && response.data) {
        // 페이지네이션 정보 설정
        setTotalCount(response.data.total_count || 0);
        setTotalPages(response.data.total_pages || 1);
        
        // 결과 데이터 설정
        if (response.data.results && Array.isArray(response.data.results)) {
          setDeviceHistory(response.data.results);
        } else {
          setDeviceHistory([]);
        }
      } else {
        setError(response.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('IP 발급 내역 조회 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceHistory(page, searchTerm);
  }, [page]);

  const handleSearch = () => {
    setPage(1); // 검색 시 첫 페이지로 이동
    fetchDeviceHistory(1, searchTerm);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
        IP 할당 내역
      </Typography>
      
      <Box sx={{ marginBottom: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="MAC 주소, IP 주소 또는 장치 이름으로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSearch}
                      size="small"
                    >
                      검색
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {deviceHistory.length === 0 ? (
            <Typography variant="body1" sx={{ mt: 4, textAlign: 'center' }}>
              IP 할당 내역이 없습니다.
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>사용자</TableCell>
                      <TableCell>기기 MAC</TableCell>
                      <TableCell>기기 이름</TableCell>
                      <TableCell>작업</TableCell>
                      <TableCell>상세 정보</TableCell>
                      <TableCell>일시</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deviceHistory.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell>{history.username}</TableCell>
                        <TableCell>{history.device_mac}</TableCell>
                        <TableCell>{history.device_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={history.action} 
                            color={
                              history.action === '등록' ? 'success' :
                              history.action === '삭제' ? 'error' :
                              history.action === '수정' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{history.details}</TableCell>
                        <TableCell>
                          {dayjs(history.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                <Typography variant="body2">
                  총 {totalCount}개의 기록 중 {(page - 1) * 10 + 1}-
                  {Math.min(page * 10, totalCount)}개 표시
                </Typography>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={(e, p) => setPage(p)}
                  color="primary"
                />
              </Stack>
            </>
          )}
        </>
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 