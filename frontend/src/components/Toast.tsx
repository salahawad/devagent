import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const colors = {
    success: { bg: 'var(--green-d)', border: 'rgba(56,201,138,.4)', color: 'var(--green)' },
    error: { bg: 'var(--red-d)', border: 'rgba(224,80,80,.4)', color: 'var(--red)' },
    info: { bg: 'var(--amber-d)', border: 'rgba(240,160,48,.4)', color: 'var(--amber)' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: colors[t.type].bg,
            border: `1px solid ${colors[t.type].border}`,
            color: colors[t.type].color,
            padding: '12px 20px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '.04em',
            minWidth: 240,
            animation: 'toastIn .25s ease-out',
            backdropFilter: 'blur(12px)',
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
