'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  TableContainer,
  TablePagination,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  IconButton,
  Alert,
  Snackbar,
  InputAdornment,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import { RentalRequest } from '@/services/api';
import rentalService, { RENTAL_REQUEST_STATUS } from '@/services/rental';

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

export default function RentalRequestsPage() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING'); // 기본값은 '승인 대기 중'
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // 페이지네이션 상태
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // 상세 정보 다이얼로그 상태
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  
  // 승인/거부 다이얼로그 상태
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [requestIdToProcess, setRequestIdToProcess] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  
  // 알림 상태
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // 초기 데이터 로드
  useEffect(() => {
    loadRequests();
  }, []);
  
  // 검색 및 필터 적용
  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, statusFilter, typeFilter]);
  
  // 요청 목록 로드
  const loadRequests = async (pageNum?: number) => {
    setLoading(true);
    try {
      const currentPage = pageNum || page + 1; // 페이지 번호가 제공되지 않으면 현재 페이지 사용
      const result = await rentalService.getRentalRequests(currentPage);
      
      if (result.success && result.data) {
        // 응답 데이터를 배열로 처리
        const requestData = Array.isArray(result.data) ? result.data : [];
        setRequests(requestData);
        setTotalCount(requestData.length);
        setTotalPages(1);
        
        // 필터링 적용
        filterRequests();
      } else {
        console.error('요청 데이터를 불러오는데 실패했습니다:', result.message);
        showNotification('요청 데이터를 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('요청 데이터 로드 중 오류 발생:', error);
      showNotification('요청 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    loadRequests();
  };

  // 페이지 변경 핸들러
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    loadRequests(newPage + 1); // 서버 페이지 번호는 1부터 시작
  };
  
  // 페이지당 항목 수 변경 핸들러
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0); // 첫 페이지로 리셋
    // 새 페이지당 항목 수로 데이터 다시 로드
    loadRequests(1);
  };
  
  // 요청 목록 필터링
  const filterRequests = () => {
    if (!requests || !Array.isArray(requests)) {
      setFilteredRequests([]);
      return;
    }
    
    // 검색어로 필터링
    let filtered = [...requests];
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.user?.username?.toLowerCase().includes(query) ||
        (item.equipment_detail && item.equipment_detail.name?.toLowerCase().includes(query)) ||
        (item.request_reason && item.request_reason.toLowerCase().includes(query))
      );
    }
    
    // 상태 필터링
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // 유형 필터링
    if (typeFilter) {
      filtered = filtered.filter(item => item.request_type === typeFilter);
    }
    
    setFilteredRequests(filtered);
  };
  
  // 상세 정보 다이얼로그 열기
  const handleOpenDetailDialog = (request: RentalRequest) => {
    setSelectedRequest(request);
    setOpenDetailDialog(true);
  };
  
  // 승인/거부 다이얼로그 열기
  const handleOpenActionDialog = (requestId: number, action: 'approve' | 'reject') => {
    setRequestIdToProcess(requestId);
    setActionType(action);
    setOpenActionDialog(true);
  };
  
  // 요청 승인/거부 처리
  const handleProcessRequest = async (requestId: number | null, action: 'approve' | 'reject', reason?: string) => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const response = await rentalService.processRequest(requestId, action, reason);
      if (response.success) {
        // 즉시 상태 업데이트
        setRequests(prevRequests => 
          prevRequests.map(request => 
            request.id === requestId 
              ? { ...request, status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
              : request
          )
        );
        
        showNotification(`요청이 ${action === 'approve' ? '승인' : '거절'}되었습니다.`, 'success');
        // 요청 목록 새로고침
        loadRequests();
      } else {
        showNotification(response.message || '요청 처리 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('요청 처리 중 오류:', error);
      showNotification('요청 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
      setOpenActionDialog(false);
    }
  };
  
  // 엑셀 다운로드 핸들러
  const handleExportExcel = async () => {
    try {
      await rentalService.exportRequestsToExcel();
    } catch (error) {
      console.error('엑셀 다운로드 중 오류 발생:', error);
      showNotification('엑셀 파일 다운로드 중 오류가 발생했습니다.', 'error');
    }
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: 'text.primary' }}>
          대여/반납 요청 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
          >
            엑셀 다운로드
          </Button>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 필터 섹션 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="사용자명, 장비명, 사유 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                label="상태"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="PENDING">승인 대기</MenuItem>
                <MenuItem value="APPROVED">승인됨</MenuItem>
                <MenuItem value="REJECTED">거부됨</MenuItem>
                <MenuItem value="CANCELLED">취소됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth>
              <InputLabel>요청 유형</InputLabel>
              <Select
                value={typeFilter}
                label="요청 유형"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="RENT">대여 신청</MenuItem>
                <MenuItem value="RETURN">반납 신청</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 로딩 표시 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 요청 목록 테이블 */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>사용자</TableCell>
                <TableCell>요청 유형</TableCell>
                <TableCell>장비명</TableCell>
                <TableCell>요청일</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.user.username}</TableCell>
                  <TableCell>{request.request_type_display}</TableCell>
                  <TableCell>
                    {request.equipment_detail ? request.equipment_detail.name : '정보 없음'}
                  </TableCell>
                  <TableCell>
                    {dayjs(request.created_at).format('YYYY-MM-DD')}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status_display} 
                      color={getRequestStatusColor(request.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="상세 정보">
                        <IconButton 
                          size="small" 
                          color="info"
                          onClick={() => handleOpenDetailDialog(request)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {request.status === 'PENDING' && (
                        <>
                          <Tooltip title="승인">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleOpenActionDialog(request.id, 'approve')}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="거부">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenActionDialog(request.id, 'reject')}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {loading ? '로딩 중...' : '요청이 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행 수:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Paper>

      {/* 요청 상세 정보 다이얼로그 */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'text.primary' }}>요청 상세 정보</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">사용자</Typography>
                <Typography variant="body1">{selectedRequest.user.username}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">요청 유형</Typography>
                <Typography variant="body1">{selectedRequest.request_type_display}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">장비명</Typography>
                <Typography variant="body1">
                  {selectedRequest.equipment_detail ? selectedRequest.equipment_detail.name : '정보 없음'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">장비 종류</Typography>
                <Typography variant="body1">
                  {selectedRequest.equipment_detail ? selectedRequest.equipment_detail.equipment_type_display : '정보 없음'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">요청일</Typography>
                <Typography variant="body1">
                  {dayjs(selectedRequest.created_at).format('YYYY-MM-DD HH:mm')}
                </Typography>
              </Grid>
              {selectedRequest.expected_return_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">반납 예정일</Typography>
                  <Typography variant="body1">
                    {dayjs(selectedRequest.expected_return_date).format('YYYY-MM-DD')}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">상태</Typography>
                <Chip 
                  label={selectedRequest.status_display} 
                  color={getRequestStatusColor(selectedRequest.status) as any}
                  size="small"
                />
              </Grid>
              {selectedRequest.processed_by && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">처리자</Typography>
                  <Typography variant="body1">
                    {selectedRequest.processed_by.name}
                  </Typography>
                </Grid>
              )}
              {selectedRequest.processed_at && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">처리일시</Typography>
                  <Typography variant="body1">
                    {dayjs(selectedRequest.processed_at).format('YYYY-MM-DD HH:mm')}
                  </Typography>
                </Grid>
              )}
              {selectedRequest.request_reason && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">요청사유</Typography>
                  <Typography variant="body1">
                    {selectedRequest.request_reason}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>
            닫기
          </Button>
          {selectedRequest && selectedRequest.status === 'PENDING' && (
            <>
              <Button 
                onClick={() => {
                  setOpenDetailDialog(false);
                  handleOpenActionDialog(selectedRequest.id, 'approve');
                }} 
                variant="contained" 
                color="success"
              >
                승인
              </Button>
              <Button 
                onClick={() => {
                  setOpenDetailDialog(false);
                  handleOpenActionDialog(selectedRequest.id, 'reject');
                }} 
                variant="contained" 
                color="error"
              >
                거부
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* 승인/거부 다이얼로그 */}
      <Dialog open={openActionDialog} onClose={() => setOpenActionDialog(false)}>
        <DialogTitle sx={{ color: 'text.primary' }}>
          {actionType === 'approve' ? '요청 승인' : '요청 거부'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {actionType === 'approve' 
              ? '이 요청을 승인하시겠습니까? 승인 시 장비 상태가 변경됩니다.' 
              : '이 요청을 거부하시겠습니까?'}
          </Typography>
          {actionType === 'reject' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="거절 사유"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenActionDialog(false);
            setRejectReason('');
          }} disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={() => {
              if (actionType === 'reject' && !rejectReason) {
                showNotification('거절 사유를 입력해주세요.', 'error');
                return;
              }
              requestIdToProcess && handleProcessRequest(requestIdToProcess, actionType, rejectReason);
              setRejectReason('');
            }} 
            variant="contained" 
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (actionType === 'approve' ? '승인' : '거부')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 