import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { API } from '../lib/api';
import LeftNav from '../components/LeftNav';
import AddItemModal from '../components/AddItemModal';
import InviteModal from '../components/InviteModal';
import ManagePeopleModal from '../components/ManagePeopleModal';
import AmazonItemCard from '../components/AmazonItemCard';

export default function WishlistView({auth}){
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data,setData] = React.useState(null);
  const [products,setProducts] = React.useState([]);
  const [myLists,setMyLists] = React.useState([]);
  const [friendLists,setFriendLists] = React.useState([]);
  const [showAdd,setShowAdd] = React.useState(false);
  const [showInvite,setShowInvite] = React.useState(false);
  const [showManage,setShowManage] = React.useState(false);
  const [collabs,setCollabs] = React.useState([]);
  const [isLoadingUserLists, setIsLoadingUserLists] = React.useState(true);
  
  // Track current user to force re-render when user changes
  const currentUserRef = React.useRef(auth.me?.public_name);

  // Clear data when auth token changes (user switches accounts)
  React.useEffect(() => {
    const newUser = auth.me?.public_name;
    if (currentUserRef.current !== newUser) {
      console.log('User changed from', currentUserRef.current, 'to', newUser, '- clearing all state');
      currentUserRef.current = newUser;
      
      // Force clear all state immediately
      setData(null);
      setMyLists([]);
      setFriendLists([]);
      setCollabs([]);
      setIsLoadingUserLists(true);
      
      // Force a small delay to ensure state is cleared before any new fetches
      setTimeout(() => {
        console.log('State cleared, ready for new user data');
      }, 0);
    }
  }, [auth.token, auth.me?.public_name]);

  // Fetch user's lists and redirect if needed
  React.useEffect(() => {
    if (!auth.token || !auth.me?.public_name) {
      setIsLoadingUserLists(false);
      return;
    }
    
    console.log('Fetching user lists for:', auth.me?.public_name);
    
    // Fetch both my lists and friend lists
    Promise.all([
      fetch(`${API}/api/wishlists/mine`, { headers:{ authorization:`Bearer ${auth.token}` } }).then(r=>r.json()),
      fetch(`${API}/api/wishlists/friends`, { headers:{ authorization:`Bearer ${auth.token}` } }).then(r=>r.json())
    ]).then(([myListsData, friendListsData]) => {
      console.log('Received user lists - myLists:', myListsData, 'friendLists:', friendListsData);
      setMyLists(myListsData);
      setFriendLists(friendListsData);
      
      // Check if current wishlist is accessible to this user
      const allAccessibleLists = [...myListsData, ...friendListsData];
      const currentWishlistAccessible = allAccessibleLists.some(list => list.id == id);
      console.log('Current wishlist ID:', id, 'Accessible lists:', allAccessibleLists.map(l => l.id), 'Current accessible:', currentWishlistAccessible);
      
      // If current wishlist is not accessible, redirect to user's first own wishlist
      if (!currentWishlistAccessible && myListsData.length > 0) {
        console.log('Current wishlist not accessible, redirecting to first own wishlist:', myListsData[0].id);
        navigate(`/wishlist/${myListsData[0].id}`);
        setIsLoadingUserLists(false);
        return;
      }
      
      // If user has no own wishlists but has friend lists, redirect to first friend list
      if (myListsData.length === 0 && friendListsData.length > 0) {
        console.log('No own wishlists, redirecting to first friend wishlist:', friendListsData[0].id);
        navigate(`/wishlist/friends/${friendListsData[0].id}`);
        setIsLoadingUserLists(false);
        return;
      }
      
      // If user has no accessible lists at all, redirect to a default view
      if (allAccessibleLists.length === 0) {
        console.log('No accessible wishlists, redirecting to default view');
        navigate('/wishlist');
        setIsLoadingUserLists(false);
        return;
      }
      
      // Mark user lists as loaded - now it's safe to fetch wishlist data
      console.log('User lists loaded, setting isLoadingUserLists to false');
      setIsLoadingUserLists(false);
    }).catch(err => {
      console.error('Failed to fetch user lists:', err);
      setIsLoadingUserLists(false);
    });
  }, [auth.token, auth.me?.public_name, navigate, id]);

  // Handle tab state when user changes - redirect to correct tab based on role
  
  React.useEffect(() => {
    if (!auth.token || !auth.me?.public_name || !data) return;
    
    const isFriendsRoute = location.pathname.startsWith('/wishlist/friends');
    const isOwner = data.role === 'owner';
    
    console.log('Tab state check - isFriendsRoute:', isFriendsRoute, 'isOwner:', isOwner, 'role:', data.role);
    
    // If user is not owner but we're on a non-friends route, redirect to friends route
    if (!isOwner && !isFriendsRoute) {
      console.log('User is not owner, redirecting to friends route');
      navigate(`/wishlist/friends/${id}`, { replace: true });
      return;
    }
    
    // If user is owner but we're on friends route, redirect to regular route
    if (isOwner && isFriendsRoute) {
      console.log('User is owner, redirecting to regular route');
      navigate(`/wishlist/${id}`, { replace: true });
      return;
    }
  }, [data?.role, auth.me?.public_name, location.pathname, navigate, id]);

  // Fetch wishlist data - only run if we have a user, token, and user lists are loaded
  React.useEffect(()=>{
    console.log('Wishlist data effect triggered - isLoadingUserLists:', isLoadingUserLists, 'auth.token:', !!auth.token, 'auth.me:', auth.me?.public_name);
    if(!auth.token || !auth.me?.public_name || isLoadingUserLists) {
      console.log('Skipping wishlist data fetch - conditions not met');
      return;
    }
    console.log('Fetching wishlist data for user:', auth.me?.public_name, 'wishlist ID:', id);
    
    fetch(`${API}/api/wishlists/${id}`, { headers:{ authorization:`Bearer ${auth.token}` } })
      .then(r => {
        if (!r.ok) {
          // If the user doesn't have access, clear the data
          console.log('Access denied for wishlist:', id);
          setData(null);
          throw new Error('Access denied');
        }
        return r.json();
      })
      .then(data => {
        console.log('Received wishlist data for', auth.me?.public_name, ':', data);
        setData(data);
      })
      .catch(err => {
        console.error('Failed to fetch wishlist:', err);
        setData(null);
      });
    fetch(`${API}/products`).then(r=>r.json()).then(data => setProducts(data.products || []));
  },[id,auth.token,auth.me?.public_name,isLoadingUserLists]);

  React.useEffect(()=>{
    if(!auth.token) return;
    if(!data || data.role !== 'owner') { setCollabs([]); return; }
    fetch(`${API}/api/wishlists/${id}/access`, { headers:{ authorization:`Bearer ${auth.token}` } })
      .then(async r => r.ok ? r.json() : [])
      .then(arr => Array.isArray(arr) ? arr : [])
      .then(list => {
        console.log('WishlistView loaded access:', list);
        setCollabs(list);
      })
      .catch(err=>{
        console.warn('WishlistView access load failed:', err);
        setCollabs([]);
      });
  }, [id, auth.token, data?.role]);

  React.useEffect(()=>{
    console.log('WishlistView collabs state:', collabs);
  }, [collabs]);

  const addProduct = async (p)=>{
    if(!p) return;
    const r = await fetch(`${API}/api/wishlists/${id}/items`, {
      method:'POST',
      headers:{ 'content-type':'application/json', authorization:`Bearer ${auth.token}` },
      body: JSON.stringify({ product_id: p.id, title: p.title, priority: 1 })
    });
    const item = await r.json();
    setData(d=>({...d, items:[...(d?.items||[]), {...item, product: p}]}));
  };

  const deleteItem = async (itemId) => {
    const response = await fetch(`${API}/api/wishlists/${id}/items/${itemId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${auth.token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete item');
    }
    
    // Remove the item from the local state
    setData(d => ({
      ...d,
      items: d.items.filter(item => item.id !== itemId)
    }));
  };

  if(!data || isLoadingUserLists) return <div className="a-container">Loading…</div>;

  // Simplified permissions for basic version
  const canAdd = (data.role==='owner');
  const canDelete = (data.role==='owner');

  const avatars = (collabs || [])
    .filter(c => c.role !== 'owner')
    .slice(0, 6)
    .map(c => {
      const n = c.name || c.display_name || c.user?.public_name || `User ${c.user_id}`;
      return (
        <div
          key={c.user_id}
          className="avatar"
          title={n}
          aria-label={n}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      );
    });

  // Determine which lists to show in the left sidebar
  // Always show the appropriate lists based on the current route
  const isFriendsRoute = location.pathname.startsWith('/wishlist/friends');
  const leftLists = isFriendsRoute ? friendLists : myLists;

  return (
    <div className="a-container">
      <div className="wl-layout">
        <LeftNav lists={leftLists} currentId={id} />
        <div className='wl-right'>
          <div className="wl-header">
            <div className="wl-titlebar">
              {data.wishlist.name} <span className="badge">{data.role}</span> <span className="badge">{data.wishlist.privacy}</span>
              {(data.role === 'owner' || (collabs && collabs.length)) && (
                <div className="row mt-8" style={{ gap: 6 }}>
                  <div className="avatar-stack">
                    {avatars}
                  </div>
                  {data.role==='owner' && (
                    <>
                      <button
                        className="circular-btn"
                        aria-label="Invite collaborators"
                        onClick={()=>setShowInvite(true)}
                        title="Invite collaborators"
                      >+</button>
                      <button
                        className="circular-btn"
                        aria-label="Manage people"
                        onClick={()=>setShowManage(true)}
                        title="Manage people"
                      >⋯</button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="wl-controls">
              {canAdd && <button className="a-button a-button-primary" onClick={()=>setShowAdd(true)}>Add item</button>}
            </div>
          </div>

          <div className="control-bar">
            <div className="search">
              <div className="search-wrapper">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="search-icon"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/>
                </svg>
                <input
                  className="a-input-text search-input"
                  placeholder="Search this list"
                />
              </div>
            </div>
            <div className="control-bar-separator"></div>
            <div className="filters">
              <label>Sort by:</label>
              <select defaultValue="default">
                <option value="default">Default</option>
                <option value="priority">Priority (high to low)</option>
                <option value="price-asc">Price (low to high)</option>
                <option value="price-desc">Price (high to high)</option>
              </select>
            </div>
          </div>

          <div className="items-list">
            {(data.items || []).map(it=>(
              <AmazonItemCard 
                key={it.id}
                item={it}
                auth={auth}
                wid={id}
                canDelete={canDelete}
                onDelete={deleteItem}
              />
            ))}
            <div className="end-of-list">
              <span>End of list</span>
            </div>
          </div>

          <AddItemModal
            open={showAdd}
            onClose={()=>setShowAdd(false)}
            products={products}
            onPick={addProduct}
          />

          <InviteModal
            open={showInvite}
            onClose={()=>setShowInvite(false)}
            auth={auth}
            id={id}
          />

          <ManagePeopleModal
            open={showManage}
            onClose={()=>setShowManage(false)}
            auth={auth}
            id={id}
            onChanged={()=>{
              fetch(`${API}/api/wishlists/${id}/access`, { headers:{ authorization:`Bearer ${auth.token}` } })
                .then(async r => r.ok ? r.json() : [])
                .then(arr => Array.isArray(arr) ? arr : [])
                .then(list => {
                  console.log('WishlistView refreshed access after change:', list);
                  setCollabs(list);
                })
                .catch(()=>setCollabs([]));
            }}
          />
        </div>
      </div>
    </div>
  );
}
