import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function LeftNav({lists = [], currentId}){
  const location = useLocation();
  const isFriendsSection = location.pathname.startsWith('/wishlist/friends');
  
  return (
    <div className="wl-left">
      <div>
        {lists.map(l=>{
          const selected = String(l.id)===String(currentId);
          // Generate the correct URL based on whether we're in the friends section
          const listUrl = isFriendsSection ? `/wishlist/friends/${l.id}` : `/wishlist/${l.id}`;
          
          return (
            <div className={`wl-list ${selected?'selected':''}`} key={l.id}>
              <Link to={listUrl}>
                <div className="wl-title">{l.name}</div>
                <div className="wl-meta">{l.privacy || l.role}</div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
