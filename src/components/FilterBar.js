import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  reasonFilter,
  onReasonChange,
  sortBy,
  sortOrder,
  onSortChange,
  onResetFilters,
  hasActiveFilters,
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync external search query to local input
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce search changes by 350ms to prevent request on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  const handleSortSelect = (e) => {
    const [field, order] = e.target.value.split(':');
    onSortChange(field, order);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input (Debounced) */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by customer, email, order ID, or reference (e.g. RET-2026)..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Dropdown */}
          <div className="relative flex items-center">
            <select
              value={statusFilter || 'ALL'}
              onChange={(e) => onStatusChange(e.target.value === 'ALL' ? '' : e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 pr-8 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Status: Open</option>
              <option value="IN_REVIEW">Status: In Review</option>
              <option value="APPROVED">Status: Approved</option>
              <option value="REJECTED">Status: Rejected</option>
              <option value="COMPLETED">Status: Completed</option>
            </select>
            <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reason Dropdown */}
          <div className="relative flex items-center">
            <select
              value={reasonFilter || 'ALL'}
              onChange={(e) => onReasonChange(e.target.value === 'ALL' ? '' : e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 pr-8 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="ALL">Reason: All</option>
              <option value="DAMAGED">Damaged</option>
              <option value="WRONG_ITEM">Wrong Item</option>
              <option value="SIZE_ISSUE">Size Issue</option>
              <option value="NOT_AS_DESCRIBED">Not As Described</option>
              <option value="CHANGED_MIND">Changed Mind</option>
            </select>
            <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={handleSortSelect}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 pr-8 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="createdAt:desc">Sort: Newest First</option>
              <option value="createdAt:asc">Sort: Oldest First</option>
              <option value="customerName:asc">Sort: Customer (A-Z)</option>
              <option value="orderId:asc">Sort: Order ID (Asc)</option>
              <option value="status:asc">Sort: Status</option>
            </select>
            <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              onClick={onResetFilters}
              variant="outline"
              size="md"
              icon={RotateCcw}
              className="text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
