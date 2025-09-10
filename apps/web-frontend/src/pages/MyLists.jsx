// import React from 'react';
// import { Link } from 'react-router-dom';
// import { API } from '../lib/api';
// import LeftNav from '../components/LeftNav';

// export default function MyLists({auth}){
//   const [lists,setLists] = React.useState([]);
//   const [name,setName] = React.useState('New List');

//   React.useEffect(()=>{
//     if(!auth.token) return;
//     fetch(`${API}/api/wishlists/mine`, { headers:{ authorization:`Bearer ${auth.token}` } })
//       .then(r=>r.json()).then(setLists);
//   },[auth.token]);

//   const createList = async ()=>{
//     const r = await fetch(`${API}/api/wishlists`, {
//       method:'POST',
//       headers:{ 'content-type':'application/json', authorization:`Bearer ${auth.token}`},
//       body: JSON.stringify({ name, privacy:'Shared' })
//     });
//     const a = await r.json();
//     setLists(prev => [...prev, a]);
//   };

//   return (
//     <div className="a-container">
//       {!auth.token && <div className="a-alert">Log in to continue.</div>}
//       {auth.token &&
//         <div className="wl-layout">
//           <LeftNav lists={lists} />
//           <div>
//             <div className="wl-header">
//               <div className="wl-titlebar">Your Lists</div>
//               <div className="wl-controls">
//                 <input className="a-input-text" value={name} onChange={e=>setName(e.target.value)} />
//                 <button className="a-button a-button-primary" onClick={createList}>Create a List</button>
//               </div>
//             </div>

//             <div className="control-bar">
//               <div className="search">
//                 <input className="a-input-text" placeholder="Search lists" />
//               </div>
//               <div className="filters">
//                 <label>Sort by:</label>
//                 <select><option>Default</option><option>Name</option><option>Created</option></select>
//               </div>
//             </div>

//             <div className="items-grid">
//               {lists.map(l=>(
//                 <div className="item-card" key={l.id}>
//                   <div className="item-title">{l.name}</div>
//                   <div className="mt-8"><span className="badge">{l.privacy}</span></div>
//                   <div className="mt-12">
//                     <Link className="a-link-normal" to={`/wishlist/${l.id}`}>Open list</Link>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>}
//     </div>
//   );
// }


import React from 'react';
import { Link } from 'react-router-dom';
import { API } from '../lib/api';
import LeftNav from '../components/LeftNav';

export default function MyLists({auth}){
  const [lists,setLists] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    if(!auth.token) {
      setLists([]);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    fetch(`${API}/api/wishlists/mine`, { headers:{ authorization:`Bearer ${auth.token}` } })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        // Ensure we always set an array, even if the response is not an array
        if (Array.isArray(data)) {
          setLists(data);
        } else {
          console.warn('API returned non-array response:', data);
          setLists([]);
        }
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch wishlists:', err);
        setError(err.message);
        setLists([]);
      })
      .finally(() => {
        setLoading(false);
      });
  },[auth.token]);

  return (
    <div className="a-container">
      {!auth.token && !auth.isValidating && <div className="a-alert">Log in to continue.</div>}
      {auth.isValidating && <div className="a-alert">Validating authentication...</div>}
      {auth.token && !auth.isValidating && (
        <div className="wl-layout">
          <LeftNav lists={lists} />
          <div>
            <div className="wl-header">
              <div className="wl-titlebar">Your Lists</div>
            </div>

            {loading && <div className="a-alert">Loading your lists...</div>}
            {error && <div className="a-alert a-alert-error">Error loading lists: {error}</div>}

            <div className="control-bar">
              <div className="search">
                <input className="a-input-text" placeholder="Search lists" />
              </div>
              <div className="filters">
                <label>Sort by:</label>
                <select><option>Default</option><option>Name</option><option>Created</option></select>
              </div>
            </div>

            <div className="items-grid">
              {!loading && !error && lists.length === 0 && (
                <div className="a-alert">You don't have any wishlists yet. Create one to get started!</div>
              )}
              {!loading && !error && lists.map(l=>(
                <div className="item-card" key={l.id}>
                  <div className="item-title">{l.name}</div>
                  <div className="mt-8"><span className="badge">{l.privacy}</span></div>
                  <div className="mt-12">
                    <Link className="a-link-normal" to={`/wishlist/${l.id}`}>Open list</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}