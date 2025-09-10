// Wishlist Service - API Calls Version
// This version simulates the real Amazon environment where you make HTTP calls to other services
// instead of having direct database access to user and product data

import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import { nanoid } from 'nanoid';
import { userServiceClient, productServiceClient } from './src/serviceClients.js';

const { Pool } = pkg;

// Initialize Express application
const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3002;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------- Error Handling and Safety Nets ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
});

function errorHandler(err, req, res, next) {
  console.error('WISHLIST_ERROR', err);
  const status = err.status || 500;
  const message = typeof err === 'string' ? err : err.message || 'Internal error';
  res.status(status).json({ error: message });
}

app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => res.json({ ok: true, service: 'wishlist-service' }));

// Helper function: Extract user ID from x-user-id header (set by API gateway)
function userId(req) { 
  return parseInt(req.headers['x-user-id'] || '0', 10); 
}

// Helper function: Extract auth token from Authorization header
function authToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Enhanced permission checking function with role-based access control
async function canEditWishlist(userId, wishlistId) {
  try {
    // Check if user is owner
    const wishlist = await pool.query('SELECT owner_id FROM wishlist WHERE id=$1', [wishlistId]);
    if (!wishlist.rows[0]) return false;
    
    // Owner can always edit
    if (wishlist.rows[0].owner_id === userId) return true;
    
    // Check if user has edit permissions in access table
    const access = await pool.query(`
      SELECT role FROM wishlist_access 
      WHERE wishlist_id=$1 AND user_id=$2`,
      [wishlistId, userId]
    );
    
    if (!access.rows[0]) return false;
    
    // Check if role allows editing
    const role = access.rows[0].role;
    return role === 'view_edit' || role === 'owner';
    
  } catch (e) {
    console.error('canEditWishlist check failed:', e);
    return false;
  }
}

// Permission checking function for viewing wishlists
async function canViewWishlist(userId, wishlistId) {
  try {
    // Check if user is owner
    const wishlist = await pool.query('SELECT owner_id FROM wishlist WHERE id=$1', [wishlistId]);
    if (!wishlist.rows[0]) return false;
    
    // Owner can always view
    if (wishlist.rows[0].owner_id === userId) return true;
    
    // Check if user has any access permissions
    const access = await pool.query(`
      SELECT role FROM wishlist_access 
      WHERE wishlist_id=$1 AND user_id=$2`,
      [wishlistId, userId]
    );
    
    return access.rows.length > 0;
    
  } catch (e) {
    console.error('canViewWishlist check failed:', e);
    return false;
  }
}

// ===== WISHLIST CRUD ENDPOINTS =====

// GET /wishlists/mine - Retrieve all wishlists owned by the authenticated user
app.get('/wishlists/mine', wrap(async (req, res) => {
  const uid = userId(req);
  const { rows } = await pool.query('SELECT * FROM wishlist WHERE owner_id=$1 ORDER BY id', [uid]);
  res.json(rows);
}));

// GET /wishlists/byIds - Retrieve multiple wishlists by their IDs
app.get('/wishlists/byIds', wrap(async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean).map(x => parseInt(x, 10));
  if (ids.length === 0) return res.json([]);
  const { rows } = await pool.query(`SELECT * FROM wishlist WHERE id = ANY($1::int[])`, [ids]);
  res.json(rows);
}));

// GET /wishlists/:id - Retrieve a specific wishlist by ID with permission checking and enrichment
app.get('/wishlists/:id', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  console.log(`Wishlist ${wishlistId} request from user ${uid}`);
  
  // Get the wishlist
  const { rows: wishlistRows } = await pool.query('SELECT * FROM wishlist WHERE id=$1', [wishlistId]);
  if (!wishlistRows[0]) return res.status(404).json({ error: 'not found' });
  
  const wishlist = wishlistRows[0];
  
  // Check if user has access to this wishlist
  let role = null;
  if (wishlist.owner_id === uid) {
    role = 'owner';
  } else {
    // Check if user has access through wishlist_access table
    const { rows: accessRows } = await pool.query(
      'SELECT role FROM wishlist_access WHERE wishlist_id=$1 AND user_id=$2',
      [wishlistId, uid]
    );
    if (accessRows[0]) {
      role = accessRows[0].role;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  // Get wishlist items with product enrichment
  const { rows: itemRows } = await pool.query(
    'SELECT * FROM wishlist_item WHERE wishlist_id=$1 ORDER BY priority ASC, id ASC',
    [wishlistId]
  );
  
  // Enrich items with product data
  const enrichedItems = await Promise.all(
    itemRows.map(async (item) => {
      try {
        console.log(`Fetching product ${item.product_id} for item ${item.id}`);
        const product = await productServiceClient.getProductById(item.product_id);
        console.log(`Product ${item.product_id} result:`, product ? 'found' : 'not found');
        return {
          ...item,
          product: product || { id: item.product_id, title: item.title }
        };
      } catch (error) {
        console.error(`Failed to enrich item ${item.id} with product data:`, error);
        return {
          ...item,
          product: { id: item.product_id, title: item.title }
        };
      }
    })
  );
  
  // Return enriched wishlist with items and role
  res.json({
    wishlist: wishlist,
    items: enrichedItems,
    role: role
  });
}));

// GET /wishlists/:id/items - Retrieve all items in a specific wishlist with product enrichment
app.get('/wishlists/:id/items', wrap(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM wishlist_item WHERE wishlist_id=$1 ORDER BY priority ASC, id ASC',
    [req.params.id]
  );
  
  // Enrich items with product data from product service
  const enrichedItems = await Promise.all(
    rows.map(async (item) => {
      try {
        const product = await productServiceClient.getProductById(item.product_id);
        return {
          ...item,
          product: product || { id: item.product_id, title: item.title }
        };
      } catch (error) {
        console.error(`Failed to enrich item ${item.id} with product data:`, error);
        return {
          ...item,
          product: { id: item.product_id, title: item.title }
        };
      }
    })
  );
  
  res.json(enrichedItems);
}));

// POST /wishlists - Create a new wishlist
app.post('/wishlists', wrap(async (req, res) => {
  const uid = userId(req);
  const { name, privacy = 'Private' } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO wishlist (name, owner_id, privacy) VALUES ($1,$2,$3) RETURNING *',
    [name, uid, privacy]
  );
  res.status(201).json(rows[0]);
}));

// POST /wishlists/:id/items - Add a new item to a wishlist
app.post('/wishlists/:id/items', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const { product_id, title, priority = 0 } = req.body;
  
  // Check if user can edit this wishlist
  if (!(await canEditWishlist(uid, wishlistId))) {
    return res.status(403).json({ error: 'insufficient permissions' });
  }
  
  try {
    const { rows } = await pool.query(`
      INSERT INTO wishlist_item
      (product_id, wishlist_id, title, priority, added_by) VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [product_id, wishlistId, title, priority, uid]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

// DELETE /wishlists/:id/items/:itemId - Remove an item from a wishlist
app.delete('/wishlists/:id/items/:itemId', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  
  // Check if user can edit this wishlist
  if (!(await canEditWishlist(uid, wishlistId))) {
    return res.status(403).json({ error: 'insufficient permissions' });
  }
  
  await pool.query(
    'DELETE FROM wishlist_item WHERE id=$1 AND wishlist_id=$2',
    [req.params.itemId, wishlistId]
  );
  res.status(204).end();
}));

// ===== COLLABORATION ENDPOINTS =====

// GET /access/mine - Get current user's access to shared wishlists
app.get('/access/mine', wrap(async (req, res) => {
  const uid = userId(req);
  const { rows } = await pool.query(
    'SELECT wishlist_id, role FROM wishlist_access WHERE user_id=$1',
    [uid]
  );
  res.json(rows);
}));

// GET /wishlists/:id/access - Get list of collaborators for a wishlist with user enrichment
app.get('/wishlists/:id/access', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  
  // Check if user is owner
  const wishlist = await pool.query('SELECT owner_id FROM wishlist WHERE id=$1', [wishlistId]);
  if (!wishlist.rows[0] || wishlist.rows[0].owner_id !== uid) {
    return res.status(403).json({ error: 'only owner can view access list' });
  }
  
  const { rows } = await pool.query(`
    SELECT user_id, role, display_name 
    FROM wishlist_access 
    WHERE wishlist_id=$1
  `, [wishlistId]);
  
  // Enrich with user data from user service
  const enrichedAccess = await Promise.all(
    rows.map(async (access) => {
      try {
        const user = await userServiceClient.getUserById(access.user_id);
        return {
          ...access,
          user: user || { id: access.user_id, public_name: access.display_name }
        };
      } catch (error) {
        console.error(`Failed to enrich access ${access.user_id} with user data:`, error);
        return {
          ...access,
          user: { id: access.user_id, public_name: access.display_name }
        };
      }
    })
  );
  
  res.json(enrichedAccess);
}));

// POST /wishlists/:id/invites - Create an invitation for a wishlist
app.post('/wishlists/:id/invites', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const { access_type = 'view_only' } = req.body;
  
  // Check if user is owner
  const wishlist = await pool.query('SELECT owner_id FROM wishlist WHERE id=$1', [wishlistId]);
  if (!wishlist.rows[0] || wishlist.rows[0].owner_id !== uid) {
    return res.status(403).json({ error: 'only owner can create invites' });
  }
  
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const { rows } = await pool.query(`
    INSERT INTO wishlist_invite (wishlist_id, token, access_type, expires_at, created_by)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [wishlistId, token, access_type, expiresAt, uid]);
  
  res.status(201).json(rows[0]);
}));

// GET /invites/:token - Get invitation details by token
app.get('/invites/:token', wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT wi.*, w.name as wishlist_name, w.owner_id
    FROM wishlist_invite wi
    JOIN wishlist w ON wi.wishlist_id = w.id
    WHERE wi.token = $1 AND wi.expires_at > NOW()
  `, [req.params.token]);
  
  if (!rows[0]) {
    return res.status(404).json({ error: 'invite not found or expired' });
  }
  
  // Enrich with owner data
  try {
    const owner = await userServiceClient.getUserById(rows[0].owner_id);
    res.json({
      ...rows[0],
      owner: owner || { id: rows[0].owner_id, public_name: 'Unknown User' }
    });
  } catch (error) {
    console.error('Failed to enrich invite with owner data:', error);
    res.json({
      ...rows[0],
      owner: { id: rows[0].owner_id, public_name: 'Unknown User' }
    });
  }
}));

// POST /invites/:token/accept - Accept an invitation
app.post('/invites/:token/accept', wrap(async (req, res) => {
  const uid = userId(req);
  const { display_name } = req.body;
  
  // Get invitation details
  const invite = await pool.query(`
    SELECT wi.*, w.name as wishlist_name
    FROM wishlist_invite wi
    JOIN wishlist w ON wi.wishlist_id = w.id
    WHERE wi.token = $1 AND wi.expires_at > NOW()
  `, [req.params.token]);
  
  if (!invite.rows[0]) {
    return res.status(404).json({ error: 'invite not found or expired' });
  }
  
  const inviteData = invite.rows[0];
  
  // Check if user already has access
  const existingAccess = await pool.query(`
    SELECT wishlist_id, user_id FROM wishlist_access 
    WHERE wishlist_id = $1 AND user_id = $2
  `, [inviteData.wishlist_id, uid]);
  
  if (existingAccess.rows.length > 0) {
    return res.status(400).json({ error: 'user already has access to this wishlist' });
  }
  
  // Create access record
  const { rows } = await pool.query(`
    INSERT INTO wishlist_access (wishlist_id, user_id, role, display_name)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [inviteData.wishlist_id, uid, inviteData.access_type, display_name]);
  
  // Delete the invitation token
  await pool.query('DELETE FROM wishlist_invite WHERE token = $1', [req.params.token]);
  
  res.status(201).json(rows[0]);
}));

// DELETE /wishlists/:id/access/:userId - Remove user access to wishlist
app.delete('/wishlists/:id/access/:userId', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const targetUserId = parseInt(req.params.userId);
  
  // Check if user is owner
  const wishlist = await pool.query('SELECT owner_id FROM wishlist WHERE id=$1', [wishlistId]);
  if (!wishlist.rows[0] || wishlist.rows[0].owner_id !== uid) {
    return res.status(403).json({ error: 'only owner can remove access' });
  }
  
  await pool.query(`
    DELETE FROM wishlist_access 
    WHERE wishlist_id = $1 AND user_id = $2
  `, [wishlistId, targetUserId]);
  
  res.status(204).end();
}));

// PUT /wishlists/:id/access/:userId - Update user role in wishlist
app.put('/wishlists/:id/access/:userId', wrap(async (req, res) => {
  const uid = userId(req);
  const wishlistId = req.params.id;
  const targetUserId = parseInt(req.params.userId);
  const { role, display_name } = req.body;
  
  // Check if user is owner
  const wishlist = await pool.query('SELECT owner_id FROM wishlist WHERE id=$1', [wishlistId]);
  if (!wishlist.rows[0] || wishlist.rows[0].owner_id !== uid) {
    return res.status(403).json({ error: 'only owner can update roles' });
  }
  
  const { rows } = await pool.query(`
    UPDATE wishlist_access 
    SET role = $1, display_name = $2
    WHERE wishlist_id = $3 AND user_id = $4
    RETURNING *
  `, [role, display_name, wishlistId, targetUserId]);
  
  if (!rows[0]) {
    return res.status(404).json({ error: 'access record not found' });
  }
  
  res.json(rows[0]);
}));

// Start the server
app.listen(PORT, () => {
  console.log(`Wishlist Service (API Calls) running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
