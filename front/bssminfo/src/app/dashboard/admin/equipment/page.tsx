'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  CircularProgress,
  IconButton,
  Alert,
  Snackbar,
  InputAdornment,
  Divider,
  Tooltip,
  Autocomplete
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UpdateIcon from '@mui/icons-material/Update';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ko';
import { Equipment, ApiResponse } from '@/services/api';
import equipment, { ImportEquipmentResponse, ModelBatchUpdateData } from '@/services/equipment';
import rentalService from '@/services/rental';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { SelectChangeEvent } from '@mui/material';
import { User } from '@/services/rental';
import ClearIcon from '@mui/icons-material/Clear';

// API 응답 타입 추가 (파일 상단 적절한 위치에 추가)
// ImportEquipmentResponse 타입은 이미 equipment.ts에서 임포트하므로 여기서 제거

// 장비 상태에 따른 Chip 색상 정의
const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'success';
    case 'RENTED': return 'primary';
    case 'MAINTENANCE': return 'warning';
    case 'LOST': return 'error';
    case 'DAMAGED': return 'error';
    default: return 'default';
  }
};

// 일괄 업데이트 데이터 타입
interface BatchUpdateData {
  model_name: string;
  manufacture_year?: number;
  purchase_date?: string;
  purchase_price?: number;
}

// 초기 일괄 업데이트 데이터
const initialBatchUpdateData: BatchUpdateData = {
  model_name: '',
  manufacture_year: undefined,
  purchase_date: '',
  purchase_price: undefined
};

// 알림 상태 타입
interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface FormData {
  asset_number: string;
  description: string;
  manufacturer: string;
  model_name: string;
  serial_number: string;
  equipment_type: string;
  acquisition_date: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED';
  manufacture_year: string;
  purchase_date: string;
  purchase_price: string;
  rental_user?: number;
  rental_due_date?: string;
}

const initialFormData: FormData = {
  asset_number: '',
  description: '',
  manufacturer: '',
  model_name: '',
  serial_number: '',
  equipment_type: 'LAPTOP',
  acquisition_date: dayjs().format('YYYY-MM-DD'),
  status: 'AVAILABLE',
  manufacture_year: '',
  purchase_date: '',
  purchase_price: '',
  rental_user: undefined,
  rental_due_date: undefined
};

export default function EquipmentManagementPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // 검색 상태
  const [searchType, setSearchType] = useState<string>('asset_number');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // 페이지네이션 상태
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 장비 추가/수정 다이얼로그 상태
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  // 삭제 확인 다이얼로그 상태
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<number | null>(null);
  
  // 알림 상태
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });

  const [acquisitionDate, setAcquisitionDate] = useState<any>(null);

  // 파일 업로드 상태
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    created: number;
    errors: number;
    message: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 직접 대여 다이얼로그 상태
  const [openRentalDialog, setOpenRentalDialog] = useState(false);
  const [rentalFormData, setRentalFormData] = useState({
    user: null as number | null,
    equipment: null as number | null,
    rental_date: dayjs(),
    due_date: dayjs().add(7, 'day'),
    notes: ''
  });
  
  // 사용자 목록 상태
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 모델별 일괄 업데이트 다이얼로그 상태
  const [openBatchUpdateDialog, setOpenBatchUpdateDialog] = useState(false);
  const [batchUpdateData, setBatchUpdateData] = useState<ModelBatchUpdateData>({
    model_name: '',
    manufacture_year: undefined,
    purchase_date: '',
    purchase_price: undefined
  });
  const [batchUpdateLoading, setBatchUpdateLoading] = useState(false);

  // 페이지네이션 처리된 장비 목록
  const paginatedEquipment = useMemo(() => {
    // 필터링된 장비가 없거나 배열이 아닌 경우 빈 배열 반환
    if (!filteredEquipment || !Array.isArray(filteredEquipment)) {
      console.error('페이지네이션할 장비 데이터가 유효하지 않습니다:', filteredEquipment);
      return [];
    }
    
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredEquipment.slice(start, end);
  }, [filteredEquipment, page, rowsPerPage]);

  // 초기 데이터 로드
  useEffect(() => {
    loadEquipment();
    loadUsers();
  }, []);
  
  // 검색 및 필터 적용
  useEffect(() => {
    filterEquipment();
  }, [equipmentList, searchType, searchQuery, statusFilter, typeFilter]);
  
  // 장비 목록 로드
  const loadEquipment = async () => {
    try {
      setLoading(true);
      const result = await equipment.getAllEquipment();
      if (result.success && result.data) {
        console.log('장비 목록 로드:', result.data.map(item => ({
          id: item.id,
          equipment_type: item.equipment_type,
          equipment_type_display: item.equipment_type_display
        })));
        setEquipmentList(result.data);
        setFilteredEquipment(result.data);
      }
    } catch (error) {
      console.error('장비 목록 로드 실패:', error);
      setNotification({
        open: true,
        message: '장비 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 장비 목록 필터링
  const filterEquipment = () => {
    if (!equipmentList || !Array.isArray(equipmentList)) {
      setFilteredEquipment([]);
      return;
    }
    
    let filtered = [...equipmentList];
    
    // 검색어로 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        switch (searchType) {
          case 'asset_number':
            return item.asset_number?.toLowerCase().includes(query) || false;
          case 'manufacturer':
            return item.manufacturer.toLowerCase().includes(query);
          case 'model_name':
            return item.model_name?.toLowerCase().includes(query) || false;
          case 'serial_number':
            return item.serial_number.toLowerCase().includes(query);
          case 'description':
            return item.description?.toLowerCase().includes(query) || false;
          case 'rental_user':
            return item.rental?.user.name.toLowerCase().includes(query) || 
                   item.rental?.user.username.toLowerCase().includes(query);
          case 'manufacture_year':
            return item.manufacture_year?.toString().includes(query) || false;
          case 'purchase_date':
            return item.purchase_date ? dayjs(item.purchase_date).format('YYYY-MM-DD').includes(query) : false;
          case 'acquisition_date':
            return item.acquisition_date ? dayjs(item.acquisition_date).format('YYYY-MM-DD').includes(query) : false;
          default:
            return true;
        }
      });
    }
    
    // 상태로 필터링
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // 유형으로 필터링
    if (typeFilter) {
      filtered = filtered.filter(item => item.equipment_type === typeFilter);
    }
    
    setFilteredEquipment(filtered);
  };
  
  // 페이지 변경 핸들러
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // 페이지당 행 수 변경 핸들러
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // 장비 추가 다이얼로그 열기
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData(initialFormData);
    setOpenDialog(true);
  };
  
  // 장비 수정 다이얼로그 열기
  const handleOpenEditDialog = (item: Equipment) => {
    setDialogMode('edit');
    setSelectedEquipment(item);
    setFormData({
      asset_number: item.asset_number || '',
      description: item.description || '',
      manufacturer: item.manufacturer || '',
      model_name: item.model_name || '',
      serial_number: item.serial_number,
      equipment_type: item.equipment_type,
      acquisition_date: dayjs(item.acquisition_date).format('YYYY-MM-DD'),
      status: item.status,
      manufacture_year: item.manufacture_year?.toString() || '',
      purchase_date: item.purchase_date ? dayjs(item.purchase_date).format('YYYY-MM-DD') : '',
      purchase_price: item.purchase_price || '',
      rental_user: item.rental?.user.id,
      rental_due_date: item.rental?.due_date ? dayjs(item.rental.due_date).format('YYYY-MM-DD') : undefined
    });
    setOpenDialog(true);
  };
  
  // 장비 삭제 다이얼로그 열기
  const handleOpenDeleteDialog = (id: number) => {
    setEquipmentToDelete(id);
    setOpenDeleteDialog(true);
  };
  
  // 폼 필드 변경 핸들러
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 장비 추가
  const handleAdd = async () => {
    if (!formData.model_name || !formData.serial_number) {
      setNotification({
        open: true,
        message: '모델명과 일련번호는 필수 항목입니다.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        acquisition_date: acquisitionDate ? acquisitionDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        manufacture_year: formData.manufacture_year ? parseInt(formData.manufacture_year) : undefined,
        purchase_price: formData.purchase_price || undefined
      };
      
      const result = await equipment.createEquipment(submitData);
      if (result.success) {
        setNotification({
          open: true,
          message: '장비가 성공적으로 추가되었습니다.',
          severity: 'success'
        });
        setOpenDialog(false);
        setFormData(initialFormData);
        // 목록 새로고침
        loadEquipment();
      }
    } catch (error) {
      console.error('장비 추가 실패:', error);
      setNotification({
        open: true,
        message: '장비 추가에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 장비 수정
  const handleUpdate = async () => {
    if (!selectedEquipment) return;

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        acquisition_date: acquisitionDate ? acquisitionDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        manufacture_year: formData.manufacture_year ? parseInt(formData.manufacture_year) : undefined,
        purchase_price: formData.purchase_price || undefined
      };
      
      // 장비 정보 업데이트
      const result = await equipment.updateEquipment(selectedEquipment.id, submitData);
      if (result.success) {
        setNotification({
          open: true,
          message: '장비가 성공적으로 수정되었습니다.',
          severity: 'success'
        });
        setOpenDialog(false);
        setFormData(initialFormData);
        // 목록 새로고침
        loadEquipment();
      }
    } catch (error) {
      console.error('장비 수정 실패:', error);
      setNotification({
        open: true,
        message: '장비 수정에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 장비 삭제
  const handleDelete = async () => {
    if (!equipmentToDelete) return;

    try {
      setLoading(true);
      const result = await equipment.deleteEquipment(equipmentToDelete);
      if (result.success) {
        setNotification({
          open: true,
          message: '장비가 성공적으로 삭제되었습니다.',
          severity: 'success'
        });
        setOpenDeleteDialog(false);
        setEquipmentToDelete(null);
        
        // 삭제된 장비를 목록에서 제거
        setEquipmentList(prev => prev.filter(item => item.id !== equipmentToDelete));
        setFilteredEquipment(prev => prev.filter(item => item.id !== equipmentToDelete));
      }
    } catch (error) {
      console.error('장비 삭제 실패:', error);
      setNotification({
        open: true,
        message: '장비 삭제에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 장비 목록을 엑셀로 내보내기
  const handleExportExcel = async () => {
    try {
      await equipment.exportEquipmentToExcel();
      setNotification({
        open: true,
        message: '장비 목록이 엑셀 파일로 내보내졌습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      setNotification({
        open: true,
        message: '엑셀 내보내기에 실패했습니다.',
        severity: 'error'
      });
    }
  };
  
  // 엑셀 파일 업로드
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadFile(event.target.files[0]);
      setUploadResult(null);
    }
  };

  // 엑셀 파일 업로드
  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      setNotification({
        open: true,
        message: '파일을 선택해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      setUploadLoading(true);
      const responseData = await equipment.importEquipmentFromExcel(uploadFile);
      if (responseData.success && responseData.data) {
        const { total_created = 0, total_errors = 0 } = responseData.data;
        setUploadResult({
          success: true,
          created: total_created,
          errors: total_errors,
          message: `총 ${total_created}개의 장비가 추가되었습니다. (오류: ${total_errors}건)`
        });
        setNotification({
          open: true,
          message: `총 ${total_created}개의 장비가 추가되었습니다. (오류: ${total_errors}건)`,
          severity: 'success'
        });
        setUploadFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // 목록 새로고침
        loadEquipment();
      }
    } catch (error) {
      console.error('엑셀 파일 업로드 실패:', error);
      setUploadResult({
        success: false,
        created: 0,
        errors: 0,
        message: '파일 업로드 중 오류가 발생했습니다.'
      });
      setNotification({
        open: true,
        message: '파일 업로드에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await rentalService.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        console.error('사용자 목록 로드 실패:', response.error);
        setNotification({
          open: true,
          message: '사용자 목록을 불러오는데 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('사용자 목록 로드 중 오류:', error);
      setNotification({
        open: true,
        message: '사용자 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // 직접 대여 다이얼로그 열기
  const handleOpenRentalDialog = (item: Equipment) => {
    // 사용자 목록이 없으면 로드
    if (users.length === 0) {
      loadUsers();
    }
    
    setRentalFormData({
      user: null,
      equipment: item.id,
      rental_date: dayjs(),
      due_date: dayjs().add(7, 'day'),
      notes: ''
    });
    setOpenRentalDialog(true);
  };
  
  // 직접 대여 제출 핸들러
  const handleRentalSubmit = async () => {
    if (!rentalFormData.equipment || !rentalFormData.due_date || !rentalFormData.user) {
      setNotification({
        open: true,
        message: '장비, 대여자, 반납 예정일을 모두 선택해주세요.',
        severity: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await rentalService.createRental(
        rentalFormData.equipment,
        rentalFormData.due_date.format('YYYY-MM-DD'),
        rentalFormData.user
      );

      if (result.success && result.data) {
        setNotification({
          open: true,
          message: '대여가 성공적으로 처리되었습니다.',
          severity: 'success'
        });
        setOpenRentalDialog(false);
        setRentalFormData({
          user: null,
          equipment: null,
          rental_date: dayjs(),
          due_date: dayjs().add(7, 'day'),
          notes: ''
        });
        
        // API 응답에서 받은 데이터로 상태 업데이트
        setEquipmentList(prev => 
          prev.map(item => 
            item.id === result.data!.equipment.id ? result.data!.equipment : item
          )
        );
        
        // 필터링된 목록도 업데이트
        setFilteredEquipment(prev => 
          prev.map(item => 
            item.id === result.data!.equipment.id ? result.data!.equipment : item
          )
        );
      } else {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.detail || '대여 처리 중 오류가 발생했습니다.';
        setNotification({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('대여 처리 중 오류:', error);
      setNotification({
        open: true,
        message: '대여 처리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 렌탈 폼 필드 변경 핸들러
  const handleRentalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRentalFormData({ ...rentalFormData, [name]: value });
  };
  
  // 렌탈 날짜 변경 핸들러
  const handleRentalDateChange = (field: string, date: any) => {
    if (date) {
      setRentalFormData({ ...rentalFormData, [field]: date });
    }
  };
  
  // 사용자 선택 핸들러
  const handleUserChange = (_event: any, value: User | null) => {
    setRentalFormData({ 
      ...rentalFormData, 
      user: value ? value.id : null 
    });
  };

  // 모델별 일괄 업데이트 다이얼로그 열기
  const handleOpenBatchUpdateDialog = () => {
    setBatchUpdateData({
      model_name: '',
      manufacture_year: undefined,
      purchase_date: '',
      purchase_price: undefined
    });
    setOpenBatchUpdateDialog(true);
  };
  
  // 모델 선택 핸들러
  const handleModelSelect = async (modelName: string) => {
    try {
      const response = await equipment.getModelInfo(modelName);
      if (response.success && response.data) {
        const modelData = response.data;
        setBatchUpdateData(prev => ({
          ...prev,
          model_name: modelName,
          manufacture_year: modelData.manufacture_year,
          purchase_date: modelData.purchase_date,
          purchase_price: modelData.purchase_price
        }));
      }
    } catch (error) {
      console.error('모델 정보 조회 실패:', error);
    }
  };
  
  // 모델별 일괄 업데이트 필드 변경 핸들러
  const handleBatchUpdateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBatchUpdateData(prev => ({
      ...prev,
      [name]: name === 'manufacture_year' ? (value ? parseInt(value) : undefined) : 
              name === 'purchase_price' ? (value ? parseFloat(value) : undefined) : value
    }));
  };
  
  // 모델별 일괄 업데이트 날짜 변경 핸들러
  const handleBatchUpdateDateChange = (date: any) => {
    if (date) {
      setBatchUpdateData(prev => ({
        ...prev,
        purchase_date: dayjs(date).format('YYYY-MM-DD')
      }));
    } else {
      setBatchUpdateData(prev => ({
        ...prev,
        purchase_date: ''
      }));
    }
  };
  
  // 일괄 업데이트 제출
  const handleBatchUpdateSubmit = async () => {
    if (!batchUpdateData.model_name) {
      setNotification({
        open: true,
        message: '모델명을 입력해주세요.',
        severity: 'error'
      });
      return;
    }
    
    if (!batchUpdateData.manufacture_year && !batchUpdateData.purchase_date && batchUpdateData.purchase_price === undefined) {
      setNotification({
        open: true,
        message: '생산년도, 구매일 또는 구매가격 중 하나는 입력해주세요.',
        severity: 'error'
      });
      return;
    }
    
    setBatchUpdateLoading(true);
    try {
      const response = await equipment.updateByModel(batchUpdateData);
      console.log('일괄 업데이트 응답:', response);
      
      if (response.success) {
        setNotification({
          open: true,
          message: response.message || `${response.updated_count}개의 장비가 성공적으로 수정되었습니다.`,
          severity: 'success'
        });
        setOpenBatchUpdateDialog(false);
        setBatchUpdateData({
          model_name: '',
          manufacture_year: undefined,
          purchase_date: '',
          purchase_price: undefined
        });
        // 목록 새로고침
        loadEquipment();
      } else {
        setNotification({
          open: true,
          message: response.message || '일괄 업데이트에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('일괄 업데이트 실패:', error);
      setNotification({
        open: true,
        message: '일괄 업데이트 처리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setBatchUpdateLoading(false);
    }
  };

  // 검색 타입 변경 핸들러
  const handleSearchTypeChange = (e: SelectChangeEvent<string>) => {
    setSearchType(e.target.value);
    setSearchQuery(''); // 검색 타입 변경 시 검색어 초기화
  };
  
  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // 검색 필터 초기화
  const handleResetFilters = () => {
    setSearchType('asset_number');
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (id: number, newStatus: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED') => {
    try {
      const response = await equipment.updateEquipmentStatus(id, newStatus);
      if (response.success) {
        setEquipmentList(prev => prev.map(item => 
          item.id === id ? { ...item, status: newStatus, status_display: getStatusDisplay(newStatus) } : item
        ));
        setFilteredEquipment(prev => prev.map(item => 
          item.id === id ? { ...item, status: newStatus, status_display: getStatusDisplay(newStatus) } : item
        ));
        setNotification({
          open: true,
          message: '장비 상태가 업데이트되었습니다.',
          severity: 'success'
        });
      } else {
        setNotification({
          open: true,
          message: response.message || '장비 상태 업데이트에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error) {
      setNotification({
        open: true,
        message: '장비 상태 업데이트 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 상태 표시 텍스트를 가져오는 함수
  const getStatusDisplay = (status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'LOST' | 'DISPOSED'): string => {
    const statusMap = {
      'AVAILABLE': '사용 가능',
      'RENTED': '대여 중',
      'MAINTENANCE': '유지보수 중',
      'BROKEN': '파손',
      'LOST': '분실',
      'DISPOSED': '폐기'
    };
    return statusMap[status];
  };

  // 알림 닫기 핸들러
  const handleCloseNotification = () => {
    setNotification((prev: NotificationState) => ({
      ...prev,
      open: false
    }));
  };

  // 템플릿 다운로드 함수
  const downloadTemplate = () => {
    try {
      // 템플릿 데이터 준비
      const templateData = [
        {
          '물품번호': '노트북 모델 X',
          '제조사': 'ABC사',
          '모델명': 'X-2023',
          '장비 유형': 'LAPTOP',
          '시리얼 번호': 'SN123456789',
          '설명': '2023년형 개발용 노트북',
          '장비 상태': 'AVAILABLE',
          '생산년도': 2023,
          '구매일': '2023-01-10',
          '취득일': '2023-01-15'
        }
      ];

      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(workbook, worksheet, '장비 등록 템플릿');
      
      // 엑셀 파일로 저장
      XLSX.writeFile(workbook, '장비_등록_템플릿.xlsx');
      
      setNotification({
        open: true,
        message: '장비 등록 템플릿이 다운로드되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('템플릿 다운로드 오류:', error);
      setNotification({
        open: true,
        message: '템플릿 파일 생성에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: 'text.primary' }}>
          장비 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            장비 추가
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<UpdateIcon />}
            onClick={handleOpenBatchUpdateDialog}
          >
            모델별 일괄 업데이트
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
          >
            엑셀로 내보내기
          </Button>
          <IconButton onClick={loadEquipment} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 검색 및 필터 섹션 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              검색 필터
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>검색 항목</InputLabel>
              <Select
                value={searchType}
                onChange={handleSearchTypeChange}
                label="검색 항목"
              >
                <MenuItem value="asset_number">물품번호</MenuItem>
                <MenuItem value="manufacturer">제조사</MenuItem>
                <MenuItem value="model_name">모델명</MenuItem>
                <MenuItem value="serial_number">시리얼 번호</MenuItem>
                <MenuItem value="description">설명</MenuItem>
                <MenuItem value="rental_user">대여자</MenuItem>
                <MenuItem value="manufacture_year">생산년도</MenuItem>
                <MenuItem value="purchase_date">구매일</MenuItem>
                <MenuItem value="acquisition_date">취득일</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="검색어"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>상태 필터</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="상태 필터"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="AVAILABLE">대여 가능</MenuItem>
                <MenuItem value="RENTED">대여 중</MenuItem>
                <MenuItem value="MAINTENANCE">점검 중</MenuItem>
                <MenuItem value="BROKEN">파손</MenuItem>
                <MenuItem value="LOST">분실</MenuItem>
                <MenuItem value="DISPOSED">폐기</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>유형 필터</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="유형 필터"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="LAPTOP">노트북</MenuItem>
                <MenuItem value="MACBOOK">맥북</MenuItem>
                <MenuItem value="TABLET">태블릿</MenuItem>
                <MenuItem value="DESKTOP">데스크톱</MenuItem>
                <MenuItem value="MONITOR">모니터</MenuItem>
                <MenuItem value="PRINTER">프린터</MenuItem>
                <MenuItem value="PROJECTOR">프로젝터</MenuItem>
                <MenuItem value="OTHER">기타</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleResetFilters}
                startIcon={<ClearIcon />}
              >
                필터 초기화
              </Button>
              <Button
                variant="contained"
                onClick={filterEquipment}
                startIcon={<SearchIcon />}
              >
                검색
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 엑셀 일괄 업로드 섹션 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          엑셀로 장비 일괄 등록
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<FileDownloadIcon />}
              onClick={downloadTemplate}
            >
              템플릿 다운로드
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              variant="outlined"
              fullWidth
              type="file"
              id="equipment-file-upload"
              inputRef={fileInputRef}
              onChange={handleFileChange}
              inputProps={{
                accept: '.xlsx,.xls'
              }}
              helperText={uploadFile ? `선택된 파일: ${uploadFile.name}` : '엑셀 파일(.xlsx, .xls)을 선택하세요'}
            />
          </Grid>
          
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
              onClick={handleUploadSubmit}
              disabled={!uploadFile || uploadLoading}
            >
              {uploadLoading ? '업로드 중...' : '장비 일괄 등록'}
            </Button>
          </Grid>
        </Grid>
        
        {uploadResult && (
          <Alert 
            severity={uploadResult.success ? 'success' : 'error'} 
            sx={{ mt: 2 }}
          >
            {uploadResult.message}
          </Alert>
        )}
      </Paper>

      {/* 로딩 표시 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 장비 목록 테이블 */}
      <TableContainer component={Paper} sx={{ mt: 3, maxWidth: '100%', overflowX: 'auto' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell>물품번호</TableCell>
              <TableCell>제조사</TableCell>
              <TableCell>모델명</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>일련번호</TableCell>
              <TableCell>관리번호</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>대여자</TableCell>
              <TableCell>생산년도</TableCell>
              <TableCell>구매일</TableCell>
              <TableCell>구매가격</TableCell>
              <TableCell>취득일</TableCell>
              <TableCell>반납예정일</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={15} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} align="center">
                  장비가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              paginatedEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.asset_number}</TableCell>
                  <TableCell>{item.manufacturer || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.model_name || ''}>
                    {item.model_name || '-'}
                  </TableCell>
                  <TableCell>{item.equipment_type_display}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.serial_number}>
                    {item.serial_number}
                  </TableCell>
                  <TableCell>{item.management_number || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description || ''}>
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.status_display}
                      color={getStatusColor(item.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.rental?.user ? `${item.rental.user.name} (${item.rental.user.username})` : ''}>
                    {item.status === 'AVAILABLE' 
                      ? '-'
                      : item.rental?.user 
                        ? `${item.rental.user.name} (${item.rental.user.username})`
                        : '-'
                    }
                  </TableCell>
                  <TableCell>{item.manufacture_year || '-'}</TableCell>
                  <TableCell>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{item.purchase_price ? `₩${Number(item.purchase_price).toLocaleString()}` : '-'}</TableCell>
                  <TableCell>{new Date(item.acquisition_date).toLocaleDateString()}</TableCell>
                  <TableCell>{item.rental?.due_date ? new Date(item.rental.due_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="장비 편집">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenEditDialog(item)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="장비 삭제">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDeleteDialog(item.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {item.status === 'AVAILABLE' && (
                      <Tooltip title="직접 대여">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenRentalDialog(item)}
                          color="success"
                        >
                          <AssignmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, 500]}
          component="div"
          count={filteredEquipment.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행 수:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </TableContainer>

      {/* 장비 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'text.primary' }}>{dialogMode === 'add' ? '장비 추가' : '장비 수정'}</DialogTitle>
        <form onSubmit={dialogMode === 'add' ? handleAdd : handleUpdate}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="물품번호"
                  name="asset_number"
                  value={formData.asset_number}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="제조사"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="모델명"
                  name="model_name"
                  value={formData.model_name}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="일련번호"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>유형</InputLabel>
                  <Select
                    name="equipment_type"
                    value={formData.equipment_type}
                    onChange={handleFormChange as any}
                    label="유형"
                  >
                    <MenuItem value="LAPTOP">노트북</MenuItem>
                    <MenuItem value="MACBOOK">맥북</MenuItem>
                    <MenuItem value="TABLET">태블릿</MenuItem>
                    <MenuItem value="DESKTOP">데스크톱</MenuItem>
                    <MenuItem value="MONITOR">모니터</MenuItem>
                    <MenuItem value="PRINTER">프린터</MenuItem>
                    <MenuItem value="PROJECTOR">프로젝터</MenuItem>
                    <MenuItem value="OTHER">기타</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={(e) => handleStatusChange(selectedEquipment?.id || 0, e.target.value as Equipment['status'])}
                    label="상태"
                  >
                    <MenuItem value="AVAILABLE">대여 가능</MenuItem>
                    <MenuItem value="RENTED">대여 중</MenuItem>
                    <MenuItem value="MAINTENANCE">점검 중</MenuItem>
                    <MenuItem value="BROKEN">파손</MenuItem>
                    <MenuItem value="LOST">분실</MenuItem>
                    <MenuItem value="DISPOSED">폐기</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="취득일"
                    value={formData.acquisition_date ? dayjs(formData.acquisition_date) : null}
                    onChange={(newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        acquisition_date: newValue ? newValue.format('YYYY-MM-DD') : ''
                      }));
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        helperText: "취득일을 선택해주세요"
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="생산년도"
                  name="manufacture_year"
                  type="number"
                  value={formData.manufacture_year || ''}
                  onChange={handleFormChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    inputProps: { min: 1900, max: new Date().getFullYear() }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="구매일"
                    value={formData.purchase_date ? dayjs(formData.purchase_date) : null}
                    onChange={(newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        purchase_date: newValue ? newValue.format('YYYY-MM-DD') : ''
                      }));
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: "구매일을 선택해주세요 (선택사항)"
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="구매가격"
                  name="purchase_price"
                  type="number"
                  value={formData.purchase_price || ''}
                  onChange={handleFormChange}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 },
                    startAdornment: <InputAdornment position="start">₩</InputAdornment>
                  }}
                  helperText="구매가격을 입력하세요 (선택사항)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} disabled={loading}>
              취소
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {dialogMode === 'add' ? '추가' : '수정'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ color: 'text.primary' }}>장비 삭제</DialogTitle>
        <DialogContent>
          <Typography>이 장비를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 직접 대여 다이얼로그 */}
      <Dialog open={openRentalDialog} onClose={() => setOpenRentalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>장비 직접 대여</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              대여할 장비의 정보를 입력하세요. 모든 필수 필드(*)를 작성해야 합니다.
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option: User) => `${option.name} (${option.username})`}
                  loading={loadingUsers}
                  onChange={handleUserChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      fullWidth
                      label="대여자"
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="대여 일시*"
                    value={rentalFormData.rental_date}
                    onChange={(newValue) => handleRentalDateChange('rental_date', newValue)}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="반납 예정일*"
                    value={rentalFormData.due_date}
                    onChange={(newValue) => handleRentalDateChange('due_date', newValue)}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="비고"
                  multiline
                  rows={3}
                  value={rentalFormData.notes}
                  onChange={handleRentalFormChange}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRentalDialog(false)} color="inherit">취소</Button>
          <Button 
            onClick={handleRentalSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            대여 확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 모델별 일괄 업데이트 다이얼로그 */}
      <Dialog open={openBatchUpdateDialog} onClose={() => setOpenBatchUpdateDialog(false)}>
        <DialogTitle>모델별 일괄 업데이트</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            같은 모델의 장비들을 한 번에 업데이트합니다. 모델명을 선택하거나 직접 입력해주세요.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="model-select-label">모델 선택</InputLabel>
                <Select
                  labelId="model-select-label"
                  id="model-select"
                  value={batchUpdateData.model_name}
                  onChange={(e) => handleModelSelect(e.target.value)}
                  label="모델 선택"
                >
                  <MenuItem value="">
                    <em>모델 선택</em>
                  </MenuItem>
                  {equipmentList
                    .filter(item => item.model_name)
                    .map(item => item.model_name)
                    .filter((value, index, self) => value && typeof value === 'string' && self.indexOf(value) === index)
                    .sort()
                    .map((model, index) => (
                      <MenuItem key={index} value={String(model)}>
                        {model}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="model_name"
                label="모델명 직접 입력"
                value={batchUpdateData.model_name}
                onChange={handleBatchUpdateChange}
                fullWidth
                required
                helperText="입력한 모델명을 포함하는 모든 장비가 업데이트됩니다."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="manufacture_year"
                label="생산년도"
                type="number"
                value={batchUpdateData.manufacture_year || ''}
                onChange={handleBatchUpdateChange}
                fullWidth
                InputProps={{
                  inputProps: { min: 1990, max: new Date().getFullYear() }
                }}
                helperText="생산년도는 4자리 연도로 입력해주세요."
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="구매일"
                  value={batchUpdateData.purchase_date ? dayjs(batchUpdateData.purchase_date) : null}
                  onChange={handleBatchUpdateDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: "구매일은 YYYY-MM-DD 형식으로 입력해주세요."
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="purchase_price"
                label="구매가격"
                type="number"
                value={batchUpdateData.purchase_price || ''}
                onChange={handleBatchUpdateChange}
                fullWidth
                InputProps={{
                  inputProps: { min: 0, step: 0.01 },
                  startAdornment: <InputAdornment position="start">₩</InputAdornment>
                }}
                helperText="구매가격을 입력하세요 (선택사항)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchUpdateDialog(false)}>취소</Button>
          <Button 
            onClick={handleBatchUpdateSubmit} 
            variant="contained" 
            color="primary"
            disabled={batchUpdateLoading || !batchUpdateData.model_name || (!batchUpdateData.manufacture_year && !batchUpdateData.purchase_date && batchUpdateData.purchase_price === undefined)}
          >
            {batchUpdateLoading ? <CircularProgress size={24} /> : '업데이트'}
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