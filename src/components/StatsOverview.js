import { CheckCircle2, Clock, FileText, Inbox, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatsOverview({ stats, currentStatus, onSelectStatus, isLoading }) {
  const cards = [
    {
      id: 'ALL',
      title: 'Active Desk',
      count: stats?.totalActive ?? 0,
      icon: Inbox,
      color: 'text-slate-700 bg-slate-100',
      activeBorder: 'border-slate-800 ring-2 ring-slate-800/10',
    },
    {
      id: 'OPEN',
      title: 'Open / Pending',
      count: stats?.open ?? 0,
      icon: FileText,
      color: 'text-amber-700 bg-amber-50',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
    },
    {
      id: 'IN_REVIEW',
      title: 'In Review',
      count: stats?.inReview ?? 0,
      icon: Clock,
      color: 'text-blue-700 bg-blue-50',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
    },
    {
      id: 'APPROVED',
      title: 'Approved',
      count: stats?.approved ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
    },
    {
      id: 'REJECTED',
      title: 'Rejected',
      count: stats?.rejected ?? 0,
      icon: XCircle,
      color: 'text-rose-700 bg-rose-50',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = (!currentStatus && card.id === 'ALL') || currentStatus === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectStatus(card.id === 'ALL' ? '' : card.id)}
            className={cn(
              'flex flex-col p-4 rounded-xl border bg-white text-left transition-all duration-150 hover:shadow-md cursor-pointer relative overflow-hidden',
              isSelected
                ? cn('shadow-xs bg-slate-50/50', card.activeBorder)
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={cn('p-1.5 rounded-lg', card.color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? (
                <div className="h-8 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                card.count
              )}
            </div>

            {isSelected && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
