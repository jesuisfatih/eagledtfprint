'use client';

import { CartSummary } from '@/components/cart/CartSummary';
import { CartOptimizer } from '@/components/cart/QuantityBreakAlert';
import { EmptyState, PageLoading } from '@/components/ui';
import { accountsFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Cart item structure as returned by API
interface CartItemData {
  id: string;
  shopifyVariantId: string;
  quantity: number;
  unitPrice: number;
  listPrice?: number;
  product?: {
    title: string;
    imageUrl?: string;
  };
  variantTitle?: string;
  sku?: string;
  quantityBreaks?: { qty: number; price: number }[];
}

interface CartData {
  id: string;
  items: CartItemData[];
}

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    try {
      const response = await accountsFetch('/api/v1/carts/active');

      if (response.ok && response.status !== 204) {
        try {
          const data = await response.json();
          setCart(data && data.id ? data : null);
        } catch (parseErr) {
          setCart(null);
        }
      } else {
        setCart(null);
      }
    } catch (err) {
      setCart(null);
    } finally {
      setLoading(false);
    }
  };

  // Types for checkout data
  interface UserData {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }

  interface AddressData {
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
  }

  const checkout = async () => {
    if (!cart || !cart.id || !cart.items || cart.items.length === 0) {
      setCheckoutError('Cart is empty');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      // Step 1: Fetch user profile and address information
      let userData: UserData | null = null;
      let addressData: AddressData | null = null;

      try {
        // Get user profile
        const userResponse = await accountsFetch('/api/v1/company-users/me');

        if (userResponse.ok) {
          userData = await userResponse.json();
        }

        // Get user addresses (try to get default or first address)
        try {
          const addressResponse = await accountsFetch('/api/v1/addresses');

          if (addressResponse.ok) {
            const addresses: AddressData[] = await addressResponse.json();
            // Get default address or first address
            addressData = addresses.find(addr => addr.isDefault) || addresses[0] || null;
          }
        } catch (addrErr) {
          console.warn('Address fetch failed:', addrErr);
        }
      } catch (userErr) {
        console.warn('User data fetch failed:', userErr);
      }

      // Step 2: Store user data in localStorage for checkout autofill
      if (userData || addressData) {
        const checkoutData = {
          email: userData?.email || localStorage.getItem('eagle_userEmail') || '',
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          phone: userData?.phone || '',
          address1: addressData?.address1 || addressData?.street || '',
          address2: addressData?.address2 || '',
          city: addressData?.city || '',
          state: addressData?.state || addressData?.province || '',
          zip: addressData?.postalCode || addressData?.zip || '',
          country: addressData?.country || 'US',
          timestamp: Date.now(), // For cleanup
        };

        // Store in localStorage with a unique key
        localStorage.setItem('eagle_checkout_autofill', JSON.stringify(checkoutData));

        // Also store in sessionStorage as backup
        sessionStorage.setItem('eagle_checkout_autofill', JSON.stringify(checkoutData));
      }

      // Step 3: Get shop domain from company data
      const companyId = localStorage.getItem('eagle_companyId') || '';
      let shopDomain = '';

      try {
        const companyResponse = await accountsFetch(`/api/v1/companies/${companyId}`);
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          shopDomain = companyData.merchant?.shopDomain || '';
        }
      } catch (e) {
        console.error('Failed to get shop domain:', e);
      }

      if (!shopDomain) {
        throw new Error('Shop domain not found');
      }

      const shopUrl = `https://${shopDomain}`;

      // Build Shopify cart URL with all items
      // Format: /cart/variant_id:quantity,variant_id:quantity
      const cartItems = cart.items.map((item: CartItemData) => {
        const shopifyVarId = item.shopifyVariantId || item.variantId || item.id || '';
        return `${shopifyVarId}:${item.quantity}`;
      }).join(',');

      // Build the full cart URL that will add items and redirect to checkout
      let cartUrl = `${shopUrl}/cart/${cartItems}`;

      // Step 4: Get checkout URL with SSO and discount from backend
      let checkoutUrl = '';
      let ssoUrl: string | null = null;

      try {
        const userId = localStorage.getItem('eagle_userId') || '';
        const checkoutResponse = await accountsFetch('/api/v1/checkout/create', {
          method: 'POST',
          body: JSON.stringify({
            cartId: cart.id,
            userId: userId || undefined,
          }),
        });

        if (checkoutResponse.ok) {
          const checkoutData = await checkoutResponse.json();
          checkoutUrl = checkoutData.checkoutUrl || '';

          // If SSO URL is provided, use it first
          if (checkoutData.ssoUrl) {
            ssoUrl = checkoutData.ssoUrl;
          }

          // Add discount to URL if available
          if (checkoutData.discountCode && checkoutUrl) {
            const urlObj = new URL(checkoutUrl);
            urlObj.searchParams.set('discount', checkoutData.discountCode);
            checkoutUrl = urlObj.toString();
          }
        }
      } catch (checkoutErr) {
        console.warn('Checkout creation failed:', checkoutErr);
      }

      // Step 5: If no checkout URL from backend, use cart URL that adds items and goes to checkout
      if (!checkoutUrl) {
        // Get discount code from backend if available
        let discountParam = '';
        try {
          const discountResponse = await accountsFetch('/api/v1/checkout/create', {
            method: 'POST',
            body: JSON.stringify({ cartId: cart.id }),
          });

          if (discountResponse.ok) {
            const discountData = await discountResponse.json();
            if (discountData.discountCode) {
              discountParam = `discount=${discountData.discountCode}`;
            }
          }
        } catch (discountErr) {
          console.warn('Discount code fetch failed:', discountErr);
        }

        // Build checkout URL with customer info pre-filled
        // Shopify supports these query parameters for pre-filling checkout
        const checkoutParams = new URLSearchParams();

        // Add discount if available
        if (discountParam) {
          checkoutParams.set('discount', discountParam.replace('discount=', ''));
        }

        // Pre-fill customer email
        if (userData?.email) {
          checkoutParams.set('checkout[email]', userData.email);
        }

        // Pre-fill shipping address
        if (userData?.firstName) {
          checkoutParams.set('checkout[shipping_address][first_name]', userData.firstName);
        }
        if (userData?.lastName) {
          checkoutParams.set('checkout[shipping_address][last_name]', userData.lastName);
        }
        if (userData?.phone) {
          checkoutParams.set('checkout[shipping_address][phone]', userData.phone);
        }

        // Address fields from addressData
        if (addressData?.address1 || addressData?.street) {
          checkoutParams.set('checkout[shipping_address][address1]', addressData.address1 || addressData.street || '');
        }
        if (addressData?.address2) {
          checkoutParams.set('checkout[shipping_address][address2]', addressData.address2);
        }
        if (addressData?.city) {
          checkoutParams.set('checkout[shipping_address][city]', addressData.city);
        }
        if (addressData?.state || addressData?.province) {
          checkoutParams.set('checkout[shipping_address][province]', addressData.state || addressData.province || '');
        }
        if (addressData?.postalCode || addressData?.zip) {
          checkoutParams.set('checkout[shipping_address][zip]', addressData.postalCode || addressData.zip || '');
        }
        if (addressData?.country) {
          checkoutParams.set('checkout[shipping_address][country]', addressData.country);
        }

        // Use cart URL format: /cart/variant:qty,variant:qty?checkout[email]=...
        const queryString = checkoutParams.toString();
        checkoutUrl = `${cartUrl}${queryString ? '?' + queryString : ''}`;
      }

      // Step 6: Set cookies for autofill (Shopify reads these)
      // Shopify checkout reads certain cookies for autofill
      if (userData || addressData) {
        const domain = config.cookieDomain; // Cross-subdomain cookie

        // Set customer email cookie (Shopify reads this)
        if (userData?.email) {
          document.cookie = `customer_email=${encodeURIComponent(userData.email)}; domain=${domain}; path=/; max-age=3600; SameSite=Lax`;
        }

        // Set customer info in localStorage for snippet autofill
        const checkoutData = {
          email: userData?.email || localStorage.getItem('eagle_userEmail') || '',
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          phone: userData?.phone || '',
          address1: addressData?.address1 || addressData?.street || '',
          address2: addressData?.address2 || '',
          city: addressData?.city || '',
          state: addressData?.state || addressData?.province || '',
          zip: addressData?.postalCode || addressData?.zip || '',
          country: addressData?.country || 'US',
          timestamp: Date.now(),
        };

        localStorage.setItem('eagle_checkout_autofill', JSON.stringify(checkoutData));
        sessionStorage.setItem('eagle_checkout_autofill', JSON.stringify(checkoutData));
      }

      // Step 7: Redirect to SSO first (if available), then checkout
      if (ssoUrl) {
        // Update SSO return_to with checkout URL
        const ssoUrlObj = new URL(ssoUrl);
        ssoUrlObj.searchParams.set('return_to', checkoutUrl);

        console.log('🦅 Redirecting to SSO first, then checkout');
        window.location.href = ssoUrlObj.toString();
      } else {
        // Direct checkout redirect
        console.log('🦅 Redirecting to checkout');
        window.location.href = checkoutUrl;
      }

    } catch (err) {
      console.error('Checkout error:', err);

      // Fallback: Use cart URL format - need to get shopDomain again
      const companyId = localStorage.getItem('eagle_companyId') || '';
      let fallbackShopDomain = '';
      try {
        const companyResponse = await accountsFetch(`/api/v1/companies/${companyId}`);
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          fallbackShopDomain = companyData.merchant?.shopDomain || '';
        }
      } catch (e) {
        console.error('Fallback shop domain fetch failed:', e);
      }

      const cartItems = cart.items.map((item: CartItemData) =>
        `${item.shopifyVariantId}:${item.quantity}`
      ).join(',');

      if (cartItems && fallbackShopDomain) {
        window.location.href = `https://${fallbackShopDomain}/cart/${cartItems}`;
      } else {
        setCheckoutLoading(false);
        setCheckoutError('Failed to proceed to checkout. Please check your connection and try again.');
      }
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!cart) return;

    try {
      const response = await accountsFetch(`/api/v1/carts/${cart.id}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });

      if (response.ok) {
        loadCart();
      }
    } catch (err) {
      console.error('Update quantity error:', err);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!cart) return;
    try {
      await accountsFetch(`/api/v1/carts/${cart.id}/items/${itemId}`, {
        method: 'DELETE',
      });
      loadCart();
    } catch (err) {
      console.error(err);
    }
  };

  const createCart = async () => {
    try {
      const merchantId = localStorage.getItem('eagle_merchantId') || '';
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const userId = localStorage.getItem('eagle_userId') || '';

      if (!merchantId) {
        alert('Merchant not found. Please login again.');
        return;
      }

      const response = await accountsFetch('/api/v1/carts', {
        method: 'POST',
        body: JSON.stringify({ merchantId, companyId, createdByUserId: userId }),
      });

      if (response.ok) {
        loadCart();
      }
    } catch (err) {
      console.error('Create cart error:', err);
    }
  };

  const subtotal = cart?.items?.reduce((sum: number, item: CartItemData) =>
    sum + (item.unitPrice * item.quantity), 0) || 0;

  // Calculate list total (original prices before B2B discount)
  const listTotal = cart?.items?.reduce((sum: number, item: CartItemData) =>
    sum + ((item.listPrice || item.unitPrice) * item.quantity), 0) || 0;

  // Calculate savings
  const totalSavings = listTotal - subtotal;

  if (loading) {
    return <PageLoading text="Loading your cart..." />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22, margin: '0 0 4px' }}>Shopping Cart</h2>
          {cart && cart.items?.length > 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
              {cart.items.length} item{cart.items.length !== 1 ? 's' : ''} in your cart
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!cart && (
            <button onClick={createCart} className="btn-apple btn-apple-primary" style={{ height: 36, fontSize: 13 }}>
              <i className="ti ti-plus" style={{ marginRight: 6 }}></i>Create Cart
            </button>
          )}
          <Link href="/products" className="btn-apple btn-apple-secondary" style={{ height: 36, fontSize: 13, textDecoration: 'none' }}>
            <i className="ti ti-arrow-left" style={{ marginRight: 6 }}></i>
            Continue Shopping
          </Link>
        </div>
      </div>

      {!cart || cart.items?.length === 0 ? (
        <EmptyState
          icon="ti-shopping-cart-off"
          title="Your cart is empty"
          description="Browse our products and add items to your cart"
          action={{
            label: 'Browse Products',
            onClick: () => window.location.href = '/products',
          }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Cart Items Column */}
          <div>
            {/* Savings Optimizer */}
            <CartOptimizer
              items={cart.items.map(item => ({
                id: item.id,
                title: item.product?.title || 'Product',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                quantityBreaks: item.quantityBreaks,
              }))}
              onUpdateQuantity={(itemId, newQty) => updateQuantity(itemId, newQty)}
            />

            {/* Cart Items */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Cart Items</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {cart.items?.map((item: CartItemData, idx: number) => (
                  <div key={item.id} className="cart-item" style={{ padding: 16, borderBottom: idx < cart.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Product Image */}
                      <img
                        src={item.product?.imageUrl || '/placeholder.png'}
                        alt={item.product?.title || 'Product'}
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />

                      {/* Product Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{item.product?.title || 'Product'}</h4>
                        {item.variantTitle && <span style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'block' }}>{item.variantTitle}</span>}
                        {item.sku && <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block' }}>SKU: {item.sku}</span>}
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(item.unitPrice)}</span>
                          {item.listPrice && item.listPrice > item.unitPrice && (
                            <>
                              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>{formatCurrency(item.listPrice)}</span>
                              <span className="badge" style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--green)', fontSize: 11 }}>B2B</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="qty-control" style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          style={{ width: 36, height: 36, background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <i className="ti ti-minus" style={{ fontSize: 14 }}></i>
                        </button>
                        <span style={{ width: 44, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ width: 36, height: 36, background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <i className="ti ti-plus" style={{ fontSize: 14 }}></i>
                        </button>
                      </div>

                      {/* Item Total */}
                      <div style={{ textAlign: 'right', minWidth: 90, flexShrink: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{formatCurrency(item.unitPrice * item.quantity)}</div>
                        {item.listPrice && item.listPrice > item.unitPrice && (
                          <span style={{ fontSize: 12, color: 'var(--green)' }}>
                            Save {formatCurrency((item.listPrice - item.unitPrice) * item.quantity)}
                          </span>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                        style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart Summary Column */}
          <div>
            <CartSummary
              items={cart.items.map(item => ({
                id: item.id,
                title: item.product?.title || 'Product',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                listPrice: item.listPrice,
              }))}
              subtotal={subtotal}
              listTotal={listTotal > subtotal ? listTotal : undefined}
              total={subtotal}
              savings={totalSavings}
              onCheckout={checkout}
              checkoutLoading={checkoutLoading}
              disabled={!cart || cart.items.length === 0}
            />
            {/* Checkout Error */}
            {checkoutError && (
              <div className="alert alert-error" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle"></i>
                <span style={{ flex: 1 }}>{checkoutError}</span>
                <button onClick={() => setCheckoutError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <i className="ti ti-x"></i>
                </button>
              </div>
            )}
            {/* Trust Badges */}
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                  <i className="ti ti-lock" style={{ marginRight: 4 }}></i>
                  Secure checkout powered by Shopify
                </p>
                <p style={{ fontSize: 13, color: 'var(--green)', margin: 0 }}>
                  <i className="ti ti-check" style={{ marginRight: 4 }}></i>
                  Your B2B discount will be applied automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
