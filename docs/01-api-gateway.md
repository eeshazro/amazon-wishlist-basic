# API Gateway Documentation - Basic Version

## Overview

The API Gateway (`apps-basic/api-gateway/server.js`) serves as the **central entry point** for all client requests in the Amazon collaborative wishlist application (Basic Version). It implements a **reverse proxy pattern** that routes requests to appropriate backend microservices, combines responses, and handles authentication.

## 🏗️ Architecture Pattern

This follows a **microservices architecture** where the API gateway:
- Receives all client requests from the web frontend
- Routes them to the appropriate backend services
- Combines responses from multiple services
- Handles authentication and authorization centrally
- Provides data enrichment by combining information from multiple sources

## 🔧 Key Components

### Service Configuration
```javascript
const USER_URL = process.env.USER_SVC_URL || 'http://user-service:3001';
const WISHLIST_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002';
const COLLAB_URL = process.env.COLLAB_SVC_URL || 'http://collaboration-service:3003';
```

The gateway connects to three microservices:
- **User Service** (Port 3001): Handles user authentication and profiles
- **Wishlist Service** (Port 3002): Manages wishlists and items
- **Collaboration Service** (Port 3003): Handles basic sharing and invitations

### Authentication Middleware
```javascript
function auth(req,res,next){
  if (req.path.startsWith('/products')) return next();          // public
  if (req.path.startsWith('/auth/login')) return next();        // public
  if (req.method === 'GET' && req.path.startsWith('/api/invites/')) return next(); // public preview

  const auth = req.headers.authorization||'';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if(!token) return res.status(401).json({error:'missing token'});
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name };
    return next();
  }catch(e){ return res.status(401).json({error:'invalid token'}); }
}
```

**Features:**
- Allows public access to products and login endpoints
- Validates JWT tokens for protected routes
- Extracts user information from tokens and attaches to request object
- Supports public invite previews without authentication

### HTTP Helper Functions
```javascript
async function jget(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    const t = await r.text();
    const e = new Error(t || r.statusText);
    e.status = r.status;
    throw e;
  }
  return r.json();
}
async function jpost(url, body, opts = {}) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    const e = new Error(t || r.statusText);
    e.status = r.status;
    throw e;
  }
  return r.json();
}
async function jdel(url, opts = {}) {
  const r = await fetch(url, { method: 'DELETE', headers: (opts.headers || {}) });
  if (!r.ok && r.status !== 204) {
    const t = await r.text();
    const e = new Error(t || r.statusText);
    e.status = r.status;
    throw e;
  }
  return true;
}
```

These wrapper functions:
- Make HTTP requests to backend services
- Handle errors consistently
- Preserve HTTP status codes from downstream services
- Provide proper error messages

## 📡 API Routes

### Public Routes (No Authentication Required)

#### Products
- `GET /products` - Returns all products from local JSON file
- `GET /products/:id` - Returns specific product by ID

#### Authentication
- `POST /auth/login` - Proxies login request to user service

### Protected Routes (Require JWT Authentication)

#### User Management
- `GET /api/me` - Get current user profile

#### Wishlist Management
- `GET /api/wishlists/mine` - Get user's own wishlists
- `GET /api/wishlists/friends` - Get wishlists shared with user
- `GET /api/wishlists/:id` - Get specific wishlist with items and role
- `POST /api/wishlists` - Create new wishlist
- `POST /api/wishlists/:id/items` - Add item to wishlist
- `DELETE /api/wishlists/:id/items/:itemId` - Remove item from wishlist

#### Collaboration & Sharing (Basic)
- `GET /api/wishlists/:id/access` - List collaborators (owner only)
- `DELETE /api/wishlists/:id/access/:userId` - Remove collaborator (owner only)
- `PUT /api/wishlists/:id/access/:userId` - Update display name (owner only)
- `POST /api/wishlists/:id/invites` - Create invitation (view-only only)
- `GET /api/invites/:token` - Get invite details (public)
- `POST /api/invites/:token/accept` - Accept invitation

## 🔄 Data Enrichment Pattern

A key feature is **data enrichment** - the gateway combines data from multiple services:

### Example: Wishlist with Items and Products
```javascript
app.get('/api/wishlists/:id', wrap(async (req,res)=>{
  // 1. Get wishlist details
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  
  // 2. Get wishlist items
  const items = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}/items`);
  
  // 3. Enrich items with product information from local JSON
  const outItems = items.map(it=>({ ...it, product: products.find(p=>p.id==it.product_id) }));
  
  // 4. Determine user's role
  let role = 'owner';
  if (w.owner_id !== req.user.id){
    const access = await jget(`${COLLAB_URL}/access/mine`, { headers: { 'x-user-id': req.user.id } });
    const me = access.find(a=>a.wishlist_id == w.id);
    role = me ? me.role : 'none';
  }
  
  // 5. Return combined response
  res.json({ wishlist: w, items: outItems, role });
}));
```

### Example: Access List with User Enrichment
```javascript
app.get('/api/wishlists/:id/access', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});

  const access = await jget(`${COLLAB_URL}/wishlists/${req.params.id}/access`, { headers: { 'x-owner-id': req.user.id } });

  // Enrich with user directory names/icons
  const ids = Array.from(new Set([w.owner_id, ...access.map(a => a.user_id)]));
  let users = [];
  try {
    if (ids.length) {
      const r = await jget(`${USER_URL}/users?ids=${ids.join(',')}`);
      users = Array.isArray(r) ? r : (Array.isArray(r?.rows) ? r.rows : []);
    }
  } catch (e) {
    console.warn('User enrichment failed in access route:', e.message);
  }
  const byId = {};
  for (const u of users) if (u && typeof u.id !== 'undefined') byId[u.id] = u;

  const out = [
    { user_id: w.owner_id, role: 'owner', display_name: null, user: byId[w.owner_id] || { id: w.owner_id, public_name: `User ${w.owner_id}`, icon_url: null } },
    ...access.map(a => ({
      ...a,
      user: byId[a.user_id] || { id: a.user_id, public_name: `User ${a.user_id}`, icon_url: null }
    }))
  ];
  res.json(out);
}));
```

## 🛡️ Error Handling

### Global Error Handler
```javascript
function errorHandler(err, req, res, next) {
  console.error('GATEWAY_ERROR', err);
  const status = err.status || 502;
  let message = err.message || 'Internal error';
  
  // Try to parse JSON error messages from downstream services
  try {
    const parsed = JSON.parse(message);
    message = parsed.error || message;
  } catch (_) {}
  
  res.status(status).json({ error: message });
}
```

### Route Wrapper
```javascript
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### Safety Nets
```javascript
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
});
```

## 🎯 Key Benefits

1. **Single Entry Point**: Clients only need to know one API endpoint
2. **Service Isolation**: Backend services can be developed independently
3. **Data Aggregation**: Combines data from multiple services in one response
4. **Centralized Auth**: Authentication logic in one place
5. **Resilience**: If one service fails, others can still function
6. **Graceful Degradation**: Continues operation even if enrichment fails

## 🔍 Request Flow Example

When a user views a wishlist:

1. **Frontend** calls `GET /api/wishlists/123`
2. **Gateway** validates JWT token in `auth` middleware
3. **Gateway** calls wishlist service: `GET /wishlists/123`
4. **Gateway** calls wishlist service: `GET /wishlists/123/items`
5. **Gateway** enriches items with product data from local JSON file
6. **Gateway** calls collaboration service to determine user's role
7. **Gateway** returns combined response to frontend

This pattern allows the frontend to get all the data it needs in a single request, even though it comes from multiple backend services!

## 🔧 Environment Variables

- `PORT`: Gateway port (default: 8080)
- `JWT_SECRET`: Secret for JWT token validation
- `USER_SVC_URL`: User service URL
- `WISHLIST_SVC_URL`: Wishlist service URL
- `COLLAB_SVC_URL`: Collaboration service URL

## 📊 Health Check

- `GET /health` - Returns service status and name

## 🎯 Basic Version Features

### Simple Access Control
The basic version supports simplified access control:
- **owner**: Full access to wishlist and management
- **view_only**: Can view items only

### Basic Invitation System
- All invitations are view-only
- No role selection during invitation creation
- Simple invitation acceptance process

### User Enrichment
- Automatically enriches access lists with user profile information
- Provides fallback user objects when enrichment fails
- Maintains consistent user data across responses

## ❌ Features NOT Included in Basic Version

### Comments System
- No comment endpoints
- No comment functionality
- No comment enrichment in responses

### Role-Based Access Control
- No role management endpoints (PATCH)
- Simplified roles: only 'owner' and 'view_only'
- No granular permission control

### Advanced Invitation Features
- No `access_type` field in invitations
- All invitations are view-only
- No role specification during invitations 