import { ChevronRight, FileQuestion, MessageSquare, Package, User } from 'lucide-react';
import { StatusBadge, ReasonBadge } from './ui/Badge';
import { formatDate, formatCurrency, RESOLUTION_CONFIG } from '@/lib/utils';
import { Button } from './ui/Button';

export function RequestTable({
  requests = [],
  isLoading,
  onSelectRequest,
  onResetFilters,
  onOpenCreateModal,
  hasActiveFilters,
}) {
  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-200 animate-pulse rounded" />
          <div className="h-5 w-20 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-3.5 w-48 bg-slate-100 rounded" />
              </div>
              <div className="h-4 w-36 bg-slate-200 rounded hidden md:block" />
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
              <div className="h-8 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">No return requests found</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          {hasActiveFilters
            ? 'No return requests matched your search or filter criteria. Try resetting your filters.'
            : 'There are currently no return requests on the active desk.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {hasActiveFilters ? (
            <Button onClick={onResetFilters} variant="outline" size="sm">
              Clear all filters
            </Button>
          ) : (
            <Button onClick={onOpenCreateModal} variant="primary" size="sm">
              Raise a new request
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 3. Render Table (Desktop) and Cards (Mobile < 768px)
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-5 py-3.5">Reference</th>
              <th scope="col" className="px-5 py-3.5">Customer</th>
              <th scope="col" className="px-5 py-3.5">Order & Item</th>
              <th scope="col" className="px-5 py-3.5">Reason</th>
              <th scope="col" className="px-5 py-3.5">Status</th>
              <th scope="col" className="px-5 py-3.5">Created</th>
              <th scope="col" className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((req) => (
              <tr
                key={req.id}
                onClick={() => onSelectRequest(req.id)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                {/* Reference */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {req.reference}
                  </div>
                  {req.notesCount > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <MessageSquare className="w-3 h-3" />
                      <span>{req.notesCount} {req.notesCount === 1 ? 'note' : 'notes'}</span>
                    </div>
                  )}
                </td>

                {/* Customer */}
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">{req.customerName}</div>
                  <div className="text-xs text-slate-400">{req.customerEmail}</div>
                </td>

                {/* Order & Item */}
                <td className="px-5 py-4 max-w-xs">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {req.orderId}
                    </span>
                    <span className="text-slate-400">×{req.quantity}</span>
                  </div>
                  <div className="text-xs text-slate-600 truncate mt-0.5" title={req.itemName}>
                    {req.itemName}
                  </div>
                </td>

                {/* Reason */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <ReasonBadge reason={req.reason} />
                </td>

                {/* Status & Resolution summary */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <StatusBadge status={req.status} />
                  {req.resolution && (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <span className="font-medium">
                        {RESOLUTION_CONFIG[req.resolution]?.label || req.resolution}
                      </span>
                      {req.refundAmount && (
                        <span className="text-emerald-700 font-semibold">
                          ({formatCurrency(req.refundAmount)})
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* Created Date */}
                <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                  {formatDate(req.createdAt)}
                </td>

                {/* Action Trigger */}
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all">
                    <span>Manage</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (< 768px down to 375px) */}
      <div className="md:hidden divide-y divide-slate-100">
        {requests.map((req) => (
          <div
            key={req.id}
            onClick={() => onSelectRequest(req.id)}
            className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-slate-900 text-sm">{req.reference}</span>
                <div className="text-xs text-slate-500 mt-0.5">{formatDate(req.createdAt)}</div>
              </div>
              <StatusBadge status={req.status} />
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1 text-slate-900 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{req.customerName}</span>
                <span className="text-slate-400 font-normal">({req.customerEmail})</span>
              </div>
              <div className="flex items-center gap-1 text-slate-700">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono font-semibold">{req.orderId}</span>
                <span className="text-slate-400">·</span>
                <span className="truncate">{req.itemName} (x{req.quantity})</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <ReasonBadge reason={req.reason} />
              <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
