import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertCircle, CheckCircle2, DollarSign, Trash2, XCircle } from 'lucide-react';

/**
 * Modal for Approving a return request (Rule 2 enforcement)
 */
export function ApprovalModal({ isOpen, onClose, request, onConfirm, isLoading }) {
  const [resolution, setResolution] = useState('REFUND');
  const [refundAmount, setRefundAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (resolution === 'REFUND') {
      const amount = parseFloat(refundAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('A valid refund amount greater than $0.00 is required for refund resolution.');
        return;
      }
    }

    onConfirm({
      status: 'APPROVED',
      resolution,
      refundAmount: resolution === 'REFUND' ? parseFloat(refundAmount) : null,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Return Request"
      subtitle={`Specify the resolution type for return ${request?.reference}.`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Resolution Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'REFUND', label: 'Refund' },
              { id: 'REPLACEMENT', label: 'Replacement' },
              { id: 'STORE_CREDIT', label: 'Store Credit' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setResolution(option.id)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                  resolution === option.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Refund Amount Input (Mandatory only if REFUND) */}
        {resolution === 'REFUND' && (
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 animate-fade-in">
            <label className="block text-xs font-semibold text-emerald-900 mb-1">
              Refund Amount ($ USD) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              Refund amount is strictly recorded and must exceed $0.00.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Approval Note (Optional)
          </label>
          <textarea
            rows="2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add approval instructions or reference ticket..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            size="sm"
            icon={CheckCircle2}
            isLoading={isLoading}
          >
            Confirm Approval
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Modal for Rejecting a return request (Terminal state)
 */
export function RejectModal({ isOpen, onClose, request, onConfirm, isLoading }) {
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      status: 'REJECTED',
      note: note.trim() || 'Request rejected by support agent.',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Return Request"
      subtitle={`Are you sure you want to reject return ${request?.reference}? This action is final.`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>
            <strong>Terminal Status:</strong> Rejected requests cannot transition to any other status.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Rejection Reason / Note
          </label>
          <textarea
            rows="3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="State policy violation, expired return window, or reason..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            icon={XCircle}
            isLoading={isLoading}
          >
            Reject Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Modal for Completing a return request (Terminal state)
 */
export function CompleteModal({ isOpen, onClose, request, onConfirm, isLoading }) {
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      status: 'COMPLETED',
      note: note.trim() || 'Return process completed and closed out.',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Return Request"
      subtitle={`Finalize resolution and close out ${request?.reference}.`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs">
          <p>
            Closing this return request marks it as completely fulfilled. Details are permanently locked.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Closing Note (Optional)
          </label>
          <textarea
            rows="2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Transaction ID, carrier tracking, or closing remarks..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-500 resize-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={isLoading}
          >
            Mark as Completed
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Modal for Soft Removal confirmation (Rule 5)
 */
export function RemoveModal({ isOpen, onClose, request, onConfirm, isLoading }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remove from Active Desk"
      subtitle={`Take request ${request?.reference} off the active returns desk.`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <Trash2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Soft Removal:</strong> The record will disappear from the active desk and cannot be fetched via standard queries, but will be safely preserved in PostgreSQL.
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="danger"
            size="sm"
            icon={Trash2}
            isLoading={isLoading}
          >
            Remove Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
