// import React from 'react';
// import { Link, useLocation } from 'react-router-dom';

// export default function Tabs(){
//   const loc = useLocation();
//   const isMine = loc.pathname.startsWith('/wishlist') && !loc.pathname.startsWith('/wishlist/friends');
//   const isFriends = loc.pathname.startsWith('/wishlist/friends');
//   return (
//     <ul className="a-tabs" role="tablist">
//       <li className={`a-tab-heading ${isMine ? 'a-active' : ''}`} role="presentation">
//         <Link to="/wishlist" role="tab" aria-selected={isMine ? 'true':'false'}>
//           <div role="heading" aria-level="1">Your Lists</div>
//         </Link>
//       </li>
//       <li className={`a-tab-heading ${isFriends ? 'a-active' : ''}`} role="presentation">
//         <Link to="/wishlist/friends" role="tab" aria-selected={isFriends ? 'true':'false'}>Your Friends</Link>
//       </li>
//       <div className="a-text-right" style={{marginLeft:'auto'}}>
//         <Link className="a-link-normal" to="https://www.amazon.com/gp/help/customer/display.html?nodeId=897204" target="_blank">List help</Link>
//       </div>
//     </ul>
//   );
// }

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import CreateListModal from './CreateListModal';

export default function Tabs({auth}){
  const loc = useLocation();
  // Updated logic to properly detect friend wishlists
  const isFriends = loc.pathname.startsWith('/wishlist/friends');
  const isMine = loc.pathname.startsWith('/wishlist') && !isFriends;
  const [showCreate, setShowCreate] = React.useState(false);

  return (
    <>
      <ul className="a-tabs" role="tablist">
        <li className={`a-tab-heading ${isMine ? 'a-active' : ''}`} role="presentation">
          <Link to="/wishlist" role="tab" aria-selected={isMine ? 'true':'false'}>
            <div role="heading" aria-level="1">Your Lists</div>
          </Link>
        </li>
        <li className={`a-tab-heading ${isFriends ? 'a-active' : ''}`} role="presentation">
          <Link to="/wishlist/friends" role="tab" aria-selected={isFriends ? 'true':'false'}>Your Friends</Link>
        </li>
        <div className="a-text-right" style={{marginLeft:'auto', display:'flex', gap:16, alignItems:'center'}}>
          <Link className="a-link-normal" onClick={()=>setShowCreate(true)} aria-haspopup="dialog">Create a List</Link>
          <Link className="a-link-normal" to="https://www.amazon.com/gp/help/customer/display.html?nodeId=897204" target="_blank">List help</Link>
        </div>
      </ul>

      <CreateListModal open={showCreate} onClose={()=>setShowCreate(false)} auth={auth} />
    </>
  );
}