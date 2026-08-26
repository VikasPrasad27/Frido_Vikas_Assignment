import { Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';

export function Navbar({ onOpenCreateModal }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 ring-4 ring-blue-50">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">ReturnDesk</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <ShieldCheck className="w-3 h-3" /> Agent Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Returns, replacements & refund desk
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onOpenCreateModal}
              variant="primary"
              size="md"
              icon={Plus}
              className="font-semibold shadow-md shadow-blue-600/20"
            >
              <span>Raise Request</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
