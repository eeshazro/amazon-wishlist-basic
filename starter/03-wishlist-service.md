# Wishlist Service Documentation - Basic Version

## Overview

The Wishlist Service (`apps/wishlist-service/server.js`) is responsible for **wishlist and item management** in the Amazon collaborative wishlist application. This service handles creating, reading, updating, and deleting wishlists and their items, serving as the core data management service for wishlist functionality.

## 🏗️ Architecture Pattern

This service follows a **dedicated data management pattern** where:
- Handles all wishlist and item operations
- Manages wishlist ownership and privacy
- Provides item management capabilities
- Maintains wishlist data in a PostgreSQL database
- Receives user context via headers from the API gateway

## 🔧 Key Components

### Database Connection
```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Uses PostgreSQL connection pool for database operations.

### User Context Helper
```javascript
function userId(req){ return parseInt(req.headers['x-user-id']||'0',10); }
```

Extracts user ID from the `x-user-id` header (set by the API gateway after JWT validation).

## 📡 API Routes

### Health Check
- `GET /health` - Returns service status and name

### Wishlist Management
- `GET /wishlists/mine` - Get current user's wishlists
- `GET /wishlists/byIds` - Get multiple wishlists by IDs
- `GET /wishlists/:id` - Get specific wishlist details
- `POST /wishlists` - Create new wishlist

### Item Management
- `GET /wishlists/:id/items` - Get all items in a wishlist
- `POST /wishlists/:id/items` - Add item to wishlist
- `DELETE /wishlists/:id/items/:itemId` - Remove item from wishlist

## 📋 Wishlist Operations

### Get User's Wishlists
```javascript
app.get('/wishlists/mine', async (req,res)=>{
  const uid = userId(req);
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist WHERE owner_id=$1 ORDER BY id', [uid]);
  res.json(rows);
});
```

**Features:**
- Retrieves all wishlists owned by the current user
- Uses user ID from request headers
- Returns wishlists ordered by ID

### Get Multiple Wishlists
```javascript
app.get('/wishlists/byIds', async (req,res)=>{
  const ids = (req.query.ids||'').split(',').filter(Boolean).map(x=>parseInt(x,10));
  if(ids.length===0) return res.json([]);
  const { rows } = await pool.query(`SELECT * FROM "wishlist".wishlist WHERE id = ANY($1::int[])`, [ids]);
  res.json(rows);
});
```

**Features:**
- Accepts comma-separated wishlist IDs as query parameter
- Used by API gateway to fetch shared wishlists
- Returns multiple wishlists in a single request

### Get Specific Wishlist
```javascript
app.get('/wishlists/:id', async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist WHERE id=$1',[req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
});
```

Returns detailed information about a specific wishlist.

### Create New Wishlist
```javascript
app.post('/wishlists', async (req,res)=>{
  const uid = userId(req);
  const { name, privacy='Private' } = req.body;
  const { rows } = await pool.query('INSERT INTO "wishlist".wishlist (name, owner_id, privacy) VALUES ($1,$2,$3) RETURNING *',[name, uid, privacy]);
  res.status(201).json(rows[0]);
});
```

**Features:**
- Creates wishlist with current user as owner
- Sets default privacy to 'Private'
- Returns the created wishlist with generated ID

## 🎁 Item Operations

### Get Wishlist Items
```javascript
app.get('/wishlists/:id/items', async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist_item WHERE wishlist_id=$1 ORDER BY priority ASC, id ASC',[req.params.id]);
  res.json(rows);
});
```

**Features:**
- Retrieves all items in a specific wishlist
- Orders items by priority (ascending) then by ID
- Used by API gateway to get items for enrichment

### Add Item to Wishlist
```javascript
app.post('/wishlists/:id/items', async (req,res)=>{
  const uid = userId(req);
  const { product_id, title, priority=0 } = req.body;
  try{
    const { rows } = await pool.query(`INSERT INTO "wishlist".wishlist_item
      (product_id, wishlist_id, title, priority, added_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [product_id, req.params.id, title, priority, uid]);
    res.status(201).json(rows[0]);
  }catch(e){ res.status(400).json({error:e.message}); }
});
```

**Features:**
- Adds item to specified wishlist
- Records who added the item (`added_by`)
- Sets default priority to 0
- Handles database constraint violations gracefully

### Remove Item from Wishlist
```javascript
app.delete('/wishlists/:id/items/:itemId', async (req,res)=>{
  await pool.query('DELETE FROM "wishlist".wishlist_item WHERE id=$1 AND wishlist_id=$2',[req.params.itemId, req.params.id]);
  res.status(204).end();
});
```

**Features:**
- Removes specific item from wishlist
- Validates both item ID and wishlist ID
- Returns 204 (No Content) on successful deletion

## 🗄️ Database Schema

### Wishlist Table (`wishlist.wishlist`)
```sql
CREATE TABLE "wishlist".wishlist (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES "user".user(id),
    privacy VARCHAR(50) DEFAULT 'Private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Primary key, auto-incrementing
- `name`: Wishlist name
- `owner_id`: Foreign key to user who owns the wishlist
- `privacy`: Access level (Private/Public)
- `created_at`: Wishlist creation timestamp

### Wishlist Item Table (`wishlist.wishlist_item`)
```sql
CREATE TABLE "wishlist".wishlist_item (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    wishlist_id INTEGER NOT NULL REFERENCES "wishlist".wishlist(id),
    title VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 0,
    comments TEXT,
    added_by INTEGER NOT NULL REFERENCES "user".user(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id, product_id)
);
```

**Fields:**
- `id`: Primary key, auto-incrementing
- `product_id`: Reference to product catalog
- `wishlist_id`: Foreign key to parent wishlist
- `title`: Item title/name
- `priority`: Priority level (0 = lowest)
- `comments`: General comments about the item (owner's notes)
- `added_by`: Foreign key to user who added the item
- `created_at`: Item addition timestamp
- **Unique constraint**: Prevents duplicate products in same wishlist

## 🔄 Integration with Other Services

### API Gateway Integration
- Gateway calls wishlist endpoints with user context
- Gateway enriches wishlist data with product information
- Gateway combines wishlist and collaboration data

### Collaboration Service Integration
- Collaboration service checks wishlist ownership for permissions
- Wishlist service provides ownership information via API calls

### User Service Integration
- User service provides user information for item attribution
- User IDs are passed via `x-user-id` header

## 🛡️ Security & Access Control

### User Context
- All operations require valid user context via `x-user-id` header
- User context is validated by API gateway before reaching this service

### Data Validation
- Input validation for wishlist names and item data
- Database constraint enforcement (unique products per wishlist)
- Error handling for invalid data

### Privacy Control
- Wishlist privacy levels (Private/Public)
- Access control handled at API gateway level
- Service focuses on data management, not access control

## 🔧 Environment Variables

- `PORT`: Service port (default: 3002)
- `DATABASE_URL`: PostgreSQL connection string

## 📊 Health Check

- `GET /health` - Returns service status and name

## 🎯 Key Benefits

1. **Dedicated Data Management**: Focused on wishlist and item operations
2. **Clean API Design**: Simple, RESTful endpoints
3. **Data Integrity**: Database constraints and validation
4. **Performance**: Efficient queries with proper indexing
5. **Service Isolation**: Independent from authentication and collaboration logic

## 🔍 Request Flow Examples

### Create Wishlist Flow
1. **Frontend** sends `POST /api/wishlists` with name and privacy
2. **API Gateway** validates JWT and forwards with user context
3. **Wishlist Service** creates wishlist with user as owner
4. **Frontend** receives created wishlist with ID

### Add Item Flow
1. **Frontend** sends `POST /api/wishlists/123/items` with product data
2. **API Gateway** validates JWT and forwards with user context
3. **Wishlist Service** adds item to wishlist
4. **Frontend** receives created item with ID

### View Wishlist Flow
1. **Frontend** sends `GET /api/wishlists/123`
2. **API Gateway** validates JWT and calls wishlist service
3. **Wishlist Service** returns wishlist details
4. **API Gateway** calls wishlist service for items
5. **API Gateway** enriches items with product data
6. **API Gateway** determines user's role via collaboration service
7. **Frontend** receives complete wishlist with items and role

## 📈 Performance Considerations

### Database Queries
- Uses parameterized queries for security
- Proper indexing on foreign keys and frequently queried fields
- Efficient batch operations for multiple wishlists

### Caching Opportunities
- Product data could be cached (currently served from JSON)
- User wishlists could be cached for frequent access
- Item lists could be cached with invalidation on changes

## 📝 Notes for Basic Version

The Wishlist Service remains largely unchanged between basic and full versions because:

1. **Core Functionality**: Wishlist and item management is fundamental to both versions
2. **No Comment Dependencies**: The wishlist service doesn't handle comments directly
3. **Simple Privacy Model**: Basic version only needs Private/Public distinction
4. **Item Management**: Adding/removing items works the same in both versions

The main differences in the basic version are:
- **Simplified Privacy**: Only Private/Public options (no Shared with complex permissions)
- **No Comment Integration**: Items don't have associated comments
- **Basic Access Control**: Only owner/viewer distinction, no complex role management
- **Item Comments Field**: Used for owner's notes only, not threaded comments 