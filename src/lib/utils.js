import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);

  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(dateString);
}

export const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
    dotColor: 'bg-amber-500',
    badgeVariant: 'warning',
    description: 'Awaiting initial agent review',
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
    dotColor: 'bg-blue-500',
    badgeVariant: 'info',
    description: 'Under investigation by support',
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
    dotColor: 'bg-emerald-500',
    badgeVariant: 'success',
    description: 'Return approved with resolution',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
    dotColor: 'bg-rose-500',
    badgeVariant: 'danger',
    description: 'Return request rejected (Closed)',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20',
    dotColor: 'bg-slate-500',
    badgeVariant: 'neutral',
    description: 'Resolution fulfilled and ticket closed',
  },
};

export const REASON_CONFIG = {
  DAMAGED: { label: 'Damaged Item', color: 'text-red-700 bg-red-50 border-red-200' },
  WRONG_ITEM: { label: 'Wrong Item Sent', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  SIZE_ISSUE: { label: 'Size / Fit Issue', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  NOT_AS_DESCRIBED: { label: 'Not As Described', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  CHANGED_MIND: { label: 'Changed Mind', color: 'text-gray-700 bg-gray-50 border-gray-200' },
};

export const RESOLUTION_CONFIG = {
  REFUND: { label: 'Refund', color: 'text-emerald-700 bg-emerald-50' },
  REPLACEMENT: { label: 'Replacement', color: 'text-indigo-700 bg-indigo-50' },
  STORE_CREDIT: { label: 'Store Credit', color: 'text-violet-700 bg-violet-50' },
};
