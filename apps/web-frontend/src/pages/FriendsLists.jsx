import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API } from '../lib/api';
import LeftNav from '../components/LeftNav';

export default function FriendsLists({auth}){
  const { token } = useParams();
  const navigate = useNavigate();
  const [lists,setLists] = React.useState([]);
  const [invite, setInvite] = React.useState(null);
  const [inviteError, setInviteError] = React.useState(null);
  const [inviteBusy, setInviteBusy] = React.useState(false);
  const [inviteName, setInviteName] = React.useState('');

  React.useEffect(()=>{
    if(!auth.token) return;
    fetch(`${API}/api/wishlists/friends`, { headers:{ authorization:`Bearer ${auth.token}` } })
      .then(r=>r.json()).then(setLists);
  },[auth.token]);

  // Fetch invite data if token is present
  React.useEffect(() => {
    if (!token) return;
    
    setInviteError(null);
    setInvite(null);
    
    fetch(`${API}/api/invites/${token}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || 'Failed to load invite');
        return r.json();
      })
      .then(setInvite)
      .catch(e => setInviteError(e.message));
  }, [token]);

  const acceptInvite = async () => {
    if (!inviteName.trim()) {
      setInviteError('Please enter a name to display on this wishlist');
      return;
    }
    
    setInviteBusy(true);
    setInviteError(null);
    
    try {
      const r = await fetch(`${API}/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 
          'content-type': 'application/json', 
          authorization: `Bearer ${auth.token}` 
        },
        body: JSON.stringify({ display_name: inviteName.trim() })
      });
      
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to accept');
      
      // Navigate to the friends section and refresh the lists
      navigate('/wishlist/friends');
      // Refresh the friends lists to show the newly accepted wishlist
      fetch(`${API}/api/wishlists/friends`, { headers:{ authorization:`Bearer ${auth.token}` } })
        .then(r=>r.json()).then(setLists);
    } catch (e) {
      setInviteError(e.message || 'Failed to accept');
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="a-container">
      <div className="wl-layout">
        <div className="wl-left">
          <div className="wl-section">
            <div className="wl-section-title">Your Friends' Lists</div>
            {lists.map(l=>(
              <div className="wl-list" key={l.id}>
                <Link to={`/wishlist/friends/${l.id}`}>
                  <div className="wl-title">{l.name}</div>
                  <div className="wl-meta">{l.role}</div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <div className="wl-header">
            <div className="wl-titlebar">
              {token ? 'Invitation' : 'Your Friends'}
            </div>
          </div>
          
          {token ? (
            // Show centered invitation on the right side
            <div className="invite-content">
              {inviteError && <div className="a-alert">Error: {inviteError}</div>}
              {!invite && !inviteError && <p>Loading invitation...</p>}
              {invite && (
                <div className="invite-box" style={{ 
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
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      style={{ width: '100%' }}
                    />
                    {auth.token ? (
                      <button 
                        className="a-button a-button-primary" 
                        disabled={inviteBusy} 
                        onClick={acceptInvite}
                        style={{ width: '100%' }}
                      >
                        {inviteBusy ? 'Accepting…' : 'Accept Invite'}
                      </button>
                    ) : (
                      <span className="a-muted">Log in to accept.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Show friends lists grid
            <div className="items-grid">
              {lists.map(l=>(
                <div className="item-card" key={l.id}>
                  <div className="item-title">{l.name}</div>
                  <div className="mt-8"><span className="badge">{l.role}</span></div>
                  <div className="mt-12">
                    <Link className="a-link-normal" to={`/wishlist/friends/${l.id}`}>Open list</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
