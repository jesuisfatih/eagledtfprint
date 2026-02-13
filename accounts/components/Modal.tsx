interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'success' | 'danger' | 'warning' | 'info';
}

const BTN_MAP: Record<string, string> = { success: 'success', danger: 'danger', warning: 'warning', info: 'primary' };

export default function Modal({ show, onClose, onConfirm, title, message, confirmText = 'OK', cancelText = 'Cancel', type = 'info' }: ModalProps) {
  if (!show) return null;
  return (
    <div className="apple-modal-overlay" onClick={onClose}>
      <div className="apple-modal" onClick={e => e.stopPropagation()}>
        <div className="apple-modal-header"><h3 className="apple-modal-title">{title}</h3></div>
        <div className="apple-modal-body"><p>{message}</p></div>
        <div className="apple-modal-footer">
          {cancelText && <button className="btn-apple secondary" onClick={onClose}>{cancelText}</button>}
          <button className={`btn-apple ${BTN_MAP[type] || 'primary'}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

