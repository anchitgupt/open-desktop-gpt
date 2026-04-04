import { useCallback, useRef, useState } from "react";
import { ToastContext, type ToastMessage, type ToastType } from "@/hooks/useToast";

const TOAST_DURATION = 5000;
const MAX_VISIBLE = 3;

const typeStyles: Record<ToastType, string> = {
  success: "border-l-green-500 bg-background",
  error: "border-l-red-500 bg-background",
  info: "border-l-blue-500 bg-background",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (msg: Omit<ToastMessage, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { ...msg, id }]);
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => onDismiss(t.id)}
          className={`border border-border border-l-4 rounded-lg px-4 py-3 shadow-lg cursor-pointer
            animate-in slide-in-from-right fade-in duration-200 ${typeStyles[t.type]}`}
        >
          <p className="text-sm font-medium">{t.title}</p>
          {t.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
