# Collaboration Service Documentation - Basic Version

## Overview

The Collaboration Service (`apps-basic/collaboration-service/server.js`) is responsible for **basic sharing and invitations** in the Amazon collaborative wishlist application (Basic Version). It handles simple wishlist sharing with view-only access, invitation management, and basic access control.

## 🏗️ Architecture Pattern

This service follows a **basic collaboration pattern** where:
- Manages wishlist sharing with view-only access
- Handles invitation creation and acceptance
- Provides simple access control (owner vs viewer)
- Integrates with other services for ownership validation

## 🔧 Key Components

### Database Connection
```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Uses PostgreSQL connection pool for database operations.

### Service Integration
```javascript
const WISHLIST_SVC_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002';
```

Connects to wishlist service for ownership validation.

### User Context Helper
```javascript
function uid(req){ return parseInt(req.headers['x-user-id']||'0',10); }
```

Extracts user ID from the `x-user-id` header (set by the API gateway).

### Error Handling & Safety Nets
```javascript
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
});
```

## 📡 API Routes

### Health Check
- `GET /health` - Returns service status and name

### Access Management
- `GET /access/mine` - Get current user's access to wishlists
- `GET /wishlists/:id/access` - List collaborators (owner only)
- `DELETE /wishlists/:id/access/:userId` - Remove collaborator (owner only)
- `PUT /wishlists/:id/access/:userId` - Update display name (owner only)

### Invitation Management
- `POST /wishlists/:id/invites` - Create invitation (view-only only)
- `GET /invites/:token` - Get invite details with enrichment (public)
- `POST /invites/:token/accept` - Accept invitation (view-only only)

## 🔐 Access Control Operations

### Get User's Access
```javascript
app.get('/access/mine', wrap(async (req,res)=>{
  const userId = uid(req);
  const { rows } = await pool.query('SELECT wishlist_id, role FROM "collab".wishlist_access WHERE user_id=$1',[userId]);
  res.json(rows);
}));
```

**Features:**
- Returns all wishlists the current user has access to
- Includes role information for each wishlist (always 'view_only' in basic version)
- Used by API gateway to determine user permissions

### List Collaborators (Owner Only)
```javascript
app.get('/wishlists/:id/access', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10);
  const ownerId = parseInt(req.headers['x-owner-id']||'0',10);
  console.log('[COLLAB] GET /wishlists/:id/access', { wid, ownerId });
  if(!ownerId) return res.status(403).json({error:'owner required'});
  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_access WHERE wishlist_id=$1',[wid]);
  console.log('[COLLAB] access rows', rows);
  res.json(rows);
}));
```

**Features:**
- Only wishlist owners can view collaborators
- Validates ownership via `x-owner-id` header
- Returns all users with access to the wishlist

### Remove Collaborator
```javascript
app.delete('/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  await pool.query('DELETE FROM "collab".wishlist_access WHERE wishlist_id=$1 AND user_id=$2',[req.params.id, req.params.userId]);
  res.status(204).end();
}));
```

Removes a user's access to a wishlist.

### Update Display Name
```javascript
app.put('/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10);
  const targetUserId = parseInt(req.params.userId,10);
  const ownerId = parseInt(req.headers['x-owner-id']||'0',10);
  const displayName = (req.body.display_name || '').trim() || null;

  if(!ownerId) return res.status(403).json({error:'owner required'});

  await pool.query('UPDATE "collab".wishlist_access SET display_name=$1 WHERE wishlist_id=$2 AND user_id=$3', [displayName, wid, targetUserId]);
  const { rows } = await pool.query(
    'SELECT wishlist_id, user_id, role, invited_by, invited_at, display_name FROM "collab".wishlist_access WHERE wishlist_id=$1 AND user_id=$2',
    [wid, targetUserId]
  );
  if (!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
}));
```

**Features:**
- Allows owners to update collaborator display names
- Returns updated access information
- No role changes allowed in basic version

## 📧 Invitation Management

### Create Invitation (View-Only Only)
```javascript
app.post('/wishlists/:id/invites', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10);
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // +72h

  const { rows } = await pool.query(
    'INSERT INTO "collab".wishlist_invite (wishlist_id, token, expires_at) VALUES ($1,$2,$3) RETURNING token, expires_at',
    [wid, token, expiresAt]
  );
  res.status(201).json(rows[0]);
}));
```

**Features:**
- Generates unique 16-character invitation token
- Sets 72-hour expiration
- All invitations are view-only (no access_type field)
- Returns token for sharing

### Get Invitation Details (with Enrichment)
```javascript
app.get('/invites/:token', wrap(async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_invite WHERE token=$1 AND expires_at > NOW()',[req.params.token]);
  if(!rows[0]) return res.status(404).json({error:'invalid or expired'});
  
  const invite = rows[0];
  const wid = invite.wishlist_id;
  
  // Get wishlist details
  let wishlist = null;
  try {
    const wishlistRes = await fetch(`${WISHLIST_SVC_URL}/wishlists/${wid}`);
    if (wishlistRes.ok) {
      wishlist = await wishlistRes.json();
    }
  } catch (e) {
    console.error('Failed to fetch wishlist details:', e);
  }
  
  // Get inviter details (wishlist owner)
  let inviter = null;
  if (wishlist) {
    try {
      const userRes = await fetch(`${process.env.USER_SVC_URL || 'http://user-service:3001'}/users/${wishlist.owner_id}`);
      if (userRes.ok) {
        inviter = await userRes.json();
      }
    } catch (e) {
      console.error('Failed to fetch inviter details:', e);
    }
  }
  
  res.json({
    ...invite,
    wishlist_name: wishlist?.name || 'Unknown Wishlist',
    inviter_name: inviter?.public_name || `User ${wishlist?.owner_id || 'Unknown'}`
  });
}));
```

**Features:**
- Public endpoint (no authentication required)
- Validates token and expiration
- Enriches invitation with wishlist and inviter details
- Graceful degradation if enrichment fails

### Accept Invitation (View-Only Only)
```javascript
app.post('/invites/:token/accept', wrap(async (req,res)=>{
  const userId = uid(req);
  const displayName = (req.body.display_name || '').trim() || null;
  console.log('[COLLAB] POST /invites/:token/accept', { token: req.params.token, userId, displayName });

  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_invite WHERE token=$1 AND expires_at > NOW()',[req.params.token]);
  if(!rows[0]) return res.status(404).json({error:'invalid or expired'});
  const wid = rows[0].wishlist_id;
  const role = 'view_only'; // All invites are view-only in basic version

  await pool.query(
    `INSERT INTO "collab".wishlist_access (wishlist_id, user_id, role, invited_by, display_name)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (wishlist_id, user_id)
     DO UPDATE SET role=EXCLUDED.role, display_name=COALESCE(EXCLUDED.display_name, "collab".wishlist_access.display_name)`,
    [wid, userId, role, userId, displayName]
  );

  console.log('[COLLAB] accepted invite -> access upserted', { wid, userId, role, displayName });
  res.json({ ok:true, wishlist_id: wid, role, display_name: displayName });
}));
```

**Features:**
- Validates invitation token and expiration
- Creates access record with 'view_only' role (fixed)
- Supports custom display names
- Handles duplicate acceptances gracefully

## 🗄️ Database Schema

### Wishlist Invite Table (`collab.wishlist_invite`)
```sql
CREATE TABLE "collab".wishlist_invite (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES "wishlist".wishlist(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Primary key, auto-incrementing
- `wishlist_id`: Foreign key to wishlist being shared
- `token`: Unique invitation token
- `expires_at`: Token expiration timestamp
- `created_at`: Invitation creation timestamp

### Wishlist Access Table (`collab.wishlist_access`)
```sql
CREATE TABLE "collab".wishlist_access (
    wishlist_id INTEGER NOT NULL REFERENCES "wishlist".wishlist(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user".user(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'view_only' CHECK (role IN ('view_only')),
    invited_by INTEGER REFERENCES "user".user(id) ON DELETE SET NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_name VARCHAR(255),
    PRIMARY KEY (wishlist_id, user_id)
);
```

**Fields:**
- `wishlist_id`: Composite primary key with user_id
- `user_id`: Composite primary key with wishlist_id
- `role`: Access role (always 'view_only' in basic version)
- `invited_by`: Foreign key to user who sent the invitation
- `invited_at`: Invitation acceptance timestamp
- `display_name`: Custom name for this user in this wishlist

## 🔄 Integration with Other Services

### API Gateway Integration
- Gateway calls collaboration endpoints for access control
- Gateway enriches access lists with user information
- Gateway combines collaboration data with wishlist data

### Wishlist Service Integration
- Checks wishlist ownership for permission validation
- Uses wishlist service API to determine ownership

### User Service Integration
- User service provides user information for invitation enrichment
- User IDs are passed via `x-user-id` header

## 🛡️ Security & Access Control

### Simple Access Control
- **view_only**: Can view items only
- **owner**: Full access to wishlist

### Permission Validation
- Validates ownership for administrative operations
- Simple access control without granular permissions
- Graceful degradation if services are unavailable

### Token Security
- Unique invitation tokens with expiration
- Secure token generation using nanoid
- Automatic cleanup of expired invitations

## 🔧 Environment Variables

- `PORT`: Service port (default: 3003)
- `DATABASE_URL`: PostgreSQL connection string
- `WISHLIST_SVC_URL`: Wishlist service URL
- `USER_SVC_URL`: User service URL (for invitation enrichment)

## 📊 Health Check

- `GET /health` - Returns service status and name

## 🎯 Key Benefits

1. **Simple Collaboration**: Basic sharing capabilities
2. **View-Only Access**: Simple permission model
3. **Invitation System**: Secure sharing with expiration
4. **Service Integration**: Seamless integration with other services
5. **Data Enrichment**: Enhanced invitation details with wishlist and user info

## 🔍 Request Flow Examples

### Create Invitation Flow
1. **Frontend** sends `POST /api/wishlists/123/invites` (owner only)
2. **API Gateway** validates ownership and forwards request
3. **Collaboration Service** generates unique token (view-only)
4. **Frontend** receives invitation token for sharing

### Accept Invitation Flow
1. **User** clicks invitation link with token
2. **Frontend** sends `POST /api/invites/token123/accept`
3. **API Gateway** validates JWT and forwards request
4. **Collaboration Service** validates token and creates view-only access
5. **User** gains view-only access to wishlist

## 📈 Performance Considerations

### Database Queries
- Efficient queries with proper indexing
- Batch operations for access management
- Optimized access retrieval

### Caching Opportunities
- User permissions could be cached
- Invitation validation could be cached
- Access lists could be cached with invalidation

### Service Resilience
- Graceful degradation when wishlist service is unavailable
- Error handling for network failures
- Retry logic for critical operations

## ❌ Features NOT Included in Basic Version

### Comments System
- No comment endpoints
- No comment functionality
- No comment-related database tables
- No comment permission checking

### Role-Based Access Control
- No role management endpoints (PATCH)
- Simplified roles: only 'owner' and 'view_only'
- No granular permission control
- No role specification during invitations

### Advanced Invitation Features
- No `access_type` field in invitations
- All invitations are view-only
- No role selection during acceptance
- No advanced invitation options 