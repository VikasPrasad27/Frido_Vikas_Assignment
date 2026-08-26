import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { StatusBadge, ReasonBadge } from './ui/Badge';
import { NotesSection } from './NotesSection';
import {
  ApprovalModal,
  RejectModal,
  CompleteModal,
  RemoveModal,
} from './ActionModals';
import { formatDate, formatCurrency, RESOLUTION_CONFIG } from '@/lib/utils';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit2,
  Lock,
  Mail,
  Package,
  Phone,
  RotateCcw,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';

export function RequestDetailModal({
  isOpen,
  onClose,
  requestId,
  onUpdateRequestSuccess,
}) {
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Sub-modals for status transitions
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Fetch full details whenever modal opens or requestId changes
  useEffect(() => {
    if (!isOpen || !requestId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setErrorBanner('');
      setIsEditing(false);

      try {
        const res = await fetch(`/api/requests/${requestId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to load request details.');
        }

        setRequest(data.data);
        setEditFormData({
          customerName: data.data.customerName,
          customerEmail: data.data.customerEmail,
          customerPhone: data.data.customerPhone || '',
          orderId: data.data.orderId,
          itemSku: data.data.itemSku,
          itemName: data.data.itemName,
          quantity: data.data.quantity,
          reason: data.data.reason,
        });
      } catch (err) {
        setErrorBanner(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, requestId]);

  // Handle Edit form submission (Rule 4)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);
    setErrorBanner('');

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update request.');
      }

      setRequest(result.data);
      setIsEditing(false);
      onUpdateRequestSuccess(result.data, 'Request details successfully updated.');
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Status Transition (Rules 1 & 2)
  const handleExecuteTransition = async (payload) => {
    setIsTransitioning(true);
    setErrorBanner('');

    try {
      const res = await fetch(`/api/requests/${requestId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Status transition failed.');
      }

      setRequest(result.data);
      setShowApprovalModal(false);
      setShowRejectModal(false);
      setShowCompleteModal(false);
      onUpdateRequestSuccess(result.data, `Status moved to ${payload.status}.`);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Handle Simple Transition to IN_REVIEW
  const handleMoveToInReview = async () => {
    handleExecuteTransition({
      status: 'IN_REVIEW',
      note: 'Support agent initiated review.',
    });
  };

  // Handle Soft Removal (Rule 5)
  const handleConfirmRemove = async () => {
    setIsTransitioning(true);
    setErrorBanner('');

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to remove request.');
      }

      setShowRemoveModal(false);
      onClose();
      onUpdateRequestSuccess(null, result.data?.message || 'Request removed from desk.');
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Handle Adding Note
  const handleAddNote = async (reqId, noteData) => {
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/requests/${reqId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to add note.');
      }

      // Append note locally
      setRequest((prev) => ({
        ...prev,
        notes: [...(prev.notes || []), result.data],
      }));
    } finally {
      setIsAddingNote(false);
    }
  };

  if (!isOpen) return null;

  const isDecided = ['APPROVED', 'REJECTED', 'COMPLETED'].includes(request?.status);
  const isRemovable = ['OPEN', 'REJECTED'].includes(request?.status);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-slate-900 text-lg">
              {request?.reference || 'Request Details'}
            </span>
            {request && <StatusBadge status={request.status} />}
          </div>
        }
        subtitle={
          request ? `Created on ${formatDate(request.createdAt)}` : 'Loading request information...'
        }
        maxWidth="max-w-3xl"
      >
        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Action Refused:</strong> {errorBanner}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading request information...</p>
          </div>
        ) : request ? (
          <div className="space-y-6">
            {/* Legal Action Control Bar */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Actions:
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* OPEN state actions */}
                {request.status === 'OPEN' && (
                  <>
                    <Button
                      onClick={handleMoveToInReview}
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      isLoading={isTransitioning}
                    >
                      Start Review
                    </Button>
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Details'}
                    </Button>
                    <Button
                      onClick={() => setShowRemoveModal(true)}
                      variant="dangerGhost"
                      size="sm"
                      icon={Trash2}
                    >
                      Remove
                    </Button>
                  </>
                )}

                {/* IN_REVIEW state actions */}
                {request.status === 'IN_REVIEW' && (
                  <>
                    <Button
                      onClick={() => setShowApprovalModal(true)}
                      variant="success"
                      size="sm"
                      icon={CheckCircle2}
                    >
                      Approve Return
                    </Button>
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      variant="danger"
                      size="sm"
                      icon={XCircle}
                    >
                      Reject Return
                    </Button>
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Details'}
                    </Button>
                  </>
                )}

                {/* APPROVED state actions */}
                {request.status === 'APPROVED' && (
                  <Button
                    onClick={() => setShowCompleteModal(true)}
                    variant="secondary"
                    size="sm"
                    icon={CheckCircle2}
                  >
                    Mark as Completed
                  </Button>
                )}

                {/* REJECTED state actions */}
                {request.status === 'REJECTED' && (
                  <Button
                    onClick={() => setShowRemoveModal(true)}
                    variant="dangerGhost"
                    size="sm"
                    icon={Trash2}
                  >
                    Remove from Desk
                  </Button>
                )}

                {/* COMPLETED state message */}
                {request.status === 'COMPLETED' && (
                  <span className="text-xs font-semibold text-slate-500 px-2 py-1 bg-slate-200/60 rounded">
                    Ticket Closed
                  </span>
                )}
              </div>
            </div>

            {/* Locked Info Alert if decided (Rule 4) */}
            {isDecided && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Customer and item details are permanently locked because this request is{' '}
                  <strong className="text-slate-800">{request.status}</strong>. Notes can still be added.
                </span>
              </div>
            )}

            {/* Resolution Banner (if APPROVED or COMPLETED) */}
            {request.resolution && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-950 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Resolution Approved: {RESOLUTION_CONFIG[request.resolution]?.label || request.resolution}
                </div>
                {request.refundAmount && (
                  <div className="text-emerald-900">
                    Refund Amount: <span className="font-bold">{formatCurrency(request.refundAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Details Form (Edit mode or View mode) */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Edit Request Information
                  </h4>
                  <span className="text-[11px] text-blue-700 font-medium">Rule 4: Allowed before decision</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={editFormData.customerName}
                      onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Customer Email</label>
                    <input
                      type="email"
                      value={editFormData.customerEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, customerEmail: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Order ID</label>
                    <input
                      type="text"
                      value={editFormData.orderId}
                      onChange={(e) => setEditFormData({ ...editFormData, orderId: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Item SKU</label>
                    <input
                      type="text"
                      value={editFormData.itemSku}
                      onChange={(e) => setEditFormData({ ...editFormData, itemSku: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Item Description</label>
                    <input
                      type="text"
                      value={editFormData.itemName}
                      onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value, 10) || 1 })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Return Reason</label>
                    <select
                      value={editFormData.reason}
                      onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    >
                      <option value="DAMAGED">Damaged</option>
                      <option value="WRONG_ITEM">Wrong Item</option>
                      <option value="SIZE_ISSUE">Size Issue</option>
                      <option value="NOT_AS_DESCRIBED">Not As Described</option>
                      <option value="CHANGED_MIND">Changed Mind</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                  <Button type="button" onClick={() => setIsEditing(false)} variant="ghost" size="sm">
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Card */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Customer Details
                  </h4>
                  <div className="text-sm font-semibold text-slate-900">{request.customerName}</div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{request.customerEmail}</span>
                  </div>
                  {request.customerPhone && (
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{request.customerPhone}</span>
                    </div>
                  )}
                </div>

                {/* Order & Item Card */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Order & Item
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
                      Order: {request.orderId}
                    </span>
                    <ReasonBadge reason={request.reason} />
                  </div>
                  <div className="text-xs text-slate-800 font-medium">{request.itemName}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-mono">SKU: {request.itemSku}</span>
                    <span>·</span>
                    <span>Quantity: {request.quantity}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chronological Notes Section */}
            <div className="pt-2 border-t border-slate-200">
              <NotesSection
                requestId={request.id}
                notes={request.notes || []}
                onAddNote={handleAddNote}
                isAddingNote={isAddingNote}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Sub-modals for Action Flows */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        request={request}
        onConfirm={handleExecuteTransition}
        isLoading={isTransitioning}
      />

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        request={request}
        onConfirm={handleExecuteTransition}
        isLoading={isTransitioning}
      />

      <CompleteModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        request={request}
        onConfirm={handleExecuteTransition}
        isLoading={isTransitioning}
      />

      <RemoveModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        request={request}
        onConfirm={handleConfirmRemove}
        isLoading={isTransitioning}
      />
    </>
  );
}
