'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Info, Search } from 'lucide-react';
import authService from '@/services/auth';
import rentalService from '@/services/rental';
import { Rental, RENTAL_STATUS } from '@/services/api';
import { message } from 'antd';

export default function RentalHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rentalHistory, setRentalHistory] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchUserAndRentals = async () => {
      try {
        const userResponse = await authService.getCurrentUser();
        if (!userResponse.success || !userResponse.data) {
          router.push('/login');
          return;
        }
        
        setUser(userResponse.data);
        await fetchRentalHistory();
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        console.error('Rental history error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndRentals();
  }, [router]);
  
  const fetchRentalHistory = async () => {
    try {
      setLoading(true);
      const response = await rentalService.getMyRentalHistory(currentPage);
      if (response.success && response.data) {
        if ('results' in response.data) {
          setRentalHistory(response.data.results);
          setTotalPages(Math.ceil(response.data.count / 100));
        } else {
          setRentalHistory(response.data);
          setTotalPages(1);
        }
      } else {
        setError('대여 내역을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('대여 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchRentalHistory();
  };
  
  const filteredRentalHistory = rentalHistory.filter(rental => 
    rental.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.equipment?.equipment_type_display?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getRentalStatusClass = (status: string) => {
    switch (status) {
      case RENTAL_STATUS.RENTED:
        return 'bg-green-100 text-green-800';
      case RENTAL_STATUS.OVERDUE:
        return 'bg-red-100 text-red-800';
      case RENTAL_STATUS.RETURNED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <History className="h-8 w-8 text-blue-500 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">장비 대여 내역</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
            placeholder="장비 이름 또는 유형 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredRentalHistory.length === 0 && (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">대여 내역이 없습니다.</p>
          {searchTerm && (
            <p className="text-gray-400 mt-2">검색어를 변경하거나 모든 내역을 보려면 검색창을 비워주세요.</p>
          )}
        </div>
      )}
      
      {filteredRentalHistory.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장비 이름</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">장비 유형</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대여 일시</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">반납 일시</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRentalHistory.map((rental) => (
                <tr key={rental.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">{rental.equipment.name}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{rental.equipment.equipment_type_display}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{formatDate(rental.rental_date)}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">
                    {rental.return_date ? formatDate(rental.return_date) : '-'}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRentalStatusClass(rental.status)}`}>
                      {rental.status_display}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`px-4 py-2 rounded-md ${
              currentPage > 1
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            이전
          </button>
          <span className="px-4 py-2 text-gray-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`px-4 py-2 rounded-md ${
              currentPage < totalPages
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}