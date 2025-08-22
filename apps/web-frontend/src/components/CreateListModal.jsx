import React from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../lib/api';

export default function CreateListModal({ open, onClose, auth, onListCreated }) {
  const [name, setName] = React.useState('Shopping List');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const navigate = useNavigate();

  React.useEffect(()=>{
    if(open){
      setName('Shopping List');
      setBusy(false);
      setError(null);
    }
  },[open]);

  if (!open) return null;

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
    width: '560px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    background: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,.25)'
  };
  const header = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#f7fafa',
    borderBottom: '1px solid var(--amz-line)'
  };
  const content = {
    padding: '16px'
  };

  const create = async ()=>{
    if(!auth?.token) return;
    const nm = (name || '').trim();
    if(!nm){ setError('List name is required'); return; }
    try{
      setBusy(true);
      setError(null);
      const r = await fetch(`${API}/api/wishlists`, {
        method:'POST',
        headers:{ 'content-type':'application/json', authorization:`Bearer ${auth.token}` },
        body: JSON.stringify({ name: nm, privacy: 'Private' })
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data?.error || 'Failed to create list');
      
      // Call the callback to refresh lists
      if (onListCreated) {
        onListCreated(data);
      }
      
      onClose?.();
      navigate('/wishlist', { replace: true });
    }catch(e){
      setError(e.message || 'Failed to create list');
    }finally{
      setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e=>e.stopPropagation()}>
        <div style={header}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Create a new list or registry</div>
          <button className="a-button" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={content}>
          <div className="mb-12">
            <label className="a-text-bold" htmlFor="clm_name">List name (required)</label>
            <input id="clm_name" className="a-input-text" value={name} onChange={e=>setName(e.target.value)} />
            <div className="a-muted" style={{ marginTop: 6 }}>
              Use lists to save items for later. All lists are private unless you share them with others.
            </div>
          </div>

          {error && <div className="a-alert mb-12">Error: {error}</div>}

          <div className="row" style={{ justifyContent:'flex-end', gap: 8 }}>
            <button className="a-button" onClick={onClose}>Cancel</button>
            <button className="a-button a-button-primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}