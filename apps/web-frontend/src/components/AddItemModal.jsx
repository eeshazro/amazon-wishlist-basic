// apps/web-frontend/src/components/AddItemModal.jsx
import React from 'react';

export default function AddItemModal({ open, onClose, products = [], onPick }) {
  const [q, setQ] = React.useState('');
  const [busyId, setBusyId] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setBusyId(null);
    }
  }, [open]);

  if (!open) return null;

  const filtered = (products || []).filter(p =>
    (p.title || '').toLowerCase().includes(q.toLowerCase())
  );

  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };
  const modal = {
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    background: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,.25)',
    display: 'flex',
    flexDirection: 'column'
  };
  const header = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#f7fafa',
    borderBottom: '1px solid var(--amz-line)',
    flexShrink: 0
  };
  const content = {
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Add to list</div>
          <button className="a-button" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={content}>
          <input
            className="a-input-text"
            style={{ width: '100%', marginBottom: 12 }}
            placeholder="Search products"
            value={q}
            onChange={e => setQ(e.target.value)}
          />

          <div className="items-grid">
            {filtered.map(p => (
              <div
                key={p.id}
                className="item-card"
                role="button"
                onClick={async () => {
                  try {
                    setBusyId(p.id);
                    await onPick?.(p);
                  } finally {
                    setBusyId(null);
                    onClose?.();
                  }
                }}
                style={{ cursor: 'pointer', opacity: busyId === p.id ? 0.6 : 1 }}
              >
                <img src={p.image_url} alt={p.title} />
                <div className="item-title">{p.title}</div>
                <div className="item-price">${p.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}