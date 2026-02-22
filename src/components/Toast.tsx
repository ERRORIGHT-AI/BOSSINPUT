import React, { useEffect } from 'react';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

const typeStyles = {
  success: 'border-success bg-success/10',
  error: 'border-error bg-error/10',
  warning: 'border-warning bg-warning/10',
  info: 'border-accent bg-accent/10',
};

const iconMap = {
  success: '✓',
  error: '⚠️',
  warning: '⚠️',
  info: 'ℹ️',
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 3000,
}) => {
  const { removeToast } = useUIStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'min-w-[300px] max-w-md',
        'animate-slideIn',
        typeStyles[type]
      )}
    >
      <span className="text-lg flex-shrink-0">{iconMap[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {message && (
          <p className="text-xs text-text-secondary mt-1">{message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(id)}
        className="text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};
