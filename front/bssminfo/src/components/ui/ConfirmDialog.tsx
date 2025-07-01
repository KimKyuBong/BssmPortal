import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './StyledComponents';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-500',
          confirmButtonVariant: 'danger' as const,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconBgColor: 'bg-red-100 dark:bg-red-900/40'
        };
      case 'warning':
        return {
          iconColor: 'text-yellow-500',
          confirmButtonVariant: 'warning' as const,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/40'
        };
      case 'info':
        return {
          iconColor: 'text-blue-500',
          confirmButtonVariant: 'primary' as const,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/40'
        };
      default:
        return {
          iconColor: 'text-red-500',
          confirmButtonVariant: 'danger' as const,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconBgColor: 'bg-red-100 dark:bg-red-900/40'
        };
    }
  };

  const styles = getVariantStyles();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* 헤더 */}
        <div className={`p-6 ${styles.bgColor} border-b ${styles.borderColor} rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${styles.iconBgColor}`}>
                <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* 메시지 */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
        
        {/* 버튼 */}
        <div className="px-6 pb-6">
          <div className="flex justify-end space-x-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="px-6 py-2.5 font-medium"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              variant={styles.confirmButtonVariant}
              className="px-6 py-2.5 font-medium"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 