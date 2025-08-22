import React from 'react';
import { API } from '../lib/api';

export default function useAuth(){
  const [token,setToken] = React.useState(localStorage.getItem('token')||'');
  const [me,setMe] = React.useState(null);

  React.useEffect(()=>{
    if(!token){ 
      setMe(null); 
      return; 
    }
    fetch(`${API}/api/me`, { headers:{ authorization: `Bearer ${token}` } })
      .then(r=>r.json()).then(setMe).catch(()=>setMe(null));
  },[token]);

  return { token, setToken, me };
}
