// import React from 'react';
// import Tabs from './Tabs';
// import { API } from '../lib/api';

// export default function Header({auth}){
//   const users = ['alice','bob','carol','dave'];

//   const login = async (u)=>{
//     const r = await fetch(`${API}/auth/login`, {
//       method:'POST',
//       headers:{'content-type':'application/json'},
//       body: JSON.stringify({ user: u })
//     });
//     const data = await r.json();
//     if(data.accessToken){
//       localStorage.setItem('token', data.accessToken);
//       auth.setToken(data.accessToken);
//     }
//   };

//   return (
//     <div className="a-container">
//       <Tabs />
//       <div className="row mb-12 mt-12">
//         <div className="mr-auto"></div>
//         <select defaultValue="" onChange={e=>e.target.value && login(e.target.value)} className="a-input-text" style={{height:36}}>
//           <option value="">Log in as…</option>
//           {users.map(u=><option key={u} value={u}>{u}</option>)}
//         </select>
//         {auth.me && <span style={{marginLeft:8}}>Hello, <strong>{auth.me.public_name}</strong></span>}
//       </div>
//     </div>
//   );
// }


import React from 'react';
import Tabs from './Tabs';
import { API } from '../lib/api';

export default function Header({auth}){
  const users = ['alice','bob','carol','dave'];

  const login = async (u)=>{
    const r = await fetch(`${API}/auth/login`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ user: u })
    });
    const data = await r.json();
    if(data.accessToken){
      localStorage.setItem('token', data.accessToken);
      auth.setToken(data.accessToken);
    }
  };

  return (
    <div className="a-container">
      <Tabs auth={auth} />
      <div className="row mb-12 mt-12">
        <div className="mr-auto"></div>
        <select defaultValue="" onChange={e=>e.target.value && login(e.target.value)} className="a-input-text" style={{height:36}}>
          <option value="">Log in as…</option>
          {users.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
        {auth.me && <span style={{marginLeft:8}}>Hello, <strong>{auth.me.public_name}</strong></span>}
      </div>
    </div>
  );
}