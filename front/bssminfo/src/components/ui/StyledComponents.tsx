import React from 'react';
import { cn } from '@/lib/utils';
import { X, Search } from 'lucide-react';

// 기본 카드 컴포넌트
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'hover' | 'compact';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseClasses = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow";
    
    const variantClasses = {
      default: "p-6",
      hover: "p-6 hover:shadow-md transition-shadow cursor-pointer",
      compact: "p-4"
    };

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// 카드 호버 링크 컴포넌트
interface CardLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href: string;
}

export const CardLink = React.forwardRef<HTMLAnchorElement, CardLinkProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "flex items-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);
CardLink.displayName = 'CardLink';

// 텍스트 컴포넌트들
interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-gray-900 dark:text-white", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
Text.displayName = 'Text';

// 제목 컴포넌트들
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 2, children, ...props }, ref) => {
    const sizeClasses = {
      1: "text-3xl font-bold",
      2: "text-xl font-bold",
      3: "text-lg font-semibold",
      4: "text-base font-medium"
    };

    const Component = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';

    return (
      <Component
        ref={ref}
        className={cn("text-gray-900 dark:text-white", sizeClasses[level], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Heading.displayName = 'Heading';

// 입력 필드 컴포넌트
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm",
            "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-gray-100 dark:disabled:bg-gray-600",
            error && "border-red-500 dark:border-red-400",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// 텍스트 영역 컴포넌트
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm",
            "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "resize-none",
            error && "border-red-500 dark:border-red-400",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// 선택 필드 컴포넌트
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm",
            "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            error && "border-red-500 dark:border-red-400",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

// 버튼 컴포넌트
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
    
    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500"
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// 배지 컴포넌트
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    const variantClasses = {
      default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    };

    return (
      <span
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

// 구분선 컴포넌트
interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    const orientationClasses = {
      horizontal: "w-full border-t border-gray-200 dark:border-gray-700",
      vertical: "h-full border-l border-gray-200 dark:border-gray-700"
    };

    return (
      <div
        ref={ref}
        className={cn(orientationClasses[orientation], className)}
        {...props}
      />
    );
  }
);
Divider.displayName = 'Divider';

// 로딩 스피너 컴포넌트
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

// 모달 오버레이 컴포넌트
interface ModalOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const ModalOverlay = React.forwardRef<HTMLDivElement, ModalOverlayProps>(
  ({ className, children, isOpen, onClose, ...props }, ref) => {
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex items-center justify-center"
        {...props}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);
ModalOverlay.displayName = 'ModalOverlay';

// 모달 컴포넌트
interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ className, children, isOpen, onClose, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl"
    };

    return (
      <ModalOverlay isOpen={isOpen} onClose={onClose}>
        <div
          ref={ref}
          className={cn(
            "bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full mx-4",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          {children}
        </div>
      </ModalOverlay>
    );
  }
);
Modal.displayName = 'Modal';

// 테이블 컴포넌트들
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={cn("min-w-full divide-y divide-gray-200 dark:divide-gray-700", className)}
        {...props}
      >
        {children}
      </table>
    );
  }
);
Table.displayName = 'Table';

interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHead = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn("bg-gray-50 dark:bg-gray-800", className)}
        {...props}
      >
        {children}
      </thead>
    );
  }
);
TableHead.displayName = 'TableHead';

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn("bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700", className)}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);
TableBody.displayName = 'TableBody';

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = true, children, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          hover && "hover:bg-gray-50 dark:hover:bg-gray-800",
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
TableRow.displayName = 'TableRow';

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  children: React.ReactNode;
}

export const TableHeaderCell = React.forwardRef<HTMLTableHeaderCellElement, TableHeaderCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);
TableHeaderCell.displayName = 'TableHeaderCell';

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableDataCellElement> {
  children: React.ReactNode;
}

export const TableCell = React.forwardRef<HTMLTableDataCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn("px-6 py-4 whitespace-nowrap", className)}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = 'TableCell';

// 체크박스 컴포넌트
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700",
            error && "border-red-500 dark:border-red-400",
            className
          )}
          {...props}
        />
        {label && (
          <label className="ml-2 text-sm text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// 기본 테이블 컴포넌트 (상속용)
interface BaseTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const BaseTable = React.forwardRef<HTMLDivElement, BaseTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("overflow-x-auto", className)}
        {...props}
      >
        <table className="table">
          {children}
        </table>
      </div>
    );
  }
);
BaseTable.displayName = 'BaseTable';

// 기본 테이블 헤더 컴포넌트
interface BaseTableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const BaseTableHead = React.forwardRef<HTMLTableSectionElement, BaseTableHeadProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(className)}
        {...props}
      >
        {children}
      </thead>
    );
  }
);
BaseTableHead.displayName = 'BaseTableHead';

// 기본 테이블 헤더 셀 컴포넌트
interface BaseTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  children: React.ReactNode;
}

export const BaseTableHeaderCell = React.forwardRef<HTMLTableHeaderCellElement, BaseTableHeaderCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);
BaseTableHeaderCell.displayName = 'BaseTableHeaderCell';

// 기본 테이블 바디 컴포넌트
interface BaseTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const BaseTableBody = React.forwardRef<HTMLTableSectionElement, BaseTableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn(className)}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);
BaseTableBody.displayName = 'BaseTableBody';

// 기본 테이블 행 컴포넌트
interface BaseTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
}

export const BaseTableRow = React.forwardRef<HTMLTableRowElement, BaseTableRowProps>(
  ({ className, children, isSelected = false, onClick, ...props }, ref) => {
    // 다크모드 감지
    const isDarkMode = typeof window !== 'undefined' && 
      (document.documentElement.classList.contains('dark') || 
       window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
      <tr
        ref={ref}
        className={cn(
          onClick ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors' : '',
          className
        )}
        style={isSelected ? {
          backgroundColor: isDarkMode 
            ? 'rgba(59, 130, 246, 0.5)' // blue-500 with 50% opacity for dark mode
            : 'rgba(191, 219, 254, 0.7)', // blue-200 with 70% opacity for light mode
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          fontWeight: '600'
        } : undefined}
        onClick={onClick}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
BaseTableRow.displayName = 'BaseTableRow';

// 기본 테이블 셀 컴포넌트
interface BaseTableCellProps extends React.TdHTMLAttributes<HTMLTableDataCellElement> {
  children: React.ReactNode;
}

export const BaseTableCell = React.forwardRef<HTMLTableDataCellElement, BaseTableCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "px-6 py-4 whitespace-nowrap text-sm",
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);
BaseTableCell.displayName = 'BaseTableCell';

// 알림 컴포넌트
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose, className = '' }) => {
  const baseClasses = "p-4 rounded-lg border flex items-center justify-between";
  const typeClasses = {
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-current hover:opacity-70 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// 탭 컴포넌트
interface TabsProps {
  children: React.ReactNode;
  className?: string;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-b border-gray-200 dark:border-gray-700", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';

interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(
  ({ className, active = false, icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors",
          active
            ? "border-blue-500 text-blue-600 dark:text-blue-400"
            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600",
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);
Tab.displayName = 'Tab';

// 페이지네이션 컴포넌트
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
          size="sm"
        >
          이전
        </Button>
        
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-500">...</span>
              ) : (
                <Button
                  onClick={() => onPageChange(page as number)}
                  variant={currentPage === page ? 'primary' : 'secondary'}
                  size="sm"
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="secondary"
          size="sm"
        >
          다음
        </Button>
      </div>
      
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {currentPage} / {totalPages} 페이지
      </Text>
    </div>
  );
};

// 검색 입력 컴포넌트
interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, placeholder = "검색...", ...props }, ref) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSearch();
      }
    };

    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Input
          ref={ref}
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
          className="flex-1"
          {...props}
        />
        <Button onClick={onSearch} className="flex items-center space-x-2">
          <Search className="w-4 h-4" />
          <span>검색</span>
        </Button>
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

// 액션 바 컴포넌트
interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export const ActionBar = React.forwardRef<HTMLDivElement, ActionBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between mb-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ActionBar.displayName = 'ActionBar';

// 상태 배지 컴포넌트
interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  className = ''
}) => {
  const getVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('활성') || statusLower.includes('성공') || statusLower.includes('완료')) {
      return 'success';
    } else if (statusLower.includes('경고') || statusLower.includes('대기')) {
      return 'warning';
    } else if (statusLower.includes('비활성') || statusLower.includes('실패') || statusLower.includes('오류')) {
      return 'danger';
    } else if (statusLower.includes('정보') || statusLower.includes('진행')) {
      return 'info';
    }
    return variant;
  };

  return (
    <Badge variant={getVariant(status)} className={className}>
      {status}
    </Badge>
  );
};

// 날짜 입력 컴포넌트
interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  value?: string | Date;
  onChange: (value: string) => void;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, label, error, value, onChange, ...props }, ref) => {
    const formatDateForInput = (date: string | Date | undefined): string => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="date"
          value={formatDateForInput(value)}
          onChange={handleChange}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm",
            "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-gray-100 dark:disabled:bg-gray-600",
            error && "border-red-500 dark:border-red-400",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
DateInput.displayName = 'DateInput'; 