import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// --------------- Types ---------------

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

// --------------- Context ---------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// --------------- Provider ---------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// --------------- Container + Item ---------------

function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItemView key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

const ICON_MAP: Record<ToastType, { icon: string; bg: string; border: string; text: string }> = {
  success: { icon: '✓', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  error:   { icon: '✕', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  warning: { icon: '!', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  info:    { icon: 'i', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
};

const ICON_CIRCLE: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const style = ICON_MAP[toast.type];

  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${style.bg} ${style.border} p-4 shadow-lg animate-slide-in`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${ICON_CIRCLE[toast.type]}`}
      >
        {style.icon}
      </span>
      <p className={`text-sm font-medium flex-1 ${style.text}`}>{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
