'use client';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning' | 'success';
}

export default function Modal({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary',
}: ModalProps) {
  if (!show) return null;

  const typeClass = type === 'danger' ? 'danger' : type === 'success' ? 'success' : 'primary';

  return (
    <div className="apple-modal-overlay" onClick={onClose}>
      <div className="apple-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apple-modal-header">
          <h3 className="apple-modal-title">{title}</h3>
        </div>
        <div className="apple-modal-body">
          <p>{message}</p>
        </div>
        <div className="apple-modal-footer">
          <button className="btn-apple secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`btn-apple ${typeClass}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
