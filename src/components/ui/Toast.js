import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
    error: 'border-rose-200 bg-rose-50/90 text-rose-950',
    warning: 'border-amber-200 bg-amber-50/90 text-amber-950',
    info: 'border-blue-200 bg-blue-50/90 text-blue-950',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-slide-in-right px-4">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all',
          borders[toast.type] || borders.info
        )}
      >
        {icons[toast.type] || icons.info}
        <div className="flex-1 text-sm">
          {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
          <div className="text-slate-800 leading-snug">{toast.message}</div>
          {toast.code && (
            <div className="mt-1 font-mono text-[11px] opacity-75">Code: {toast.code}</div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-black/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
