import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto animate-slide-in-right
              max-w-md border px-4 py-3 shadow-lg backdrop-blur-sm
              ${toast.type === 'success' ? 'border-green-600 bg-green-900/90 text-green-100' : ''}
              ${toast.type === 'error' ? 'border-red-600 bg-red-900/90 text-red-100' : ''}
              ${toast.type === 'info' ? 'border-blue-600 bg-blue-900/90 text-blue-100' : ''}
              ${toast.type === 'warning' ? 'border-yellow-600 bg-yellow-900/90 text-yellow-100' : ''}
            `}
            onClick={() => removeToast(toast.id)}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'info' && 'ℹ️'}
                {toast.type === 'warning' && '⚠️'}
              </span>
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="text-white/60 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
