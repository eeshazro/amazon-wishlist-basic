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
import { API } from './lib/api';

// Component to redirect to first wishlist
function WishlistRedirect({ auth }) {
  const [lists, setLists] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      return;
    }
    
    fetch(`${API}/api/wishlists/mine`, { 
      headers: { authorization: `Bearer ${auth.token}` } 
    })
      .then(r => r.json())
      .then(lists => {
        setLists(lists);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [auth.token]);

  if (loading) {
    return <div className="a-container">Loading…</div>;
  }

  if (!auth.token) {
    return <div className="a-container">Log in to continue.</div>;
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

  React.useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      return;
    }
    
    fetch(`${API}/api/wishlists/friends`, { 
      headers: { authorization: `Bearer ${auth.token}` } 
    })
      .then(r => r.json())
      .then(lists => {
        setLists(lists);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [auth.token]);

  if (loading) {
    return <div className="a-container">Loading…</div>;
  }

  if (!auth.token) {
    return <div className="a-container">Log in to continue.</div>;
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
    <>
      <AmazonHeader auth={auth} cartCount={1} />
      <main style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Routes>
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
    </>
  );
}
