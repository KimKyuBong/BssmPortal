'use client';

import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Tabs,
  Tab
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Refresh as RefreshIcon, Block as BlockIcon, Laptop as LaptopIcon } from '@mui/icons-material';
import { BlacklistedIPResponse } from '@/services/admin';
import adminService from '@/services/admin';
import DeviceManagement from '@/components/admin/DeviceManagement';
import useDevices from '@/hooks/useDevices';

export default function IpManagementPage() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // IP 블랙리스트 관련 상태
  const [blacklistedIPs, setBlacklistedIPs] = useState<string[]>([]);
  const [newIPAddress, setNewIPAddress] = useState('');
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  
  // Snackbar 상태 관리
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // 장치 관리 훅 사용
  const {
    devices,
    filteredDevices,
    loading: devicesLoading,
    error: devicesError,
    selectedDevices,
    selectedDeviceCount,
    selectedDeviceList,
    deviceSearchTerm,
    setDeviceSearchTerm,
    handleDeviceSelection,
    handleDeleteDevice,
    handleToggleDeviceActive,
    handleBulkToggleDeviceActive,
    handleBulkDeleteDevices,
    exportToExcel,
    fetchDevices
  } = useDevices();

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      fetchDevices();
    } else if (newValue === 1) {
      fetchBlacklistedIPs();
    }
  };

  // IP 블랙리스트 관련 함수들
  const fetchBlacklistedIPs = async () => {
    try {
      setBlacklistLoading(true);
      const response = await adminService.getBlacklistedIPs();
      if (response.success && response.data) {
        setBlacklistedIPs(response.data.blacklisted_ips || []);
      } else {
        showSnackbar(response.message || '블랙리스트된 IP 목록을 가져오는데 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('블랙리스트 IP 조회 오류:', err);
      showSnackbar('블랙리스트된 IP 목록을 가져오는데 실패했습니다.', 'error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  const handleAddToBlacklist = async () => {
    if (!newIPAddress) {
      showSnackbar('IP 주소를 입력해주세요.', 'warning');
      return;
    }

    // IP 주소 유효성 검사 (간단한 형식 체크)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(newIPAddress)) {
      showSnackbar('유효한 IP 주소 형식이 아닙니다.', 'error');
      return;
    }

    try {
      setBlacklistLoading(true);
      const response = await adminService.blacklistIP(newIPAddress);
      if (response.success) {
        showSnackbar(`IP 주소 ${newIPAddress}가 블랙리스트에 추가되었습니다.`, 'success');
        setNewIPAddress('');
        // 블랙리스트 목록 갱신
        await fetchBlacklistedIPs();
      } else {
        showSnackbar(response.message || 'IP 주소를 블랙리스트에 추가하는데 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('블랙리스트 추가 오류:', err);
      showSnackbar('IP 주소를 블랙리스트에 추가하는데 실패했습니다.', 'error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  const handleRemoveFromBlacklist = async (ipAddress: string) => {
    try {
      setBlacklistLoading(true);
      const response = await adminService.unblacklistIP(ipAddress);
      if (response.success) {
        showSnackbar(`IP 주소 ${ipAddress}가 블랙리스트에서 제거되었습니다.`, 'success');
        // 블랙리스트 목록 갱신
        await fetchBlacklistedIPs();
      } else {
        showSnackbar(response.message || 'IP 주소를 블랙리스트에서 제거하는데 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('블랙리스트 제거 오류:', err);
      showSnackbar('IP 주소를 블랙리스트에서 제거하는데 실패했습니다.', 'error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  useEffect(() => {
    // 초기 탭에 따라 데이터 로드
    if (activeTab === 0) {
      fetchDevices();
    } else {
      fetchBlacklistedIPs();
    }
  }, [activeTab]);

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
        IP 관리
      </Typography>
      
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="fullWidth" 
          indicatorColor="primary" 
          textColor="primary"
        >
          <Tab icon={<LaptopIcon />} label="장치 관리" iconPosition="start" />
          <Tab icon={<BlockIcon />} label="블랙리스트 관리" iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* 장치 관리 탭 */}
      <div role="tabpanel" hidden={activeTab !== 0}>
        {activeTab === 0 && (
          <div className="bg-white p-4 rounded shadow">
            <DeviceManagement
              devices={filteredDevices}
              loading={devicesLoading}
              error={devicesError}
              searchTerm={deviceSearchTerm}
              onSearchChange={setDeviceSearchTerm}
              selectedDevices={selectedDevices}
              selectedCount={selectedDeviceCount}
              selectedList={selectedDeviceList}
              onSelectDevice={handleDeviceSelection}
              onDeleteDevice={handleDeleteDevice}
              onToggleActive={handleToggleDeviceActive}
              onBulkToggleActive={handleBulkToggleDeviceActive}
              onBulkDelete={handleBulkDeleteDevices}
              onExportToExcel={exportToExcel}
            />
          </div>
        )}
      </div>
      
      {/* 블랙리스트 관리 탭 */}
      <div role="tabpanel" hidden={activeTab !== 1}>
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader 
                  title="IP 블랙리스트 관리" 
                  avatar={<BlockIcon sx={{ color: 'error.main' }} />}
                />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    블랙리스트에 추가된 IP 주소는 장치에 할당되지 않으며, 기존에 할당된 장치가 있다면 자동으로 새 IP가 할당됩니다.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', marginBottom: 2 }}>
                    <TextField
                      fullWidth
                      label="IP 주소"
                      placeholder="예: 10.129.50.88"
                      value={newIPAddress}
                      onChange={(e) => setNewIPAddress(e.target.value)}
                      variant="outlined"
                      size="small"
                      disabled={blacklistLoading}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleAddToBlacklist}
                      disabled={blacklistLoading}
                      sx={{ ml: 1 }}
                      startIcon={<AddIcon />}
                    >
                      추가
                    </Button>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">블랙리스트 목록</Typography>
                    <Button
                      startIcon={<RefreshIcon />}
                      onClick={fetchBlacklistedIPs}
                      disabled={blacklistLoading}
                      size="small"
                      color="primary"
                      variant="text"
                    >
                      새로고침
                    </Button>
                  </Box>
                  
                  {blacklistLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : blacklistedIPs.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ my: 2 }}>
                      블랙리스트에 등록된 IP 주소가 없습니다.
                    </Typography>
                  ) : (
                    <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                      <List dense>
                        {blacklistedIPs.map((ip) => (
                          <ListItem
                            key={ip}
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                color="error" 
                                onClick={() => handleRemoveFromBlacklist(ip)}
                                disabled={blacklistLoading}
                                size="small"
                                title="블랙리스트에서 제거"
                              >
                                <DeleteIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText 
                              primary={ip} 
                              primaryTypographyProps={{ fontWeight: 'medium' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader 
                  title="IP 관리 도움말" 
                  avatar={<RefreshIcon sx={{ color: 'info.main' }} />}
                />
                <CardContent>
                  <Typography variant="body2" paragraph>
                    이 페이지에서는 IP 주소 블랙리스트를 관리할 수 있습니다. 블랙리스트에 등록된 IP 주소는 어떤 사용자나 장치에도 할당되지 않습니다.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    이미 할당된 IP를 블랙리스트에 추가하면 해당 장치에는 자동으로 새로운 IP가 할당됩니다.
                  </Typography>
                  <Typography variant="body2">
                    IP 블랙리스트는 다음과 같은 경우에 유용합니다:
                  </Typography>
                  <ul className="list-disc ml-5 mt-2">
                    <li className="text-sm text-gray-700 mb-1">문제가 발생한 IP 주소를 더 이상 할당하지 않도록 차단</li>
                    <li className="text-sm text-gray-700 mb-1">특정 범위의 IP를 다른 용도로 예약</li>
                    <li className="text-sm text-gray-700">네트워크 문제 해결을 위한 IP 주소 격리</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </div>
      
      {/* Snackbar */}
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