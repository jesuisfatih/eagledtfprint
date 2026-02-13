'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { QuoteRequestForm, QuoteFormData } from '@/components/quotes/QuoteRequestForm';
import { QuoteStatusBadge, QuoteTimeline } from '@/components/quotes/QuoteDetailView';
import type { QuoteStatus } from '@/components/quotes/QuoteDetailView';

interface QuoteItem {
  id: string;
  productId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  requestedPrice?: number;
  quotedPrice?: number;
  notes?: string;
}

interface Quote {
  id: string;
  quoteNumber?: string;
  companyId: string;
  userId: string;
  notes: string;
  status: QuoteStatus;
  priority?: 'normal' | 'urgent';
  items?: QuoteItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  validUntil?: string;
  quotedAt?: string;
  responseNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState(false);
  const [detailModal, setDetailModal] = useState<Quote | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  const [filter, setFilter] = useState<'all' | QuoteStatus>('all');

  useEffect(() => {
    loadQuotes();
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setRequestModal(true);
    }
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const response = await accountsFetch('/api/v1/quotes');
      const data = await response.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const submitQuote = async (formData: QuoteFormData) => {
    setIsSubmitting(true);
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const userId = localStorage.getItem('eagle_userId') || '';
      
      const response = await accountsFetch('/api/v1/quotes', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          userId,
          items: formData.items,
          notes: formData.notes,
          priority: formData.priority,
          requestedDeliveryDate: formData.requestedDeliveryDate,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
        }),
      });
      
      setRequestModal(false);
      
      if (response.ok) {
        setResultModal({show: true, message: 'Quote request submitted successfully!', type: 'success'});
        loadQuotes();
      } else {
        const error = await response.json().catch(() => ({}));
        setResultModal({show: true, message: error.message || 'Failed to submit quote request', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to submit quote request', type: 'error'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      // Backend uses POST /quotes/:id/approve (not PUT /accept)
      const response = await accountsFetch(`/api/v1/quotes/${quoteId}/approve`, { method: 'POST' });
      if (response.ok) {
        setResultModal({show: true, message: 'Quote accepted!', type: 'success'});
        setDetailModal(null);
        loadQuotes();
      } else {
        const error = await response.json().catch(() => ({}));
        setResultModal({show: true, message: error.message || 'Failed to accept quote', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to accept quote', type: 'error'});
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      // Backend uses POST (not PUT)
      const response = await accountsFetch(`/api/v1/quotes/${quoteId}/reject`, { method: 'POST' });
      if (response.ok) {
        setResultModal({show: true, message: 'Quote declined.', type: 'success'});
        setDetailModal(null);
        loadQuotes();
      } else {
        const error = await response.json().catch(() => ({}));
        setResultModal({show: true, message: error.message || 'Failed to decline quote', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to decline quote', type: 'error'});
    }
  };

  const filteredQuotes = quotes.filter(q => filter === 'all' || q.status === filter);
  const statusCounts = {
    pending: quotes.filter(q => q.status === 'pending').length,
    quoted: quotes.filter(q => q.status === 'quoted').length,
    approved: quotes.filter(q => q.status === 'approved').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Quote Requests</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Request custom pricing for bulk orders</p>
        </div>
        <button onClick={() => setRequestModal(true)} className="btn-apple btn-apple-primary">
          <i className="ti ti-plus" style={{ marginRight: '0.25rem' }}></i>New Quote Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ background: 'var(--accent)', color: '#fff' }}>
          <div className="stat-icon"><i className="ti ti-file-invoice"></i></div>
          <div className="stat-info">
            <span className="stat-label" style={{ opacity: 0.85 }}>Total Quotes</span>
            <span className="stat-value">{quotes.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--orange)' }}><i className="ti ti-clock"></i></div>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value" style={{ color: 'var(--orange)' }}>{statusCounts.pending}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}><i className="ti ti-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Ready to Accept</span>
            <span className="stat-value" style={{ color: 'var(--accent)' }}>{statusCounts.quoted}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--green)' }}><i className="ti ti-circle-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Approved</span>
            <span className="stat-value" style={{ color: 'var(--green)' }}>{statusCounts.approved}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['all', 'pending', 'quoted', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            className={`btn-apple ${filter === f ? 'btn-apple-primary' : 'btn-apple-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Quotes List */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div className="spinner-apple"></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <i className="ti ti-file-invoice ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block' }}></i>
              <h5>{filter === 'all' ? 'No quote requests yet' : `No ${filter} quotes`}</h5>
              <p style={{ color: 'var(--text-secondary)' }}>Request a quote for bulk orders to get custom pricing</p>
              {filter === 'all' && (
                <button onClick={() => setRequestModal(true)} className="btn-apple btn-apple-primary" style={{ marginTop: '1rem' }}>
                  <i className="ti ti-plus" style={{ marginRight: '0.25rem' }}></i>Request Your First Quote
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredQuotes.map((quote) => {
                const itemCount = quote.items?.length || 0;
                const totalQuantity = quote.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                
                return (
                  <div 
                    key={quote.id} 
                    onClick={() => setDetailModal(quote)}
                    style={{ padding: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <h6 style={{ margin: 0, fontWeight: 600 }}>Quote #{quote.quoteNumber || quote.id.substring(0, 8)}</h6>
                          <QuoteStatusBadge status={quote.status} size="sm" />
                          {quote.priority === 'urgent' && <span className="badge" style={{ background: 'rgba(255,59,48,0.12)', color: 'var(--red)' }}>Urgent</span>}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          {itemCount > 0 ? `${itemCount} product${itemCount !== 1 ? 's' : ''} • ${totalQuantity} units` : quote.notes?.substring(0, 100)}
                        </p>
                        <small style={{ color: 'var(--text-secondary)' }}><i className="ti ti-clock" style={{ marginRight: '0.25rem' }}></i>{formatRelativeTime(quote.createdAt)}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {quote.total && <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '0.25rem' }}>{formatCurrency(quote.total)}</div>}
                        <i className="ti ti-chevron-right" style={{ color: 'var(--text-tertiary)' }}></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Request Quote Modal */}
      <Modal show={requestModal} onClose={() => setRequestModal(false)} title="Request Quote">
        <QuoteRequestForm onSubmit={submitQuote} onCancel={() => setRequestModal(false)} isSubmitting={isSubmitting} />
      </Modal>

      {/* Quote Detail Modal */}
      {detailModal && (
        <Modal show={!!detailModal} onClose={() => setDetailModal(null)} title={`Quote #${detailModal.quoteNumber || detailModal.id.substring(0, 8)}`}>
          <div className="quote-detail">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <QuoteStatusBadge status={detailModal.status} size="lg" />
              {detailModal.priority === 'urgent' && <span className="badge" style={{ background: 'rgba(255,59,48,0.12)', color: 'var(--red)' }}>Urgent</span>}
            </div>
            
            {detailModal.responseNotes && (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <i className="ti ti-message" style={{ marginRight: '0.5rem' }}></i><strong>Sales Response:</strong>
                <p style={{ margin: '0.25rem 0 0 0' }}>{detailModal.responseNotes}</p>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <QuoteTimeline quote={detailModal as Parameters<typeof QuoteTimeline>[0]['quote']} />
            </div>

            {detailModal.items && detailModal.items.length > 0 && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><h6 style={{ margin: 0 }}>Quote Items</h6></div>
                <div className="table-container">
                  <table className="apple-table">
                    <thead><tr><th>Product</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th></tr></thead>
                    <tbody>
                      {detailModal.items.map((item) => (
                        <tr key={item.id}>
                          <td><div style={{ fontWeight: 600 }}>{item.title}</div>{item.variantTitle && <small style={{ color: 'var(--text-secondary)' }}>{item.variantTitle}</small>}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{item.quotedPrice ? formatCurrency(item.quotedPrice) : <span style={{ color: 'var(--text-secondary)' }}>Pending</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailModal.notes && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header"><h6 style={{ margin: 0 }}>Your Notes</h6></div>
                <div className="card-body"><p style={{ margin: 0 }}>{detailModal.notes}</p></div>
              </div>
            )}

            {detailModal.total && (
              <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '1rem' }}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}><span>Subtotal</span><span>{formatCurrency(detailModal.subtotal || 0)}</span></div>
                  {detailModal.discount && detailModal.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: 'var(--green)' }}><span>Discount</span><span>-{formatCurrency(detailModal.discount)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 700, fontSize: '1.15rem' }}><span>Total</span><span style={{ color: 'var(--green)' }}>{formatCurrency(detailModal.total)}</span></div>
                </div>
              </div>
            )}

            {detailModal.status === 'quoted' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn-apple btn-apple-secondary" style={{ color: 'var(--red)' }} onClick={() => handleRejectQuote(detailModal.id)}><i className="ti ti-x" style={{ marginRight: '0.25rem' }}></i>Decline</button>
                <button className="btn-apple btn-apple-primary" style={{ background: 'var(--green)' }} onClick={() => handleAcceptQuote(detailModal.id)}><i className="ti ti-check" style={{ marginRight: '0.25rem' }}></i>Accept Quote</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Result Modal */}
      <Modal show={resultModal.show} onClose={() => setResultModal({show: false, message: '', type: 'success'})} title={resultModal.type === 'success' ? 'Success' : 'Error'}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <i className={`ti ti-${resultModal.type === 'success' ? 'circle-check' : 'alert-circle'} ti-3x`} style={{ color: resultModal.type === 'success' ? 'var(--green)' : 'var(--red)', marginBottom: '1rem', display: 'block' }}></i>
          <p style={{ margin: 0 }}>{resultModal.message}</p>
        </div>
        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
          <button className="btn-apple btn-apple-primary" onClick={() => setResultModal({show: false, message: '', type: 'success'})}>OK</button>
        </div>
      </Modal>
    </div>
  );
}
