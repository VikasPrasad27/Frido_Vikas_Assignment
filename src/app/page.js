'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatsOverview } from '@/components/StatsOverview';
import { FilterBar } from '@/components/FilterBar';
import { RequestTable } from '@/components/RequestTable';
import { Pagination } from '@/components/Pagination';
import { CreateRequestModal } from '@/components/CreateRequestModal';
import { RequestDetailModal } from '@/components/RequestDetailModal';
import { Toast } from '@/components/ui/Toast';

export default function ReturnsDeskPage() {
  // Query & Filter States (Executed Server-Side)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Data States
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', title = null, code = null) => {
    setToast({ message, type, title, code });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Fetch Requests from Server API with all active filters
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      if (reasonFilter) params.set('reason', reasonFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/requests?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch return requests.');
      }

      setRequests(data.data || []);
      setMeta(data.meta || null);
    } catch (err) {
      showToast(err.message, 'error', 'Error loading requests');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, reasonFilter, sortBy, sortOrder, page, limit, showToast]);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch('/api/requests/stats');
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Trigger data fetch on filter change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Trigger stats fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page to 1 when filters or search change
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleReasonChange = (reason) => {
    setReasonFilter(reason);
    setPage(1);
  };

  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setReasonFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const handleSelectRequest = (id) => {
    setSelectedRequestId(id);
    setIsDetailModalOpen(true);
  };

  const handleRequestMutated = (updatedData, message) => {
    fetchRequests();
    fetchStats();
    if (message) {
      showToast(message, 'success', 'Success');
    }
  };

  const hasActiveFilters = Boolean(searchQuery || statusFilter || reasonFilter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Metric Cards */}
        <StatsOverview
          stats={stats}
          currentStatus={statusFilter}
          onSelectStatus={handleStatusChange}
          isLoading={isStatsLoading}
        />

        {/* Filter and Search Bar (with 350ms search debounce) */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          reasonFilter={reasonFilter}
          onReasonChange={handleReasonChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Requests Table / Mobile Cards */}
        <div className="space-y-0">
          <RequestTable
            requests={requests}
            isLoading={isLoading}
            onSelectRequest={handleSelectRequest}
            onResetFilters={handleResetFilters}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Server-Driven Pagination */}
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        ReturnDesk · Production Support Management
      </footer>

      {/* Modals & Dialogs */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRequestMutated}
      />

      <RequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRequestId(null);
        }}
        requestId={selectedRequestId}
        onUpdateRequestSuccess={handleRequestMutated}
      />

      {/* Global Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
