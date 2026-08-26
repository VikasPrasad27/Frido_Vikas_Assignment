import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.total === 0) return null;

  const { page, limit, total, totalPages, hasNextPage, hasPrevPage } = meta;
  const startRow = (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3.5 bg-white border-t border-slate-200 rounded-b-xl text-sm text-slate-600">
      <div>
        Showing <span className="font-semibold text-slate-900">{startRow}</span> to{' '}
        <span className="font-semibold text-slate-900">{endRow}</span> of{' '}
        <span className="font-semibold text-slate-900">{total}</span> requests
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          variant="outline"
          size="sm"
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <div className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-md border border-slate-200">
          Page {page} of {totalPages}
        </div>

        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          variant="outline"
          size="sm"
          className="flex-row-reverse"
          icon={ChevronRight}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
