'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Divider,
  Alert,
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import equipmentService, { ModelBatchUpdateData } from '@/services/equipment';
import { Equipment } from '@/services/api';
import { message } from 'antd';

interface UpdatedEquipment {
  id: number;
  name: string;
  model_name: string;
  manufacture_year?: number;
  purchase_date?: string;
  serial_number: string;
}

export default function ModelBatchUpdate() {
  // 모델명 선택/입력
  const [modelName, setModelName] = useState<string>('');
  // 모델명 목록 (기존 모델들)
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  // 제작년도
  const [manufactureYear, setManufactureYear] = useState<number | undefined>();
  // 구매일시
  const [purchaseDate, setPurchaseDate] = useState<Dayjs | null>(null);
  // 로딩 상태
  const [loading, setLoading] = useState<boolean>(false);
  // 결과 메시지
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);
  // 업데이트된 장비들
  const [updatedEquipments, setUpdatedEquipments] = useState<UpdatedEquipment[]>([]);

  // 고유한 모델명 목록 가져오기
  useEffect(() => {
    const fetchModelNames = async () => {
      try {
        const response = await equipmentService.getAllEquipment();
        if (response.success && Array.isArray(response.data)) {
          // 중복 제거하고 고유한 모델명만 추출
          const uniqueModels = Array.from(
            new Set(
              response.data
                .map((equipment: Equipment) => equipment.model_name)
                .filter((name: string | null) => name) // null/빈 값 제거
            )
          );
          setModelOptions(uniqueModels as string[]);
        }
      } catch (error) {
        console.error("모델명 목록 로드 실패:", error);
      }
    };

    fetchModelNames();
  }, []);

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modelName) {
      message.error('모델명을 입력해주세요.');
      return;
    }
    
    if (manufactureYear === undefined && !purchaseDate) {
      message.error('생산년도나 구매일시 중 하나는 입력해야 합니다.');
      return;
    }
    
    const data: ModelBatchUpdateData = {
      model_name: modelName,
    };
    
    if (manufactureYear !== undefined) {
      data.manufacture_year = manufactureYear;
    }
    
    if (purchaseDate) {
      data.purchase_date = purchaseDate.format('YYYY-MM-DD HH:mm:ss');
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await equipmentService.updateByModel(data);
      
      if (response.success) {
        setResult({
          success: true,
          message: response.data.message || '일괄 업데이트가 완료되었습니다.'
        });
        
        // 업데이트된 장비 목록 설정
        if (response.data.updated_equipments) {
          setUpdatedEquipments(response.data.updated_equipments);
        }
        
        message.success('일괄 업데이트가 완료되었습니다.');
      } else {
        setResult({
          success: false,
          message: response.message || '일괄 업데이트에 실패했습니다.'
        });
        message.error('일괄 업데이트 실패: ' + response.message);
      }
    } catch (error) {
      console.error('일괄 업데이트 오류:', error);
      setResult({
        success: false,
        message: '일괄 업데이트 처리 중 오류가 발생했습니다.'
      });
      message.error('일괄 업데이트 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2,
        boxShadow: theme => theme.palette.mode === 'dark' 
          ? '0 4px 20px 0 rgba(0,0,0,0.4)' 
          : '0 4px 20px 0 rgba(0,0,0,0.1)'
      }}
    >
      <Typography variant="h5" gutterBottom>
        모델별 일괄 업데이트
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        특정 모델명을 가진 모든 장비의 생산년도와 구매일시를 한 번에 업데이트합니다.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel id="model-name-label">모델명</InputLabel>
          <Select
            labelId="model-name-label"
            id="model-name"
            value={modelName}
            onChange={(e: SelectChangeEvent) => setModelName(e.target.value)}
            label="모델명"
            displayEmpty
            required
          >
            <MenuItem value="">
              <em>모델명 선택</em>
            </MenuItem>
            {modelOptions.map((model) => (
              <MenuItem key={model} value={model}>{model}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          margin="normal"
          fullWidth
          id="modelNameInput"
          label="모델명 직접 입력"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          helperText="모델명이 목록에 없는 경우 직접 입력하세요"
        />
        
        <TextField
          margin="normal"
          fullWidth
          id="manufactureYear"
          label="생산년도"
          type="number"
          value={manufactureYear === undefined ? '' : manufactureYear}
          onChange={(e) => {
            const val = e.target.value;
            setManufactureYear(val === '' ? undefined : parseInt(val, 10));
          }}
          InputProps={{ inputProps: { min: 1900, max: new Date().getFullYear() } }}
        />
        
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="구매일시"
            value={purchaseDate}
            onChange={(newValue) => setPurchaseDate(newValue)}
            slotProps={{
              textField: {
                margin: 'normal',
                fullWidth: true,
                helperText: '구매일시가 정확하지 않은 경우 생략 가능합니다'
              }
            }}
          />
        </LocalizationProvider>
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading || (!modelName) || (manufactureYear === undefined && !purchaseDate)}
        >
          {loading ? <CircularProgress size={24} /> : '일괄 업데이트'}
        </Button>
      </Box>
      
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {result.message}
        </Alert>
      )}
      
      {updatedEquipments.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">업데이트된 장비 목록 ({updatedEquipments.length})</Typography>
          <List sx={{ bgcolor: 'background.paper', mt: 1, borderRadius: 1 }}>
            {updatedEquipments.map((equipment) => (
              <ListItem key={equipment.id} divider>
                <ListItemText
                  primary={`${equipment.name} (${equipment.model_name})`}
                  secondary={
                    <React.Fragment>
                      <Typography component="span" variant="body2" color="text.primary">
                        시리얼: {equipment.serial_number}
                      </Typography>
                      <br />
                      {equipment.manufacture_year && `생산년도: ${equipment.manufacture_year}`}
                      {equipment.manufacture_year && equipment.purchase_date && ' | '}
                      {equipment.purchase_date && `구매일시: ${dayjs(equipment.purchase_date).format('YYYY-MM-DD HH:mm:ss')}`}
                    </React.Fragment>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
} 