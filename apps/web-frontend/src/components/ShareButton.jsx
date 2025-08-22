import React from 'react';
import { API } from '../lib/api';

export default function ShareButton({auth, id}){
  const [link,setLink] = React.useState(null);
  const [busy,setBusy] = React.useState(false);

  const make = async ()=>{
    setBusy(true);
    try{
      const r = await fetch(`${API}/api/wishlists/${id}/invites`, {
        method:'POST',
        headers:{ authorization:`Bearer ${auth.token}` }
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data.error || 'Failed');
      setLink(data.inviteLink);
    } finally{
      setBusy(false);
    }
  };

  return (
    <div className="invite-box">
      <button className="a-button" onClick={make} disabled={busy}>{busy?'Generating…':'Invite'}</button>
      {link && <input className="a-input-text mono" readOnly value={link} />}
    </div>
  );
}
