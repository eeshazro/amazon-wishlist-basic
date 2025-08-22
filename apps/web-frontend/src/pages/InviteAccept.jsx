import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../lib/api';

export default function InviteAccept({auth}){
  const { token } = useParams();
  const [invite,setInvite] = React.useState(null);
  const [error,setError] = React.useState(null);
  const [busy,setBusy] = React.useState(false);
  const [name,setName] = React.useState('');
  const nav = useNavigate();

  React.useEffect(()=>{
    let cancelled = false;
    (async () => {
      setError(null);
      setInvite(null);
      try{
        const r = await fetch(`${API}/api/invites/${token}`);
        const ct = r.headers.get('content-type') || '';
        const payload = ct.includes('application/json') ? await r.json() : { error: (await r.text()) };
        if(!r.ok) throw new Error(payload?.error || 'Invalid or expired invite');
        if(!cancelled) setInvite(payload);
      }catch(e){
        if(!cancelled) setError(e.message || 'Failed to load invite');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const accept = async ()=>{
    if(!name.trim()){ setError('Please enter a name to display on this wishlist'); return; }
    try{
      setBusy(true);
      setError(null);
      const r = await fetch(`${API}/api/invites/${token}/accept`, {
        method:'POST',
        headers:{ 'content-type':'application/json', authorization:`Bearer ${auth.token}` },
        body: JSON.stringify({ display_name: name.trim() })
      });
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : { error: (await r.text()) };
      if(!r.ok) throw new Error(data.error || 'Failed to accept');
      nav(`/wishlist/${data.wishlist_id}`);
    }catch(e){
      setError(e.message || 'Failed to accept');
    }finally{
      setBusy(false);
    }
  };

  return (
    <div className="a-container">
      <div className="wl-header">
        <div className="wl-titlebar">Invite</div>
      </div>
      {error && <div className="a-alert">Error: {error}</div>}
      {!invite && !error && <p>Loading invitation...</p>}
      {invite && (
        <div className="invite-box mt-12" style={{ 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '20px', 
          maxWidth: '500px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div className="invite-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#ffa41c"/>
              <path d="M19 15L19.74 17.74L22.5 18.5L19.74 19.26L19 22L18.26 19.26L15.5 18.5L18.26 17.74L19 15Z" fill="#ffa41c"/>
              <path d="M5 6L5.5 7.5L7 8L5.5 8.5L5 10L4.5 8.5L3 8L4.5 7.5L5 6Z" fill="#ffa41c"/>
            </svg>
          </div>
          <div className="invite-info">
            <h2 className="invite-title">
              {invite.inviter_name} is inviting you to view their wishlist "{invite.wishlist_name}"
            </h2>
            <p className="invite-description">
              You'll be able to view items in this wishlist.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '300px' }}>
            <input
              className="a-input-text"
              placeholder="Your name for this wishlist"
              value={name}
              onChange={e=>setName(e.target.value)}
              style={{ width: '100%' }}
            />
            {auth.token ? (
              <button 
                className="a-button a-button-primary" 
                disabled={busy} 
                onClick={accept}
                style={{ width: '100%' }}
              >
                {busy ? 'Accepting…' : 'Accept Invite'}
              </button>
            ) : (
              <span className="a-muted">Log in to accept.</span>
            )}
          </div>
        </div>)}
    </div>
  );
}