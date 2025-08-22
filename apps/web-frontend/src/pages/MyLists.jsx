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

  React.useEffect(()=>{
    if(!auth.token) return;
    fetch(`${API}/api/wishlists/mine`, { headers:{ authorization:`Bearer ${auth.token}` } })
      .then(r=>r.json()).then(setLists);
  },[auth.token]);

  return (
    <div className="a-container">
      {!auth.token && <div className="a-alert">Log in to continue.</div>}
      {auth.token &&
        <div className="wl-layout">
          <LeftNav lists={lists} />
          <div>
            <div className="wl-header">
              <div className="wl-titlebar">Your Lists</div>
            </div>

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
              {lists.map(l=>(
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
        </div>}
    </div>
  );
}