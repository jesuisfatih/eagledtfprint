'use client';

import Modal from '@/components/Modal';
import { accountsFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import { formatRelativeTime } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  category?: string;
  replies?: Array<{
    id: string;
    message: string;
    isStaff: boolean;
    createdAt: string;
    authorName?: string;
  }>;
}

type TicketCategory = 'order' | 'quote' | 'billing' | 'product' | 'technical' | 'other';

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [resultModal, setResultModal] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({show: false, message: '', type: 'success'});

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'other' as TicketCategory,
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('eagle_userId') || '';
      const response = await accountsFetch(`/api/v1/support-tickets?userId=${userId}`);

      if (response.ok) {
        const data = await response.json();
        setTickets(Array.isArray(data) ? data : data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const userId = localStorage.getItem('eagle_userId') || '';
      const companyId = localStorage.getItem('eagle_companyId') || '';

      const response = await accountsFetch('/api/v1/support-tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          userId,
          companyId,
        }),
      });

      if (response.ok) {
        setResultModal({show: true, message: '✅ Support request submitted successfully! We will get back to you soon.', type: 'success'});
        setFormData({subject: '', message: '', priority: 'medium', category: 'other'});
        loadTickets();
      } else {
        const error = await response.json().catch(() => ({}));
        setResultModal({show: true, message: `❌ ${error.message || 'Failed to submit support request'}`, type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: '❌ Failed to submit support request. Please try again.', type: 'error'});
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { class: string; icon: string; label: string }> = {
      open: { class: 'bg-primary', icon: 'circle-dot', label: 'Open' },
      in_progress: { class: 'bg-warning', icon: 'loader', label: 'In Progress' },
      resolved: { class: 'bg-success', icon: 'check', label: 'Resolved' },
      closed: { class: 'bg-secondary', icon: 'x', label: 'Closed' },
    };
    return configs[status] || { class: 'bg-secondary', icon: 'circle', label: status };
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { class: string; icon: string }> = {
      low: { class: 'bg-info-subtle text-info', icon: 'arrow-down' },
      medium: { class: 'bg-primary-subtle text-primary', icon: 'minus' },
      high: { class: 'bg-warning-subtle text-warning', icon: 'arrow-up' },
      urgent: { class: 'bg-danger-subtle text-danger', icon: 'alert-triangle' },
    };
    return configs[priority] || { class: 'bg-secondary-subtle', icon: 'minus' };
  };

  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, string> = {
      order: 'shopping-cart',
      quote: 'file-invoice',
      billing: 'credit-card',
      product: 'package',
      technical: 'settings',
      other: 'help',
    };
    return icons[category || 'other'] || 'help';
  };

  // Filter tickets
  const filteredTickets = filter === 'all'
    ? tickets
    : tickets.filter(t => t.status === filter);

  // Stats
  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const categories: Array<{ key: TicketCategory; label: string; icon: string }> = [
    { key: 'order', label: 'Order Issue', icon: 'shopping-cart' },
    { key: 'quote', label: 'Quote Request', icon: 'file-invoice' },
    { key: 'billing', label: 'Billing/Payment', icon: 'credit-card' },
    { key: 'product', label: 'Product Question', icon: 'package' },
    { key: 'technical', label: 'Technical Issue', icon: 'settings' },
    { key: 'other', label: 'Other', icon: 'help' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Help & Support</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Get help with your orders, quotes, or account</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ background: 'var(--accent)', color: '#fff' }}>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, opacity: 0.75 }}>Open Tickets</p>
                <h3 style={{ margin: 0 }}>{stats.open}</h3>
              </div>
              <i className="ti ti-ticket" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>In Progress</p>
                <h3 style={{ margin: 0, color: 'var(--orange)' }}>{stats.inProgress}</h3>
              </div>
              <i className="ti ti-loader" style={{ fontSize: '2rem', color: 'var(--orange)', opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Resolved</p>
                <h3 style={{ margin: 0, color: 'var(--green)' }}>{stats.resolved}</h3>
              </div>
              <i className="ti ti-check" style={{ fontSize: '2rem', color: 'var(--green)', opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 24 }}>
        {/* New Ticket Form */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-header">
              <h5 className="card-title" style={{ margin: 0 }}>
                <i className="ti ti-plus" style={{ marginRight: 8 }}></i>New Support Request
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Category Selection */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {categories.map(cat => (
                      <div key={cat.key}>
                        <div
                          className="card"
                          style={{ cursor: 'pointer', borderColor: formData.category === cat.key ? 'var(--accent)' : undefined, background: formData.category === cat.key ? 'var(--bg-secondary)' : undefined }}
                          onClick={() => setFormData(prev => ({...prev, category: cat.key}))}
                        >
                          <div className="card-body" style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <i className={`ti ti-${cat.icon}`} style={{ color: formData.category === cat.key ? 'var(--accent)' : 'var(--text-secondary)' }}></i>
                            <small style={{ display: 'block', color: formData.category === cat.key ? 'var(--accent)' : undefined, fontWeight: formData.category === cat.key ? 600 : undefined }}>
                              {cat.label}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Subject *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({...prev, subject: e.target.value}))}
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value as any}))}
                  >
                    <option value="low">Low - General question</option>
                    <option value="medium">Medium - Need help soon</option>
                    <option value="high">High - Urgent issue</option>
                    <option value="urgent">Urgent - Critical problem</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))}
                    placeholder="Please describe your issue in detail..."
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn-apple btn-apple-primary"
                  style={{ width: '100%' }}
                  disabled={submitting || !formData.subject || !formData.message}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-send" style={{ marginRight: 4 }}></i>
                      Submit Request
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 className="card-title" style={{ margin: 0 }}>Your Tickets</h5>
              <button
                className="btn-apple btn-apple-secondary"
                onClick={loadTickets}
                disabled={loading}
              >
                <i className="ti ti-refresh" style={{ marginRight: 4 }}></i>Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="card-body" style={{ borderBottom: '1px solid var(--border)', padding: '8px 16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(status => (
                  <button
                    key={status}
                    className={filter === status ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                    onClick={() => setFilter(status)}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    {status !== 'all' && (
                      <span className="badge" style={{ background: '#fff', color: '#1d1d1f', marginLeft: 4 }}>
                        {tickets.filter(t => t.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner-apple"></div>
                  <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <i className="ti ti-ticket-off ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: 16, display: 'block' }}></i>
                  <h5>No tickets found</h5>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {filter === 'all'
                      ? 'Submit a request using the form'
                      : 'No tickets with this status'
                    }
                  </p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {filteredTickets.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket.status);
                    const priorityConfig = getPriorityConfig(ticket.priority);

                    return (
                      <div
                        key={ticket.id}
                        className="list-group-item list-group-item-action"
                        style={{ cursor: 'pointer', background: selectedTicket?.id === ticket.id ? 'var(--bg-secondary)' : undefined }}
                        onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <i className={`ti ti-${getCategoryIcon(ticket.category)}`} style={{ color: 'var(--text-secondary)' }}></i>
                              <h6 style={{ margin: 0 }}>{ticket.subject}</h6>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                              {ticket.message}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <span className="badge" style={{ background: statusConfig.class === 'bg-primary' ? 'var(--accent)' : statusConfig.class === 'bg-warning' ? 'var(--orange)' : statusConfig.class === 'bg-success' ? 'var(--green)' : 'var(--text-tertiary)', color: '#fff' }}>
                                <i className={`ti ti-${statusConfig.icon}`} style={{ marginRight: 4 }}></i>
                                {statusConfig.label}
                              </span>
                              <span className="badge" style={{ background: ticket.priority === 'urgent' ? 'var(--red)' : ticket.priority === 'high' ? 'var(--orange)' : ticket.priority === 'medium' ? 'var(--accent)' : 'var(--text-tertiary)', color: '#fff' }}>
                                <i className={`ti ti-${priorityConfig.icon}`} style={{ marginRight: 4 }}></i>
                                {ticket.priority}
                              </span>
                              <small style={{ color: 'var(--text-secondary)' }}>
                                {formatRelativeTime(ticket.createdAt)}
                              </small>
                            </div>
                          </div>
                          <i className={`ti ti-chevron-${selectedTicket?.id === ticket.id ? 'up' : 'down'}`} style={{ color: 'var(--text-secondary)' }}></i>
                        </div>

                        {/* Expanded Detail */}
                        {selectedTicket?.id === ticket.id && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                            <h6 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Full Message:</h6>
                            <p style={{ marginBottom: 16 }}>{ticket.message}</p>

                            {ticket.replies && ticket.replies.length > 0 && (
                              <>
                                <h6 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Replies:</h6>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {ticket.replies.map(reply => (
                                    <div
                                      key={reply.id}
                                      style={{ padding: 8, borderRadius: 8, background: reply.isStaff ? 'var(--bg-secondary)' : 'var(--bg-secondary)' }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <small style={{ fontWeight: 600 }}>
                                          {reply.isStaff ? '🛡️ Support Team' : reply.authorName || 'You'}
                                        </small>
                                        <small style={{ color: 'var(--text-secondary)' }}>{formatRelativeTime(reply.createdAt)}</small>
                                      </div>
                                      <p style={{ margin: 0, fontSize: '0.875rem' }}>{reply.message}</p>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            <div style={{ marginTop: 16, textAlign: 'right' }}>
                              <small style={{ color: 'var(--text-secondary)' }}>
                                Last updated: {formatRelativeTime(ticket.updatedAt)}
                              </small>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body">
          <h5 className="card-title" style={{ marginBottom: 16 }}>
            <i className="ti ti-headset" style={{ marginRight: 8 }}></i>Other Ways to Reach Us
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <i className="ti ti-mail" style={{ fontSize: '1.25rem' }}></i>
              </div>
              <div>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>Email</small>
                <a href={`mailto:${config.supportEmail}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {config.supportEmail}
                </a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <i className="ti ti-phone" style={{ fontSize: '1.25rem' }}></i>
              </div>
              <div>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>Phone</small>
                <a href="tel:+18005550123" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>(800) 555-0123</a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <i className="ti ti-clock" style={{ fontSize: '1.25rem' }}></i>
              </div>
              <div>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>Business Hours</small>
                <span style={{ fontWeight: 600 }}>Mon-Fri, 9AM-6PM EST</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h5 className="card-title" style={{ margin: 0 }}>
            <i className="ti ti-help-circle" style={{ marginRight: 8 }}></i>Frequently Asked Questions
          </h5>
        </div>
        <div className="card-body">
          <div className="accordion" id="faqAccordion">
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                  How do I track my order?
                </button>
              </h2>
              <div id="faq1" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div className="accordion-body">
                  Go to the Orders page to view all your orders. Click on any order to see detailed tracking information including shipping status and estimated delivery date.
                </div>
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                  How do I request a quote for bulk orders?
                </button>
              </h2>
              <div id="faq2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div className="accordion-body">
                  Visit the Quotes page and click "Request Quote". Fill in the product details, quantities, and any special requirements. Our team will review and respond within 24-48 hours.
                </div>
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                  What are the payment terms for B2B accounts?
                </button>
              </h2>
              <div id="faq3" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div className="accordion-body">
                  We offer Net-30 payment terms for qualified B2B accounts. Contact our sales team to set up credit terms for your company.
                </div>
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">
                  How do I add team members to my company account?
                </button>
              </h2>
              <div id="faq4" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div className="accordion-body">
                  Administrators can invite team members from the Team page. Click "Invite Member", enter their email, and select their role. They'll receive an invitation to join your company account.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {resultModal.show && (
        <Modal
          show={resultModal.show}
          onClose={() => setResultModal({show: false, message: '', type: 'success'})}
          onConfirm={() => setResultModal({show: false, message: '', type: 'success'})}
          title={resultModal.type === 'success' ? 'Success' : 'Error'}
          message={resultModal.message}
          confirmText="OK"
          type={resultModal.type === 'success' ? 'success' : 'danger'}
        />
      )}
    </div>
  );
}
