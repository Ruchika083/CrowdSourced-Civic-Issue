import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

const ToastContext = createContext<(message: string, kind?: Toast['kind']) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[2000] space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
              t.kind === 'success' ? 'bg-[var(--success)]' : t.kind === 'error' ? 'bg-[var(--danger)]' : 'bg-[var(--navy-700)]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
