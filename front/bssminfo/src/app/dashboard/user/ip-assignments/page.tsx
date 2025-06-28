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
  Pagination
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import rentalService from '@/services/rental';
import { DeviceHistory } from '@/services/admin';

export default function UserIpAssignmentsPage() {
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchIpAssignments(page);
  }, [page]);

  const fetchIpAssignments = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await rentalService.getUserIpAssignments();
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

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '없음';
    return dayjs(dateString).locale('ko').format('YYYY년 MM월 DD일 HH:mm');
  };

  const getActionChip = (action: string) => {
    switch (action) {
      case 'create':
        return <Chip label="등록" color="success" size="small" />;
      case 'delete':
        return <Chip label="삭제" color="error" size="small" />;
      case 'update':
        return <Chip label="수정" color="primary" size="small" />;
      default:
        return <Chip label={action} color="default" size="small" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'black' }}>
        내 IP 발급 내역
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : deviceHistory.length === 0 ? (
        <Alert severity="info">등록된 IP 발급 내역이 없습니다.</Alert>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              총 {typeof totalCount === 'number' && !isNaN(totalCount) ? totalCount : 0}개의 내역이 있습니다.
            </Typography>
          </Box>
          
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>작업</TableCell>
                  <TableCell>MAC 주소</TableCell>
                  <TableCell>기기 이름</TableCell>
                  <TableCell>상세 내역</TableCell>
                  <TableCell>발급 일시</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deviceHistory.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>{getActionChip(history.action)}</TableCell>
                    <TableCell>{history.device_mac}</TableCell>
                    <TableCell>{history.device_name}</TableCell>
                    <TableCell>{history.details}</TableCell>
                    <TableCell>{formatDate(history.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}