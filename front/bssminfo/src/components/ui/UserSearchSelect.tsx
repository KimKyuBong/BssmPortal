'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  user_name?: string;
  username: string;
  email?: string;
}

interface UserSearchSelectProps {
  users: User[];
  selectedUserId: number | null;
  onUserSelect: (userId: number | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function UserSearchSelect({
  users,
  selectedUserId,
  onUserSelect,
  placeholder = "이름, 아이디, 이메일로 검색...",
  label = "사용자 검색",
  required = false,
  disabled = false
}: UserSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 선택된 사용자 정보
  const selectedUser = users.find(user => user.id === selectedUserId);

  // 검색어 변경 시 필터링
  useEffect(() => {
    console.log('[UserSearchSelect] 검색어 변경:', searchTerm);
    console.log('[UserSearchSelect] 사용자 목록:', users);
    
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
      return;
    }

    const filtered = users.filter(user => 
      (user.user_name && user.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    console.log('[UserSearchSelect] 필터링된 결과:', filtered);
    setFilteredUsers(filtered);
    setShowDropdown(filtered.length > 0);
  }, [searchTerm, users]);

  // 사용자 선택
  const handleUserSelect = (user: User) => {
    onUserSelect(user.id);
    setSearchTerm(user.user_name || user.username);
    setShowDropdown(false);
  };

  // 검색어 변경
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!e.target.value.trim()) {
      onUserSelect(null);
    }
  };

  // 드롭다운 닫기
  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  // 선택 해제
  const handleClear = () => {
    onUserSelect(null);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setShowDropdown(filteredUsers.length > 0)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pl-10 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        />
        
        {/* 검색 아이콘 */}
        <div className="absolute left-3 top-2.5">
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* 선택된 사용자가 있을 때만 클리어 버튼 표시 */}
        {selectedUser && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* 드롭다운 */}
      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {user.user_name || user.username}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {user.username}
                {user.email && ` • ${user.email}`}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 검색 결과가 없을 때 */}
      {searchTerm && filteredUsers.length === 0 && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          검색 결과가 없습니다.
        </p>
      )}
    </div>
  );
}
