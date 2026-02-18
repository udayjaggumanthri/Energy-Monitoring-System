import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const iconMap = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertCircle };
const boxClass: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};
const iconClass: Record<ToastType, string> = {
  success: 'text-green-600', error: 'text-red-600', info: 'text-blue-600', warning: 'text-amber-600',
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const duration = toast.duration ?? 5000;
  const Icon = iconMap[toast.type];
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(t);
  }, [toast.id, duration, onDismiss]);
  return (
    <div role="alert" className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${boxClass[toast.type]}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconClass[toast.type]}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button type="button" onClick={() => onDismiss(toast.id)} className="p-1 rounded hover:bg-black/5 focus:outline-none" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
