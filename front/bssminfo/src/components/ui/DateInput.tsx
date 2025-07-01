import React from 'react';
import { Calendar } from 'lucide-react';
import { getDateInputValue } from '@/utils/dateUtils';

interface DateInputProps {
  label?: string;
  value?: string | Date;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
  error?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  placeholder = '날짜를 선택하세요',
  required = false,
  disabled = false,
  className = '',
  min,
  max,
  error
}) => {
  const inputValue = getDateInputValue(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="date"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          className={`
            block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm
            text-sm text-gray-900 dark:text-white
            bg-white dark:bg-gray-800
            border-gray-300 dark:border-gray-600
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:focus:ring-blue-400 dark:focus:border-blue-400
            disabled:bg-gray-100 dark:disabled:bg-gray-700
            disabled:text-gray-500 dark:disabled:text-gray-400
            disabled:cursor-not-allowed
            ${error ? 'border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500' : ''}
          `}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default DateInput; 