'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/Modal';
import { accountsFetch } from '@/lib/api-client';

// Backend uses isBilling/isShipping booleans, not type enum
interface Address {
  id: string;
  isBilling: boolean;
  isShipping: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  label?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  zip: string;
  country: string;
  countryCode?: string;
  phone?: string;
  isDefault: boolean;
}

// Computed type from booleans
type AddressType = 'BILLING' | 'SHIPPING' | 'BOTH';

function getAddressType(addr: Address): AddressType {
  if (addr.isBilling && addr.isShipping) return 'BOTH';
  if (addr.isBilling) return 'BILLING';
  return 'SHIPPING';
}

interface AddressFormData {
  type: AddressType;
  firstName: string;
  lastName: string;
  company: string;
  label: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  countryCode: string;
  phone: string;
  isDefault: boolean;
}

const emptyFormData: AddressFormData = {
  type: 'SHIPPING',
  firstName: '',
  lastName: '',
  company: '',
  label: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  zip: '',
  country: 'United States',
  countryCode: 'US',
  phone: '',
  isDefault: false,
};

type AddressFilter = 'all' | 'shipping' | 'billing';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<AddressFilter>('all');
  
  const [deleteModal, setDeleteModal] = useState<{show: boolean; id: string}>({show: false, id: ''});
  const [resultModal, setResultModal] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  const [formModal, setFormModal] = useState<{show: boolean; editId: string | null}>({show: false, editId: null});
  const [formData, setFormData] = useState<AddressFormData>(emptyFormData);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await accountsFetch('/api/v1/addresses');
      
      if (response.ok) {
        const data = await response.json();
        setAddresses(Array.isArray(data) ? data : data.addresses || []);
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const shipping = addresses.filter(a => a.isShipping);
    const billing = addresses.filter(a => a.isBilling);
    const defaultShipping = addresses.find(a => a.isShipping && a.isDefault);
    const defaultBilling = addresses.find(a => a.isBilling && a.isDefault);
    
    return {
      total: addresses.length,
      shipping: shipping.length,
      billing: billing.length,
      hasDefaultShipping: !!defaultShipping,
      hasDefaultBilling: !!defaultBilling,
    };
  }, [addresses]);

  // Filtered addresses
  const filteredAddresses = useMemo(() => {
    if (filter === 'all') return addresses;
    if (filter === 'shipping') return addresses.filter(a => a.isShipping);
    if (filter === 'billing') return addresses.filter(a => a.isBilling);
    return addresses;
  }, [addresses, filter]);

  const openAddModal = (type?: AddressType) => {
    setFormData({...emptyFormData, type: type || 'SHIPPING'});
    setFormModal({show: true, editId: null});
  };

  const openEditModal = (address: Address) => {
    setFormData({
      type: getAddressType(address),
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company || '',
      label: address.label || '',
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      province: address.province || '',
      zip: address.zip,
      country: address.country,
      countryCode: address.countryCode || 'US',
      phone: address.phone || '',
      isDefault: address.isDefault,
    });
    setFormModal({show: true, editId: address.id});
  };

  const handleFormChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const url = formModal.editId 
        ? `/api/v1/addresses/${formModal.editId}`
        : '/api/v1/addresses';
      
      const method = formModal.editId ? 'PUT' : 'POST';
      
      // Convert type to isBilling/isShipping for backend
      const { type, ...restFormData } = formData;
      const payload = {
        ...restFormData,
        isBilling: type === 'BILLING' || type === 'BOTH',
        isShipping: type === 'SHIPPING' || type === 'BOTH',
      };
      
      const response = await accountsFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      
      setFormModal({show: false, editId: null});
      
      if (response.ok) {
        setResultModal({
          show: true, 
          message: formModal.editId ? 'Address updated successfully!' : 'Address added successfully!',
          type: 'success'
        });
        loadAddresses();
      } else {
        const error = await response.json().catch(() => ({}));
        setResultModal({show: true, message: error.message || 'Failed to save address', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to save address', type: 'error'});
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await accountsFetch(`/api/v1/addresses/${id}`, {
        method: 'DELETE',
      });
      
      setDeleteModal({show: false, id: ''});
      
      if (response.ok) {
        setResultModal({show: true, message: 'Address deleted successfully!', type: 'success'});
        loadAddresses();
      } else {
        setResultModal({show: true, message: 'Failed to delete address', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to delete address', type: 'error'});
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      const response = await accountsFetch(`/api/v1/addresses/${id}/default`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setResultModal({show: true, message: 'Default address updated!', type: 'success'});
        loadAddresses();
      } else {
        setResultModal({show: true, message: 'Failed to set default address', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to set default address', type: 'error'});
    }
  };

  const copyToClipboard = (address: Address) => {
    const text = [
      `${address.firstName} ${address.lastName}`,
      address.company,
      address.address1,
      address.address2,
      `${address.city}, ${address.province} ${address.zip}`,
      address.country,
      address.phone,
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(text);
    setResultModal({show: true, message: 'Address copied to clipboard!', type: 'success'});
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div className="spinner-apple" role="status"></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading addresses...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>
            <i className="ti ti-map-pin" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
            Saved Addresses
          </h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>Manage your shipping and billing addresses</p>
        </div>
        <div className="dropdown">
          <button className="btn-apple btn-apple-primary dropdown-toggle" data-bs-toggle="dropdown">
            <i className="ti ti-plus" style={{ marginRight: '4px' }}></i>
            Add Address
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button className="dropdown-item" onClick={() => openAddModal('SHIPPING')}>
                <i className="ti ti-truck" style={{ marginRight: '8px' }}></i>Shipping Address
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={() => openAddModal('BILLING')}>
                <i className="ti ti-file-invoice" style={{ marginRight: '8px' }}></i>Billing Address
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ height: '100%' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderRadius: '10px' }}>
                <i className="ti ti-map-pin ti-md"></i>
              </div>
              <div>
                <h3 style={{ marginBottom: 0, fontWeight: 600 }}>{stats.total}</h3>
                <small style={{ color: 'var(--text-secondary)' }}>Total Addresses</small>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ height: '100%' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderRadius: '10px' }}>
                <i className="ti ti-truck ti-md"></i>
              </div>
              <div>
                <h3 style={{ marginBottom: 0, fontWeight: 600 }}>{stats.shipping}</h3>
                <small style={{ color: 'var(--text-secondary)' }}>Shipping</small>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ height: '100%' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar" style={{ background: 'color-mix(in srgb, var(--orange) 15%, transparent)', borderRadius: '10px' }}>
                <i className="ti ti-file-invoice ti-md"></i>
              </div>
              <div>
                <h3 style={{ marginBottom: 0, fontWeight: 600 }}>{stats.billing}</h3>
                <small style={{ color: 'var(--text-secondary)' }}>Billing</small>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ height: '100%' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar" style={{ background: stats.hasDefaultShipping && stats.hasDefaultBilling ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--red) 15%, transparent)', borderRadius: '10px' }}>
                <i className="ti ti-star ti-md"></i>
              </div>
              <div>
                <h6 style={{ marginBottom: 0, fontWeight: 600 }}>
                  {stats.hasDefaultShipping && stats.hasDefaultBilling ? 'Complete' : 'Incomplete'}
                </h6>
                <small style={{ color: 'var(--text-secondary)' }}>Default Setup</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Missing Defaults Warning */}
      {(!stats.hasDefaultShipping || !stats.hasDefaultBilling) && addresses.length > 0 && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <i className="ti ti-alert-triangle ti-lg"></i>
          <div>
            <strong>Default addresses not set</strong>
            <p style={{ marginBottom: 0, fontSize: '0.85rem' }}>
              {!stats.hasDefaultShipping && 'Set a default shipping address for faster checkout. '}
              {!stats.hasDefaultBilling && 'Set a default billing address for invoicing.'}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {addresses.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'all' as AddressFilter, label: 'All', icon: 'list', count: addresses.length },
                { key: 'shipping' as AddressFilter, label: 'Shipping', icon: 'truck', count: stats.shipping },
                { key: 'billing' as AddressFilter, label: 'Billing', icon: 'file-invoice', count: stats.billing },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={filter === tab.key ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                  style={{ fontSize: '0.85rem' }}
                >
                  <i className={`ti ti-${tab.icon}`} style={{ marginRight: '4px' }}></i>
                  {tab.label}
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginLeft: '4px' }}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Addresses Grid */}
      {addresses.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="avatar avatar-xl" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderRadius: '50%', margin: '0 auto 16px' }}>
              <i className="ti ti-map-pin ti-xl"></i>
            </div>
            <h5>No addresses saved</h5>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Add shipping and billing addresses for faster checkout</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button onClick={() => openAddModal('SHIPPING')} className="btn-apple btn-apple-primary">
                <i className="ti ti-truck" style={{ marginRight: '4px' }}></i>Add Shipping Address
              </button>
              <button onClick={() => openAddModal('BILLING')} className="btn-apple btn-apple-secondary">
                <i className="ti ti-file-invoice" style={{ marginRight: '4px' }}></i>Add Billing Address
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredAddresses.map((address) => (
            <div key={address.id}>
              <div className="card" style={{ height: '100%', borderColor: address.isDefault ? 'var(--accent)' : undefined }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar avatar-sm" style={{ background: address.type === 'SHIPPING' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'color-mix(in srgb, var(--orange) 15%, transparent)', borderRadius: '8px' }}>
                      <i className={`ti ti-${address.type === 'SHIPPING' ? 'truck' : 'file-invoice'}`}></i>
                    </div>
                    <span style={{ fontWeight: 500 }}>
                      {address.type === 'SHIPPING' ? 'Shipping' : 'Billing'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {address.isDefault && (
                      <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>
                        <i className="ti ti-star-filled" style={{ marginRight: '4px' }}></i>Default
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <h6 style={{ marginBottom: '8px' }}>{address.firstName} {address.lastName}</h6>
                  {address.company && (
                    <p style={{ marginBottom: '4px', fontSize: '0.85rem', color: 'var(--accent)' }}>
                      <i className="ti ti-building" style={{ marginRight: '4px' }}></i>{address.company}
                    </p>
                  )}
                  <p style={{ marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <i className="ti ti-map-pin" style={{ marginRight: '4px' }}></i>{address.address1}
                  </p>
                  {address.address2 && (
                    <p style={{ marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '20px' }}>{address.address2}</p>
                  )}
                  <p style={{ marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p style={{ marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '20px' }}>{address.country}</p>
                  {address.phone && (
                    <p style={{ marginBottom: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <i className="ti ti-phone" style={{ marginRight: '4px' }}></i>{address.phone}
                    </p>
                  )}
                </div>
                <div className="card-footer" style={{ background: 'transparent' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      onClick={() => openEditModal(address)}
                      className="btn-apple btn-apple-secondary"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <i className="ti ti-edit" style={{ marginRight: '4px' }}></i>Edit
                    </button>
                    <button
                      onClick={() => copyToClipboard(address)}
                      className="btn-apple btn-apple-secondary"
                      style={{ fontSize: '0.85rem' }}
                      title="Copy to clipboard"
                    >
                      <i className="ti ti-copy"></i>
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => setAsDefault(address.id)}
                        className="btn-apple btn-apple-secondary"
                        style={{ fontSize: '0.85rem', color: 'var(--green)' }}
                        title="Set as default"
                      >
                        <i className="ti ti-star" style={{ marginRight: '4px' }}></i>Default
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModal({show: true, id: address.id})}
                      className="btn-apple btn-apple-secondary"
                      style={{ fontSize: '0.85rem', color: 'var(--red)', marginLeft: 'auto' }}
                      title="Delete"
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div>
            <div 
              className="card" 
              onClick={() => openAddModal()}
              style={{ cursor: 'pointer', minHeight: 200, height: '100%', border: '2px dashed var(--border)', background: 'var(--bg-secondary)' }}
            >
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div className="avatar avatar-lg" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderRadius: '50%', marginBottom: '12px' }}>
                  <i className="ti ti-plus ti-lg"></i>
                </div>
                <h6 style={{ marginBottom: '4px' }}>Add New Address</h6>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 0 }}>Shipping or billing</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Address Modal */}
      {formModal.show && (
        <div className="modal-overlay" onClick={() => setFormModal({show: false, editId: null})}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '100%' }}>
            <div className="modal-header">
              <h5 className="modal-title">
                <i className={`ti ti-${formModal.editId ? 'edit' : 'plus'}`} style={{ marginRight: '8px' }}></i>
                {formModal.editId ? 'Edit Address' : 'Add New Address'}
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setFormModal({show: false, editId: null})}
              ></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px' }}>
                {/* Address Type Selection */}
                <div className="form-group" style={{ gridColumn: 'span 12' }}>
                  <label className="form-label">Address Type</label>
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      type="button"
                      className={formData.type === 'SHIPPING' ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                      onClick={() => handleFormChange('type', 'SHIPPING')}
                      style={{ flex: 1 }}
                    >
                      <i className="ti ti-truck" style={{ marginRight: '4px' }}></i>Shipping
                    </button>
                    <button
                      type="button"
                      className={formData.type === 'BILLING' ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                      onClick={() => handleFormChange('type', 'BILLING')}
                      style={{ flex: 1 }}
                    >
                      <i className="ti ti-file-invoice" style={{ marginRight: '4px' }}></i>Billing
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 12' }}>
                  <div className="form-check">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => handleFormChange('isDefault', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="isDefault">
                      <i className="ti ti-star" style={{ marginRight: '4px', color: 'var(--orange)' }}></i>
                      Set as default {formData.type.toLowerCase()} address
                    </label>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 6' }}>
                  <label className="form-label">First Name <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 6' }}>
                  <label className="form-label">Last Name <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 12' }}>
                  <label className="form-label">
                    <i className="ti ti-building" style={{ marginRight: '4px' }}></i>Company (Optional)
                  </label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.company}
                    onChange={(e) => handleFormChange('company', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 12' }}>
                  <label className="form-label">Address Line 1 <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.address1}
                    onChange={(e) => handleFormChange('address1', e.target.value)}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 12' }}>
                  <label className="form-label">Address Line 2</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.address2}
                    onChange={(e) => handleFormChange('address2', e.target.value)}
                    placeholder="Apt, suite, unit, building, floor, etc."
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 6' }}>
                  <label className="form-label">City <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label className="form-label">State <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.state}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    placeholder="TX"
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label className="form-label">ZIP Code <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.postalCode}
                    onChange={(e) => handleFormChange('postalCode', e.target.value)}
                    placeholder="75001"
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 6' }}>
                  <label className="form-label">Country <span style={{ color: 'var(--red)' }}>*</span></label>
                  <select
                    className="form-input"
                    value={formData.country}
                    onChange={(e) => handleFormChange('country', e.target.value)}
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Mexico">Mexico</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 6' }}>
                  <label className="form-label">
                    <i className="ti ti-phone" style={{ marginRight: '4px' }}></i>Phone (Optional)
                  </label>
                  <input 
                    type="tel" 
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-apple btn-apple-secondary" 
                onClick={() => setFormModal({show: false, editId: null})}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-apple btn-apple-primary"
                onClick={handleSave}
                disabled={saving || !formData.firstName || !formData.lastName || !formData.address1 || !formData.city || !formData.state || !formData.postalCode || !formData.country}
              >
                {saving ? (
                  <>
                    <span className="spinner-apple" style={{ width: '14px', height: '14px', marginRight: '8px' }}></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className={`ti ti-${formModal.editId ? 'device-floppy' : 'plus'}`} style={{ marginRight: '4px' }}></i>
                    {formModal.editId ? 'Update Address' : 'Save Address'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <Modal
          show={deleteModal.show}
          onClose={() => setDeleteModal({show: false, id: ''})}
          onConfirm={() => handleDelete(deleteModal.id)}
          title="Delete Address"
          message="Are you sure you want to delete this address? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}

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

