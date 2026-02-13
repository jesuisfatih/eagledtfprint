'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  id: string;
  productId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  image?: string;
}

interface QuoteRequestFormProps {
  cartItems?: CartItem[];
  onSubmit: (data: QuoteFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface QuoteFormData {
  items: QuoteItemData[];
  notes: string;
  requestedDeliveryDate?: string;
  shippingAddressId?: string;
  contactEmail: string;
  contactPhone?: string;
  priority: 'normal' | 'urgent';
  attachments?: File[];
}

interface QuoteItemData {
  productId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  requestedPrice?: number;
  notes?: string;
}

export function QuoteRequestForm({ 
  cartItems = [], 
  onSubmit, 
  onCancel,
  isSubmitting = false 
}: QuoteRequestFormProps) {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<QuoteItemData[]>(
    cartItems.map(item => ({
      productId: item.productId,
      title: item.title,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      requestedPrice: undefined,
      notes: ''
    }))
  );
  const [formData, setFormData] = useState({
    notes: '',
    requestedDeliveryDate: '',
    contactEmail: '',
    contactPhone: '',
    priority: 'normal' as const,
  });

  const addCustomItem = () => {
    setItems(prev => [...prev, {
      productId: `custom-${Date.now()}`,
      title: '',
      variantTitle: '',
      quantity: 1,
      requestedPrice: undefined,
      notes: ''
    }]);
  };

  const updateItem = (index: number, updates: Partial<QuoteItemData>) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    await onSubmit({
      items,
      notes: formData.notes,
      requestedDeliveryDate: formData.requestedDeliveryDate || undefined,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone || undefined,
      priority: formData.priority,
    });
  };

  const isStep1Valid = items.length > 0 && items.every(item => item.title && item.quantity > 0);
  const isStep2Valid = formData.contactEmail.includes('@');

  return (
    <div className="quote-request-form">
      {/* Progress Steps */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= 1 ? 'var(--accent)' : 'var(--bg-secondary)', color: step >= 1 ? '#fff' : 'var(--text-secondary)' }}>
            1
          </div>
          <div style={{ width: 40, height: 2, background: step >= 2 ? 'var(--accent)' : 'var(--bg-secondary)' }}></div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= 2 ? 'var(--accent)' : 'var(--bg-secondary)', color: step >= 2 ? '#fff' : 'var(--text-secondary)' }}>
            2
          </div>
          <div style={{ width: 40, height: 2, background: step >= 3 ? 'var(--accent)' : 'var(--bg-secondary)' }}></div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= 3 ? 'var(--accent)' : 'var(--bg-secondary)', color: step >= 3 ? '#fff' : 'var(--text-secondary)' }}>
            3
          </div>
        </div>
      </div>

      {/* Step 1: Items */}
      {step === 1 && (
        <div>
          <h6 style={{ marginBottom: 16 }}>
            <i className="ti ti-package" style={{ marginRight: 8 }}></i>
            Items for Quote
          </h6>
          
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <i className="ti ti-package-off ti-2x" style={{ color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}></i>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No items added yet</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
              {items.map((item, index) => (
                <div key={index} style={{ padding: 16, borderTop: index > 0 ? '1px solid var(--border)' : undefined }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Product Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.title}
                        onChange={(e) => updateItem(index, { title: e.target.value })}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Variant</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.variantTitle || ''}
                        onChange={(e) => updateItem(index, { variantTitle: e.target.value })}
                        placeholder="Size/Color"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Quantity</label>
                      <input
                        type="number"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        min="1"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Target Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={item.requestedPrice || ''}
                        onChange={(e) => updateItem(index, { requestedPrice: parseFloat(e.target.value) || undefined })}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn-apple btn-apple-secondary"
                        onClick={() => removeItem(index)}
                        style={{ color: 'var(--red)', width: '100%' }}
                      >
                        <i className="ti ti-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, { notes: e.target.value })}
                      placeholder="Notes for this item (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-apple btn-apple-secondary"
            onClick={addCustomItem}
          >
            <i className="ti ti-plus" style={{ marginRight: 4 }}></i>
            Add Item
          </button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div>
          <h6 style={{ marginBottom: 16 }}>
            <i className="ti ti-file-description" style={{ marginRight: 8 }}></i>
            Quote Details
          </h6>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Contact Email <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                type="email"
                className="form-input"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Requested Delivery Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.requestedDeliveryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, requestedDeliveryDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'normal' | 'urgent' }))}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent (Additional fees may apply)</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Additional Notes</label>
              <textarea
                className="form-input"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requirements, delivery instructions, or other notes..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <h6 style={{ marginBottom: 16 }}>
            <i className="ti ti-checklist" style={{ marginRight: 8 }}></i>
            Review Quote Request
          </h6>

          <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 16 }}>
            <div className="card-body">
              <h6 className="card-title">Items ({items.length})</h6>
              <div className="table-container">
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Target Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          {item.title}
                          {item.variantTitle && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}> - {item.variantTitle}</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          {item.requestedPrice ? formatCurrency(item.requestedPrice) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <div className="card" style={{ background: 'var(--bg-secondary)', height: '100%' }}>
                <div className="card-body">
                  <h6 className="card-title">Contact</h6>
                  <p style={{ marginBottom: 4 }}>{formData.contactEmail}</p>
                  {formData.contactPhone && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{formData.contactPhone}</p>}
                </div>
              </div>
            </div>
            <div>
              <div className="card" style={{ background: 'var(--bg-secondary)', height: '100%' }}>
                <div className="card-body">
                  <h6 className="card-title">Delivery</h6>
                  <p style={{ marginBottom: 4 }}>
                    {formData.requestedDeliveryDate 
                      ? new Date(formData.requestedDeliveryDate).toLocaleDateString()
                      : 'No specific date'
                    }
                  </p>
                  <span className="badge" style={formData.priority === 'urgent' ? { background: 'var(--red)', color: '#fff' } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {formData.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {formData.notes && (
            <div className="card" style={{ background: 'var(--bg-secondary)', marginTop: 16 }}>
              <div className="card-body">
                <h6 className="card-title">Notes</h6>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{formData.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          className="btn-apple btn-apple-secondary"
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        
        {step < 3 ? (
          <button
            type="button"
            className="btn-apple btn-apple-primary"
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
          >
            Next
            <i className="ti ti-arrow-right" style={{ marginLeft: 4 }}></i>
          </button>
        ) : (
          <button
            type="button"
            className="btn-apple btn-apple-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ background: 'var(--green)' }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-apple" style={{ marginRight: 8 }}></span>
                Submitting...
              </>
            ) : (
              <>
                <i className="ti ti-send" style={{ marginRight: 4 }}></i>
                Submit Quote Request
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Quick quote button for product pages
interface QuickQuoteButtonProps {
  productId: string;
  productTitle: string;
  variantTitle?: string;
  quantity?: number;
  className?: string;
}

export function QuickQuoteButton({ 
  productId, 
  productTitle, 
  variantTitle,
  quantity = 1,
  className = '' 
}: QuickQuoteButtonProps) {
  const handleClick = () => {
    // Store quote item in session and redirect
    const quoteItem = { productId, title: productTitle, variantTitle, quantity };
    sessionStorage.setItem('pendingQuoteItem', JSON.stringify(quoteItem));
    window.location.href = '/quotes?action=new';
  };

  return (
    <button
      type="button"
      className={`btn-apple btn-apple-secondary ${className}`}
      onClick={handleClick}
    >
      <i className="ti ti-file-invoice" style={{ marginRight: 4 }}></i>
      Request Quote
    </button>
  );
}

// Quote items summary for display
interface QuoteItemsSummaryProps {
  items: QuoteItemData[];
  showPrices?: boolean;
}

export function QuoteItemsSummary({ items, showPrices = true }: QuoteItemsSummaryProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <div className="quote-items-summary">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Items</span>
        <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{items.length} products</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Total Quantity</span>
        <span style={{ fontWeight: 600 }}>{totalQuantity} units</span>
      </div>
      {showPrices && items.some(i => i.requestedPrice) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Target Total</span>
          <span style={{ fontWeight: 600 }}>
            {formatCurrency(
              items.reduce((sum, item) => sum + (item.requestedPrice || 0) * item.quantity, 0)
            )}
          </span>
        </div>
      )}
    </div>
  );
}
