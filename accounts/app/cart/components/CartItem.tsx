'use client';

interface CartItemData {
  id: string;
  title: string;
  variantTitle?: string;
  unitPrice: number;
  listPrice?: number;
  quantity: number;
  totalPrice: number;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <h6 style={{ fontWeight: 600, margin: '0 0 4px' }}>{item.title}</h6>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 8px' }}>{item.variantTitle}</p>
        <div>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>${item.unitPrice}</span>
          {item.listPrice > item.unitPrice && (
            <>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'line-through', marginLeft: 8 }}>${item.listPrice}</span>
              <span className="badge" style={{ background: 'var(--green)', color: '#fff', marginLeft: 8, padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>
                Save ${(item.listPrice - item.unitPrice).toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button
            className="btn-apple btn-apple-secondary"
            style={{ borderRadius: 0, minWidth: 36, height: 36, padding: 0 }}
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            -
          </button>
          <input
            type="text"
            style={{ width: 48, textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }}
            value={item.quantity}
            readOnly
          />
          <button
            className="btn-apple btn-apple-secondary"
            style={{ borderRadius: 0, minWidth: 36, height: 36, padding: 0 }}
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            +
          </button>
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        <p style={{ fontWeight: 700, margin: '0 0 8px' }}>${(item.unitPrice * item.quantity).toFixed(2)}</p>
        <button
          onClick={() => onRemove(item.id)}
          className="btn-apple btn-apple-secondary"
          style={{ color: 'var(--red)', padding: '4px 8px', fontSize: '0.85rem' }}
        >
          <i className="ti ti-trash"></i>
        </button>
      </div>
    </div>
  );
}

