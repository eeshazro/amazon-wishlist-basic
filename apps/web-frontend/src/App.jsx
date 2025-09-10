import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './amazon.css';

import useAuth from './hooks/useAuth';
import MyLists from './pages/MyLists';
import FriendsLists from './pages/FriendsLists';
import WishlistView from './pages/WishlistView';
import InviteAccept from './pages/InviteAccept';
import AmazonHeader from './components/AmazonHeader';
import AmazonFooter from './components/AmazonFooter';
import ErrorBoundary from './components/ErrorBoundary';
import { API } from './lib/api';

// Component to redirect to first wishlist
function WishlistRedirect({ auth }) {
  const [lists, setLists] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      setError(null);
      return;
    }
    
    fetch(`${API}/api/wishlists/mine`, { 
      headers: { authorization: `Bearer ${auth.token}` } 
    })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        // Ensure we always set an array
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
  }, [auth.token]);

  if (loading || auth.isValidating) {
    return <div className="a-container">Loading…</div>;
  }

  if (!auth.token && !auth.isValidating) {
    return <div className="a-container">Log in to continue.</div>;
  }

  if (error) {
    return <MyLists auth={auth} />;
  }

  // If there are lists, redirect to the first one
  if (lists.length > 0) {
    return <Navigate to={`/wishlist/${lists[0].id}`} replace />;
  }

  // If no lists, show the MyLists component (which will show empty state)
  return <MyLists auth={auth} />;
}

// Component to redirect to first friend's wishlist
function FriendsWishlistRedirect({ auth }) {
  const [lists, setLists] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      setError(null);
      return;
    }
    
    fetch(`${API}/api/wishlists/friends`, { 
      headers: { authorization: `Bearer ${auth.token}` } 
    })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        // Ensure we always set an array
        if (Array.isArray(data)) {
          setLists(data);
        } else {
          console.warn('API returned non-array response:', data);
          setLists([]);
        }
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch friends wishlists:', err);
        setError(err.message);
        setLists([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [auth.token]);

  if (loading || auth.isValidating) {
    return <div className="a-container">Loading…</div>;
  }

  if (!auth.token && !auth.isValidating) {
    return <div className="a-container">Log in to continue.</div>;
  }

  if (error) {
    return <FriendsLists auth={auth} />;
  }

  // If there are friend lists, redirect to the first one using the friends route
  if (lists.length > 0) {
    return <Navigate to={`/wishlist/friends/${lists[0].id}`} replace />;
  }

  // If no friend lists, show the FriendsLists component (which will show empty state)
  return <FriendsLists auth={auth} />;
}

export default function App(){
  const auth = useAuth();
  return (
    <ErrorBoundary>
      <AmazonHeader auth={auth} cartCount={1} />
      <main style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Routes
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Route path="/" element={<WishlistRedirect auth={auth} />} />
          <Route path="/wishlist" element={<WishlistRedirect auth={auth} />} />
          <Route path="/wishlist/friends" element={<FriendsWishlistRedirect auth={auth} />} />
          <Route path="/wishlist/friends/invite/:token" element={<FriendsLists auth={auth} />} />
          <Route path="/wishlist/:id" element={<WishlistView auth={auth} />} />
          <Route path="/wishlist/friends/:id" element={<WishlistView auth={auth} />} />
          <Route path="/invite/:token" element={<InviteAccept auth={auth} />} />
        </Routes>
      </main>
      <AmazonFooter />
    </ErrorBoundary>
  );
}
