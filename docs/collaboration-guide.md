# Collaboration Features Implementation Guide

This guide provides detailed instructions for implementing advanced collaboration features in the Amazon Collaborative Wishlist system. The current system has the foundation in place, and this guide shows how to extend it with advanced features.

## 🎯 Current State

The system currently supports:
- ✅ **Basic Invitations** - Generate invite links for wishlist access
- ✅ **View-Only Access** - Users can view shared wishlists
- ✅ **User Management** - Add/remove collaborators
- ✅ **Role-Based Access Control** - Infrastructure ready for multiple roles

## 🚀 Ready-to-Implement Features

### 1. Edit Permissions (view_edit role)

Currently, all collaborators have `view_only` access. Let's add `view_edit` permissions.

#### Database Changes

The `wishlist_access` table already supports different roles. Update the invitation system to allow role selection:

```sql
-- The table already supports these roles:
-- 'owner', 'view_only', 'view_edit', 'comment_only'
```

#### Backend Changes

**File: `apps/wishlist-service/server.js`**

Add permission checks for edit operations:

```javascript
// Add this helper function
const hasEditPermission = (userRole) => {
  return ['owner', 'view_edit'].includes(userRole);
};

// Update the add item endpoint
app.post('/wishlists/:id/items', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  
  // Check if user has edit permission
  const access = await pool.query(`
    SELECT role FROM wishlist_access 
    WHERE wishlist_id = $1 AND user_id = $2
  `, [wishlistId, uid]);
  
  if (!access.rows[0] || !hasEditPermission(access.rows[0].role)) {
    return res.status(403).json({ error: 'insufficient permissions' });
  }
  
  // ... rest of the implementation
}));

// Update the delete item endpoint
app.delete('/wishlists/:id/items/:itemId', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  
  // Check if user has edit permission
  const access = await pool.query(`
    SELECT role FROM wishlist_access 
    WHERE wishlist_id = $1 AND user_id = $2
  `, [wishlistId, uid]);
  
  if (!access.rows[0] || !hasEditPermission(access.rows[0].role)) {
    return res.status(403).json({ error: 'insufficient permissions' });
  }
  
  // ... rest of the implementation
}));
```

#### Frontend Changes

**File: `apps/web-frontend/src/components/InviteModal.jsx`**

Add role selection in the invite modal:

```javascript
const [selectedRole, setSelectedRole] = React.useState('view_only');

// Add role selection UI
<div className="role-selection">
  <label>Access Level:</label>
  <select 
    value={selectedRole} 
    onChange={(e) => setSelectedRole(e.target.value)}
  >
    <option value="view_only">View Only</option>
    <option value="view_edit">View & Edit</option>
    <option value="comment_only">Comment Only</option>
  </select>
</div>

// Update the generate function
const generate = async () => {
  try {
    setBusy(true);
    setError(null);
    const r = await fetch(`${API}/api/wishlists/${id}/invites`, {
      method: 'POST',
      headers: { 
        authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ access_type: selectedRole })
    });
    // ... rest of the implementation
  } catch (e) {
    setError(e.message || 'Failed to generate invite');
  } finally {
    setBusy(false);
  }
};
```

### 2. Comments System

The database table is already created. Let's implement the full comments system.

#### Backend Implementation

**File: `apps/wishlist-service/server.js`**

Add comment endpoints:

```javascript
// GET /wishlists/:id/items/:itemId/comments
app.get('/wishlists/:id/items/:itemId/comments', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const itemId = req.params.itemId;
  
  // Check if user has access to the wishlist
  const access = await pool.query(`
    SELECT role FROM wishlist_access 
    WHERE wishlist_id = $1 AND user_id = $2
  `, [wishlistId, uid]);
  
  if (!access.rows[0]) {
    return res.status(403).json({ error: 'access denied' });
  }
  
  const { rows } = await pool.query(`
    SELECT c.*, u.public_name as author_name
    FROM wishlist_comment c
    LEFT JOIN wishlist_access wa ON c.author_id = wa.user_id
    WHERE c.wishlist_item_id = $1 AND wa.wishlist_id = $2
    ORDER BY c.created_at ASC
  `, [itemId, wishlistId]);
  
  res.json(rows);
}));

// POST /wishlists/:id/items/:itemId/comments
app.post('/wishlists/:id/items/:itemId/comments', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const itemId = req.params.itemId;
  const { content } = req.body;
  
  // Check if user has comment permission
  const access = await pool.query(`
    SELECT role FROM wishlist_access 
    WHERE wishlist_id = $1 AND user_id = $2
  `, [wishlistId, uid]);
  
  if (!access.rows[0] || !['owner', 'view_edit', 'comment_only'].includes(access.rows[0].role)) {
    return res.status(403).json({ error: 'insufficient permissions' });
  }
  
  const { rows } = await pool.query(`
    INSERT INTO wishlist_comment (wishlist_item_id, author_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [itemId, uid, content]);
  
  res.status(201).json(rows[0]);
}));

// DELETE /wishlists/:id/items/:itemId/comments/:commentId
app.delete('/wishlists/:id/items/:itemId/comments/:commentId', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const commentId = req.params.commentId;
  
  // Check if user is the comment author or has edit permissions
  const comment = await pool.query(`
    SELECT c.*, wa.role
    FROM wishlist_comment c
    LEFT JOIN wishlist_access wa ON wa.wishlist_id = $1 AND wa.user_id = $2
    WHERE c.id = $3
  `, [wishlistId, uid, commentId]);
  
  if (!comment.rows[0]) {
    return res.status(404).json({ error: 'comment not found' });
  }
  
  const isAuthor = comment.rows[0].author_id === uid;
  const hasEditPermission = ['owner', 'view_edit'].includes(comment.rows[0].role);
  
  if (!isAuthor && !hasEditPermission) {
    return res.status(403).json({ error: 'insufficient permissions' });
  }
  
  await pool.query('DELETE FROM wishlist_comment WHERE id = $1', [commentId]);
  res.status(204).end();
}));
```

#### API Gateway Updates

**File: `apps/api-gateway/server.js`**

Add comment endpoints to the API Gateway:

```javascript
// GET /api/wishlists/:id/items/:itemId/comments
app.get('/api/wishlists/:id/items/:itemId/comments', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items/${req.params.itemId}/comments`, {
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Get comments proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// POST /api/wishlists/:id/items/:itemId/comments
app.post('/api/wishlists/:id/items/:itemId/comments', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items/${req.params.itemId}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Create comment proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// DELETE /api/wishlists/:id/items/:itemId/comments/:commentId
app.delete('/api/wishlists/:id/items/:itemId/comments/:commentId', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items/${req.params.itemId}/comments/${req.params.commentId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (response.status === 204) {
      res.status(204).end();
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Delete comment proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));
```

#### Frontend Implementation

**File: `apps/web-frontend/src/components/ItemComments.jsx`**

Create a new component for item comments:

```javascript
import React from 'react';
import { API } from '../lib/api';

export default function ItemComments({ auth, wishlistId, itemId }) {
  const [comments, setComments] = React.useState([]);
  const [newComment, setNewComment] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchComments();
  }, [wishlistId, itemId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API}/api/wishlists/${wishlistId}/items/${itemId}/comments`, {
        headers: { authorization: `Bearer ${auth.token}` }
      });
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/wishlists/${wishlistId}/items/${itemId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ content: newComment })
      });
      
      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const response = await fetch(`${API}/api/wishlists/${wishlistId}/items/${itemId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${auth.token}` }
      });
      
      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="item-comments">
      <h4>Comments</h4>
      
      <div className="add-comment">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
        />
        <button onClick={addComment} disabled={loading || !newComment.trim()}>
          {loading ? 'Adding...' : 'Add Comment'}
        </button>
      </div>
      
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <strong>{comment.author_name || 'Unknown User'}</strong>
              <span className="comment-date">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="comment-content">{comment.content}</div>
            {comment.author_id === auth.me?.id && (
              <button 
                className="delete-comment"
                onClick={() => deleteComment(comment.id)}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Real-time Updates with WebSockets

Add real-time collaboration features using WebSockets.

#### Backend WebSocket Implementation

**File: `apps/wishlist-service/websocket.js`**

Create a WebSocket server:

```javascript
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });
  
  // Store active connections by wishlist ID
  const wishlistConnections = new Map();
  
  wss.on('connection', (ws, req) => {
    // Extract JWT token from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.userId = decoded.sub;
      ws.userName = decoded.name;
    } catch (error) {
      ws.close(1008, 'Invalid token');
      return;
    }
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(ws, message);
      } catch (error) {
        console.error('Invalid message format:', error);
      }
    });
    
    ws.on('close', () => {
      removeConnection(ws);
    });
  });
  
  function handleMessage(ws, message) {
    switch (message.type) {
      case 'join_wishlist':
        joinWishlist(ws, message.wishlistId);
        break;
      case 'leave_wishlist':
        leaveWishlist(ws, message.wishlistId);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  function joinWishlist(ws, wishlistId) {
    if (!wishlistConnections.has(wishlistId)) {
      wishlistConnections.set(wishlistId, new Set());
    }
    
    wishlistConnections.get(wishlistId).add(ws);
    ws.currentWishlist = wishlistId;
    
    // Notify others that user joined
    broadcastToWishlist(wishlistId, {
      type: 'user_joined',
      userId: ws.userId,
      userName: ws.userName
    }, ws);
  }
  
  function leaveWishlist(ws, wishlistId) {
    const connections = wishlistConnections.get(wishlistId);
    if (connections) {
      connections.delete(ws);
      
      // Notify others that user left
      broadcastToWishlist(wishlistId, {
        type: 'user_left',
        userId: ws.userId,
        userName: ws.userName
      });
    }
  }
  
  function removeConnection(ws) {
    if (ws.currentWishlist) {
      leaveWishlist(ws, ws.currentWishlist);
    }
  }
  
  function broadcastToWishlist(wishlistId, message, excludeWs = null) {
    const connections = wishlistConnections.get(wishlistId);
    if (connections) {
      connections.forEach(ws => {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }
  
  // Export function to broadcast updates
  return {
    broadcastWishlistUpdate: (wishlistId, update) => {
      broadcastToWishlist(wishlistId, {
        type: 'wishlist_updated',
        update
      });
    },
    
    broadcastItemUpdate: (wishlistId, itemUpdate) => {
      broadcastToWishlist(wishlistId, {
        type: 'item_updated',
        itemUpdate
      });
    }
  };
}
```

#### Frontend WebSocket Client

**File: `apps/web-frontend/src/hooks/useWebSocket.js`**

Create a WebSocket hook:

```javascript
import { useEffect, useRef, useState } from 'react';

export function useWebSocket(url, token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      const ws = new WebSocket(`${url}?token=${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setSocket(ws);
        reconnectAttempts.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setSocket(null);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [url, token]);

  const sendMessage = (message) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    }
  };

  const joinWishlist = (wishlistId) => {
    sendMessage({ type: 'join_wishlist', wishlistId });
  };

  const leaveWishlist = (wishlistId) => {
    sendMessage({ type: 'leave_wishlist', wishlistId });
  };

  return {
    connected,
    lastMessage,
    sendMessage,
    joinWishlist,
    leaveWishlist
  };
}
```

### 4. Notification System

Add email/SMS notifications for wishlist changes.

#### Backend Notification Service

**File: `apps/wishlist-service/notifications.js`**

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendWishlistNotification(type, wishlistId, userId, data) {
  try {
    // Get wishlist collaborators
    const collaborators = await pool.query(`
      SELECT wa.user_id, u.email, u.public_name
      FROM wishlist_access wa
      LEFT JOIN wishlist w ON wa.wishlist_id = w.id
      WHERE wa.wishlist_id = $1 AND wa.user_id != $2
    `, [wishlistId, userId]);
    
    const emails = collaborators.rows.map(row => row.email).filter(Boolean);
    
    if (emails.length === 0) return;
    
    const subject = getNotificationSubject(type, data);
    const html = getNotificationHTML(type, data);
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@wishlist.com',
      to: emails,
      subject,
      html
    });
    
    console.log(`Notification sent to ${emails.length} users for ${type}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

function getNotificationSubject(type, data) {
  switch (type) {
    case 'item_added':
      return `New item added to ${data.wishlistName}`;
    case 'item_removed':
      return `Item removed from ${data.wishlistName}`;
    case 'comment_added':
      return `New comment on ${data.itemTitle}`;
    default:
      return 'Wishlist Update';
  }
}

function getNotificationHTML(type, data) {
  const baseHTML = `
    <html>
      <body>
        <h2>Wishlist Update</h2>
        <p>Hello!</p>
  `;
  
  let content = '';
  switch (type) {
    case 'item_added':
      content = `
        <p><strong>${data.userName}</strong> added a new item to <strong>${data.wishlistName}</strong>:</p>
        <p><strong>${data.itemTitle}</strong></p>
        <p><a href="${data.wishlistUrl}">View Wishlist</a></p>
      `;
      break;
    case 'item_removed':
      content = `
        <p><strong>${data.userName}</strong> removed an item from <strong>${data.wishlistName}</strong>:</p>
        <p><strong>${data.itemTitle}</strong></p>
        <p><a href="${data.wishlistUrl}">View Wishlist</a></p>
      `;
      break;
    case 'comment_added':
      content = `
        <p><strong>${data.userName}</strong> commented on <strong>${data.itemTitle}</strong>:</p>
        <p>"${data.comment}"</p>
        <p><a href="${data.wishlistUrl}">View Wishlist</a></p>
      `;
      break;
  }
  
  return baseHTML + content + `
        <p>Best regards,<br>The Wishlist Team</p>
      </body>
    </html>
  `;
}
```

## 🧪 Testing Your Implementation

### 1. Test Edit Permissions

```bash
# Create an invite with view_edit role
curl -X POST http://localhost:8080/api/wishlists/1/invites \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"access_type": "view_edit"}'

# Accept the invite as another user
curl -X POST http://localhost:8080/api/invites/<token>/accept \
  -H "Authorization: Bearer <other_user_token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Try to add an item (should work with view_edit)
curl -X POST http://localhost:8080/api/wishlists/1/items \
  -H "Authorization: Bearer <other_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "title": "Test Item", "priority": 1}'
```

### 2. Test Comments System

```bash
# Add a comment
curl -X POST http://localhost:8080/api/wishlists/1/items/1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a great item!"}'

# Get comments
curl http://localhost:8080/api/wishlists/1/items/1/comments \
  -H "Authorization: Bearer <token>"
```

### 3. Test Real-time Updates

Open multiple browser windows and make changes to see real-time updates.

## 🎯 Next Steps

1. **Implement the features** following the guide above
2. **Add comprehensive tests** for each feature
3. **Update the frontend** to use the new capabilities
4. **Add monitoring** and logging for production readiness
5. **Consider performance optimizations** like caching and rate limiting

## 🔧 Development Tips

- **Start with one feature** at a time
- **Test thoroughly** with multiple users
- **Follow the existing patterns** in the codebase
- **Add proper error handling** for all new endpoints
- **Update documentation** as you add features

This guide provides a solid foundation for implementing advanced collaboration features while maintaining the existing architecture patterns.
