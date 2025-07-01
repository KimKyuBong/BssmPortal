"use client";

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // 애니메이션 완료 후 제거
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/90 border-green-600 text-white backdrop-blur-sm';
      case 'error':
        return 'bg-red-500/90 border-red-600 text-white backdrop-blur-sm';
      case 'warning':
        return 'bg-yellow-500/90 border-yellow-600 text-black backdrop-blur-sm';
      case 'info':
        return 'bg-blue-500/90 border-blue-600 text-white backdrop-blur-sm';
      default:
        return 'bg-blue-500/90 border-blue-600 text-white backdrop-blur-sm';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-white';
      case 'error':
        return 'text-white';
      case 'warning':
        return 'text-black';
      case 'info':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  return (
    <div
      className={`
        fixed top-10 right-16 z-50 max-w-xl w-[600px]
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className={`
          p-5 rounded-lg border-2 shadow-xl backdrop-blur-sm
          ${getBackgroundColor()}
        `}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-4 flex-1">
            <div className={`text-lg font-semibold ${getTextColor()}`}>
              {title}
            </div>
            {message && (
              <div className={`mt-2 text-base ${getTextColor()} opacity-95`}>
                {message}
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className={`
                inline-flex rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${getTextColor()} hover:opacity-70 transition-opacity
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast; 