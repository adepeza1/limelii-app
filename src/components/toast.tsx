"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed left-4 right-4 z-[9999] flex flex-col gap-2 max-w-md mx-auto pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top, 44px) + 8px)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg pointer-events-auto ${
              t.type === "success"
                ? "bg-[#12B76A] text-white"
                : t.type === "error"
                ? "bg-[#F04438] text-white"
                : "bg-[#101828] text-white"
            }`}
          >
            {t.type === "success" && <CheckCircle2 size={16} className="shrink-0" />}
            {t.type === "error" && <AlertCircle size={16} className="shrink-0" />}
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((tt) => tt.id !== t.id))}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
