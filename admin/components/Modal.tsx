'use client';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  type?: 'primary' | 'danger' | 'warning' | 'success' | 'info';
}

export default function Modal({
  show,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  type = 'primary',
}: ModalProps) {
  if (!show) return null;

  const typeClass = type === 'danger' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary';

  return (
    <div className="apple-modal-overlay" onClick={onClose}>
      <div className="apple-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="apple-modal-header">
          <h3 className="apple-modal-title">{title}</h3>
        </div>
        <div className="apple-modal-body">
          {message && <p>{message}</p>}
          {children}
        </div>
        <div className="apple-modal-footer">
          <button className="btn-apple secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={`btn-apple ${typeClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <i className="ti ti-loader-2 spin" style={{ marginRight: 6 }} /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
