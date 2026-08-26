import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertCircle } from 'lucide-react';

const REASON_OPTIONS = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'WRONG_ITEM', label: 'Wrong Item' },
  { value: 'SIZE_ISSUE', label: 'Size Issue' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not As Described' },
  { value: 'CHANGED_MIND', label: 'Changed Mind' },
];

export function CreateRequestModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderId: '',
    itemSku: '',
    itemName: '',
    quantity: 1,
    reason: 'DAMAGED',
    initialNote: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value, 10) || 1 : value,
    }));
    // Clear field error on edit
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setFieldErrors({});

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error?.details?.length > 0) {
          const errorsMap = {};
          result.error.details.forEach((item) => {
            errorsMap[item.field] = item.issue;
          });
          setFieldErrors(errorsMap);
        }
        throw new Error(result.error?.message || 'Failed to create return request.');
      }

      // Reset form on success
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        orderId: '',
        itemSku: '',
        itemName: '',
        quantity: 1,
        reason: 'DAMAGED',
        initialNote: '',
      });

      onSuccess(result.data, 'Return request created successfully.');
      onClose();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raise Return Request"
      subtitle="A unique human-readable reference (RET-2026-XXXXX) will be generated automatically."
      maxWidth="max-w-2xl"
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Creation Error: </span>
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Customer Info */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            1. Customer Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                required
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.customerName && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.customerName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                required
                placeholder="e.g. john@example.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.customerEmail && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.customerEmail}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="e.g. +1 555-0199"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Order & Item Details */}
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            2. Order & Item Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Order ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="orderId"
                value={formData.orderId}
                onChange={handleChange}
                required
                placeholder="e.g. ORD-9821"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.orderId && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.orderId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Item SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="itemSku"
                value={formData.itemSku}
                onChange={handleChange}
                required
                placeholder="e.g. SKU-SHIRT-BLU-M"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.itemSku && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.itemSku}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Item Description / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                required
                placeholder="e.g. Oxford Cotton Shirt (Blue, M)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.itemName && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.itemName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Return Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Initial Note */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Initial Note (Optional)
          </label>
          <textarea
            name="initialNote"
            rows="2"
            value={formData.initialNote}
            onChange={handleChange}
            placeholder="Add relevant customer context or courier details..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button type="button" onClick={onClose} variant="ghost" size="md">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            Generate & Create Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
