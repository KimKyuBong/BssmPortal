/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 날짜를 한국식 yyyy-mm-dd 형식으로 포맷팅
 * @param date - Date 객체 또는 날짜 문자열
 * @returns yyyy-mm-dd 형식의 문자열
 */
export const formatDateToKorean = (date: Date | string | null | undefined): string => {
  if (!date) {
    return '-';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '-';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 날짜를 한국식 yyyy년 mm월 dd일 형식으로 포맷팅
 * @param date - Date 객체 또는 날짜 문자열
 * @returns yyyy년 mm월 dd일 형식의 문자열
 */
export const formatDateToKoreanFull = (date: Date | string | null | undefined): string => {
  if (!date) {
    return '-';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '-';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}년 ${month}월 ${day}일`;
};

/**
 * 날짜와 시간을 한국식 형식으로 포맷팅
 * @param date - Date 객체 또는 날짜 문자열
 * @returns yyyy-mm-dd hh:mm 형식의 문자열
 */
export const formatDateTimeToKorean = (date: Date | string | null | undefined): string => {
  if (!date) {
    return '-';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '-';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * yyyy-mm-dd 형식의 문자열을 Date 객체로 변환
 * @param dateString - yyyy-mm-dd 형식의 날짜 문자열
 * @returns Date 객체
 */
export const parseKoreanDate = (dateString: string): Date => {
  if (!dateString) {
    return new Date();
  }
  
  // yyyy-mm-dd 형식인지 확인
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new Error('날짜 형식이 올바르지 않습니다. yyyy-mm-dd 형식을 사용해주세요.');
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * 현재 날짜를 yyyy-mm-dd 형식으로 반환
 * @returns 현재 날짜 문자열
 */
export const getCurrentDateString = (): string => {
  return formatDateToKorean(new Date());
};

/**
 * 날짜가 유효한지 확인
 * @param date - Date 객체 또는 날짜 문자열
 * @returns 유효성 여부
 */
export const isValidDate = (date: Date | string | null | undefined): boolean => {
  if (!date) {
    return false;
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return !isNaN(dateObj.getTime());
};

/**
 * 날짜 입력 필드의 기본값을 설정하기 위한 함수
 * @param date - Date 객체 또는 날짜 문자열
 * @returns HTML date input용 형식 (yyyy-mm-dd)
 */
export const getDateInputValue = (date: Date | string | null | undefined): string => {
  if (!date) {
    return '';
  }
  return formatDateToKorean(date);
}; 