import React from 'react';
import { API } from '../lib/api';

export default function useAuth(){
  const [token,setToken] = React.useState(localStorage.getItem('token')||'');
  const [me,setMe] = React.useState(null);
  const [authError, setAuthError] = React.useState(null);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationAttempts, setValidationAttempts] = React.useState(0);

  React.useEffect(()=>{
    if(!token){ 
      setMe(null); 
      setAuthError(null);
      setIsValidating(false);
      setValidationAttempts(0);
      return; 
    }
    
    setIsValidating(true);
    setAuthError(null);
    
    fetch(`${API}/api/me`, { headers:{ authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(userData => {
        setMe(userData);
        setAuthError(null);
        setValidationAttempts(0);
      })
      .catch(err => {
        console.error('Auth check failed:', err);
        setMe(null);
        setAuthError(err.message);
        
        // Only clear token after multiple failed attempts or if it's clearly invalid
        const newAttempts = validationAttempts + 1;
        setValidationAttempts(newAttempts);
        
        // Clear token only if:
        // 1. It's a 401/403 error (clearly invalid token)
        // 2. We've tried multiple times (network issues)
        if (err.message.includes('401') || err.message.includes('403') || newAttempts >= 3) {
          console.log('Clearing invalid token after', newAttempts, 'attempts');
          setToken('');
          localStorage.removeItem('token');
          setValidationAttempts(0);
        }
      })
      .finally(() => {
        setIsValidating(false);
      });
  },[token, validationAttempts]);

  return { token, setToken, me, authError, isValidating };
}
