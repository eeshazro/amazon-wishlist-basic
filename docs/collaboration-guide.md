# Collaboration Features Implementation Guide

This guide provides detailed instructions for implementing advanced collaboration features in the Amazon Collaborative Wishlist system. The current system has the foundation in place, and this guide shows how to extend it with advanced features.

## 🎯 Current State

The system currently supports:
- ✅ **Basic Invitations** - Generate invite links for wishlist access, which are view only. When users accept an invite a they must create a unique username for that wishlist. 
- ✅ **View-Only Access** - Users can view shared wishlists, but no editing or comment
- ✅ **User Management** - Add/remove invited peoples access through a manage people modal
- ✅ **Role-Based Access Control** - Infrastructure ready for multiple roles

## 🚀 Ready-to-Implement Features

### 1. Edit Permissions (view_edit role)

Currently, all collaborators have `view_only` access. Let's add `view_edit` permissions.

#### Database Changes

The `wishlist_access` table already supports different roles. Update the invitation system to allow role selection:

```sql
-- The table already supports these roles:
-- 'view_only', 'view_edit' (owners have inherent access via wishlist.owner_id), 
```

#### Backend Changes

**File: `apps/wishlist-service/server.js`**

Add permission checks for edit operations:

```javascript
// Add this helper function
const hasEditPermission = (userRole) => {
  return ['view_edit'].includes(userRole);
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
  
  if (!access.rows[0] || !['view_edit'].includes(access.rows[0].role)) {
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
  const hasEditPermission = ['view_edit'].includes(comment.rows[0].role);
  
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


## 📋 Complete API Endpoint Documentation

This section provides comprehensive documentation for all collaboration endpoints that need to be implemented.

### Comments System Endpoints

#### 1. GET /api/wishlists/:id/items/:itemId/comments

**Request Format:**
- **HTTP Method:** GET
- **Endpoint Path:** `/api/wishlists/{id}/items/{itemId}/comments`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
  - `itemId` (integer, required): Wishlist item ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)
- **Query Parameters:** None

**Response Format:**
- **Status Codes:**
  - `200` - Success
  - `403` - Access denied (user doesn't have access to wishlist)
  - `404` - Wishlist or item not found
  - `500` - Server error

**Response JSON Schema:**
```json
[
  {
    "id": 1,
    "wishlist_item_id": 5,
    "author_id": 2,
    "content": "This looks great!",
    "created_at": "2025-01-15T10:30:00Z",
    "author_name": "Bob Smith"
  }
]
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_comment`
- **Join Tables:** `wishlist_access` (for author name lookup)
- **Business Logic:** Only return comments for items in wishlists the user has access to
- **Performance Notes:** Use index on `wishlist_item_id` and `created_at`

**Edge Cases / Validation:**
- If user has no access to wishlist → 403 Forbidden
- If wishlist doesn't exist → 404 Not Found
- If item doesn't exist in wishlist → 404 Not Found
- If no comments exist → Return empty array `[]`
- If author name lookup fails → Use `author_id` as fallback

---

#### 2. POST /api/wishlists/:id/items/:itemId/comments

**Request Format:**
- **HTTP Method:** POST
- **Endpoint Path:** `/api/wishlists/{id}/items/{itemId}/comments`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
  - `itemId` (integer, required): Wishlist item ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json` (required)
- **Body Payload:**
```json
{
  "content": "This is a great item!"
}
```

**Response Format:**
- **Status Codes:**
  - `201` - Comment created successfully
  - `400` - Bad request (missing or invalid content)
  - `403` - Insufficient permissions (user can't comment)
  - `404` - Wishlist or item not found
  - `500` - Server error

**Response JSON Schema:**
```json
{
  "id": 15,
  "wishlist_item_id": 5,
  "author_id": 2,
  "content": "This is a great item!",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_comment` (INSERT)
- **Validation Table:** `wishlist_access` (check permissions)
- **Business Logic:** Only users with `view_edit` roles can comment (owners have inherent access)
- **Performance Notes:** Use index on `wishlist_access(wishlist_id, user_id)`

**Edge Cases / Validation:**
- If content is empty or missing → 400 Bad Request
- If content exceeds 1000 characters → 400 Bad Request
- If user has `view_only` role → 403 Forbidden
- If user has no access to wishlist → 403 Forbidden
- If wishlist doesn't exist → 404 Not Found
- If item doesn't exist in wishlist → 404 Not Found

---

#### 3. DELETE /api/wishlists/:id/items/:itemId/comments/:commentId

**Request Format:**
- **HTTP Method:** DELETE
- **Endpoint Path:** `/api/wishlists/{id}/items/{itemId}/comments/{commentId}`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
  - `itemId` (integer, required): Wishlist item ID
  - `commentId` (integer, required): Comment ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)

**Response Format:**
- **Status Codes:**
  - `204` - Comment deleted successfully
  - `403` - Insufficient permissions (not author or admin)
  - `404` - Comment not found
  - `500` - Server error

**Response JSON Schema:**
- **Success:** No content (204 status)
- **Error:**
```json
{
  "error": "comment not found"
}
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_comment` (DELETE)
- **Validation Tables:** `wishlist_access` (check user role)
- **Business Logic:** Only comment author OR users with `view_edit` roles can delete (owners have inherent access)
- **Performance Notes:** Use index on `wishlist_comment(id)` and `wishlist_access(wishlist_id, user_id)`

**Edge Cases / Validation:**
- If comment doesn't exist → 404 Not Found
- If user is not the author AND doesn't have edit permissions → 403 Forbidden
- If user has no access to wishlist → 403 Forbidden
- If comment belongs to different wishlist → 404 Not Found

---

### Enhanced Invitation System Endpoints

#### 4. POST /api/wishlists/:id/invites (Enhanced)

**Request Format:**
- **HTTP Method:** POST
- **Endpoint Path:** `/api/wishlists/{id}/invites`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json` (required)
- **Body Payload:**
```json
{
  "access_type": "view_edit"
}
```

**Response Format:**
- **Status Codes:**
  - `201` - Invitation created successfully
  - `400` - Bad request (invalid access_type)
  - `403` - Only owner can create invites
  - `404` - Wishlist not found
  - `500` - Server error

**Response JSON Schema:**
```json
{
  "id": 8,
  "wishlist_id": 1,
  "token": "abc123def456ghi789",
  "expires_at": "2025-01-22T10:30:00Z",
  "created_by": 1,
  "created_at": "2025-01-15T10:30:00Z",
  "access_type": "view_edit",
  "inviteLink": "http://localhost:5173/wishlist/friends/invite/abc123def456ghi789"
}
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_invite` (INSERT)
- **Validation Table:** `wishlist` (check ownership)
- **Business Logic:** Only wishlist owner can create invites
- **Performance Notes:** Use index on `wishlist(owner_id)`

**Edge Cases / Validation:**
- If access_type is invalid → 400 Bad Request (must be: `view_only`, `view_edit`)
- If user is not the wishlist owner → 403 Forbidden
- If wishlist doesn't exist → 404 Not Found
- If token generation fails → 500 Server Error

---

#### 5. POST /api/invites/:token/accept (Enhanced)

**Request Format:**
- **HTTP Method:** POST
- **Endpoint Path:** `/api/invites/{token}/accept`
- **Path Parameters:**
  - `token` (string, required): Invitation token
- **Headers:**
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json` (required)
- **Body Payload:**
```json
{
  "display_name": "John Doe"
}
```

**Response Format:**
- **Status Codes:**
  - `201` - Invitation accepted successfully
  - `400` - Bad request (user already has access, missing display_name)
  - `404` - Invitation not found or expired
  - `500` - Server error

**Response JSON Schema:**
```json
{
  "wishlist_id": 1,
  "user_id": 3,
  "role": "view_edit",
  "display_name": "John Doe",
  "invited_by": 1,
  "invited_at": "2025-01-15T10:30:00Z"
}
```

**Data Source Guidance:**
- **Primary Tables:** `wishlist_access` (INSERT), `wishlist_invite` (DELETE after acceptance)
- **Validation Table:** `wishlist_invite` (check token validity and expiration)
- **Business Logic:** Map `access_type` from invite to appropriate `role` in access table
- **Performance Notes:** Use index on `wishlist_invite(token)`

**Edge Cases / Validation:**
- If token is invalid or expired → 404 Not Found
- If user already has access to wishlist → 400 Bad Request
- If display_name is missing → 400 Bad Request
- If display_name exceeds 255 characters → 400 Bad Request
- If access record creation fails → 500 Server Error

---

### Role Management Endpoints

#### 6. PUT /api/wishlists/:id/access/:userId (Enhanced)

**Request Format:**
- **HTTP Method:** PUT
- **Endpoint Path:** `/api/wishlists/{id}/access/{userId}`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
  - `userId` (integer, required): Target user ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json` (required)
- **Body Payload:**
```json
{
  "role": "view_edit",
  "display_name": "Updated Name"
}
```

**Response Format:**
- **Status Codes:**
  - `200` - Role updated successfully
  - `400` - Bad request (invalid role)
  - `403` - Only owner can update roles
  - `404` - Access record not found
  - `500` - Server error

**Response JSON Schema:**
```json
{
  "wishlist_id": 1,
  "user_id": 3,
  "role": "view_edit",
  "display_name": "Updated Name",
  "invited_by": 1,
  "invited_at": "2025-01-15T10:30:00Z"
}
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_access` (UPDATE)
- **Validation Table:** `wishlist` (check ownership)
- **Business Logic:** Only wishlist owner can update roles
- **Performance Notes:** Use index on `wishlist_access(wishlist_id, user_id)`

**Edge Cases / Validation:**
- If role is invalid → 400 Bad Request (must be: `view_edit`, `view_only`)
- If user is not the wishlist owner → 403 Forbidden
- If access record doesn't exist → 404 Not Found
- If display_name exceeds 255 characters → 400 Bad Request
- If trying to change owner role → 400 Bad Request (owners are not stored in access table)

---

### Enhanced Item Management Endpoints

#### 7. POST /api/wishlists/:id/items (Enhanced with Permissions)

**Request Format:**
- **HTTP Method:** POST
- **Endpoint Path:** `/api/wishlists/{id}/items`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json` (required)
- **Body Payload:**
```json
{
  "product_id": 123,
  "title": "Wireless Headphones",
  "priority": 1
}
```

**Response Format:**
- **Status Codes:**
  - `201` - Item added successfully
  - `400` - Bad request (missing required fields, duplicate item)
  - `403` - Insufficient permissions (user can't edit)
  - `404` - Wishlist not found
  - `500` - Server error

**Response JSON Schema:**
```json
{
  "id": 25,
  "product_id": 123,
  "wishlist_id": 1,
  "title": "Wireless Headphones",
  "priority": 1,
  "added_by": 2,
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_item` (INSERT)
- **Validation Table:** `wishlist_access` (check edit permissions)
- **Business Logic:** Only users with `view_edit` roles can add items (owners have inherent access)
- **Performance Notes:** Use index on `wishlist_access(wishlist_id, user_id)` and `wishlist_item(wishlist_id, product_id)`

**Edge Cases / Validation:**
- If user has `view_only` role → 403 Forbidden
- If product_id is missing → 400 Bad Request
- If title is missing or empty → 400 Bad Request
- If item already exists in wishlist → 400 Bad Request (duplicate)
- If priority is not a number → 400 Bad Request

---

#### 8. DELETE /api/wishlists/:id/items/:itemId (Enhanced with Permissions)

**Request Format:**
- **HTTP Method:** DELETE
- **Endpoint Path:** `/api/wishlists/{id}/items/{itemId}`
- **Path Parameters:**
  - `id` (integer, required): Wishlist ID
  - `itemId` (integer, required): Item ID
- **Headers:**
  - `Authorization: Bearer <token>` (required)

**Response Format:**
- **Status Codes:**
  - `204` - Item deleted successfully
  - `403` - Insufficient permissions (user can't edit)
  - `404` - Item not found
  - `500` - Server error

**Response JSON Schema:**
- **Success:** No content (204 status)
- **Error:**
```json
{
  "error": "item not found"
}
```

**Data Source Guidance:**
- **Primary Table:** `wishlist_item` (DELETE)
- **Validation Table:** `wishlist_access` (check edit permissions)
- **Business Logic:** Only users with `view_edit` roles can delete items (owners have inherent access)
- **Performance Notes:** Use index on `wishlist_access(wishlist_id, user_id)` and `wishlist_item(id, wishlist_id)`

**Edge Cases / Validation:**
- If user has `view_only` role → 403 Forbidden
- If item doesn't exist in wishlist → 404 Not Found
- If user has no access to wishlist → 403 Forbidden
- If item belongs to different wishlist → 404 Not Found

---

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
