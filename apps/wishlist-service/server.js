// Wishlist Service - Manages wishlist CRUD operations and wishlist items
// This service handles creating, reading, updating, and deleting wishlists and their items
// It also manages wishlist privacy settings and item priorities

import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

// Initialize Express application
const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Configuration
const PORT = process.env.PORT || 3002; // Default port 3002, can be overridden by environment
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); // PostgreSQL connection pool

// Collaboration service URL for permission checking
const COLLAB_URL = process.env.COLLAB_SVC_URL || 'http://collaboration-service:3003';

// Health check endpoint - used by load balancers and monitoring systems
app.get('/health', (req,res)=>res.json({ok:true, service:'wishlist-service'}));

// Helper function: Extract user ID from x-user-id header (set by API gateway)
// This header is populated by the gateway after JWT authentication
function userId(req){ return parseInt(req.headers['x-user-id']||'0',10); }

// Permission checking function for basic version (view_only or owner)
async function canEditWishlist(userId, wishlistId) {
  try {
    // Check if user is owner
    const wishlist = await pool.query('SELECT owner_id FROM "wishlist".wishlist WHERE id=$1', [wishlistId]);
    if (!wishlist.rows[0]) return false;
    
    if (wishlist.rows[0].owner_id === userId) return true;
    
    // In basic version, only owners can edit (no view_edit role)
    return false;
  } catch (e) {
    console.error('canEditWishlist check failed:', e);
    return false;
  }
}

// GET /wishlists/mine - Retrieve all wishlists owned by the authenticated user
// Returns: Array of wishlist objects ordered by ID
app.get('/wishlists/mine', async (req,res)=>{
  const uid = userId(req); // Get user ID from request header
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist WHERE owner_id=$1 ORDER BY id', [uid]);
  res.json(rows);
});

// GET /wishlists/byIds - Retrieve multiple wishlists by their IDs
// Query params: ids - comma-separated list of wishlist IDs
// Returns: Array of wishlist objects for the specified IDs
app.get('/wishlists/byIds', async (req,res)=>{
  const ids = (req.query.ids||'').split(',').filter(Boolean).map(x=>parseInt(x,10)); // Parse and validate IDs
  if(ids.length===0) return res.json([]); // Return empty array if no valid IDs
  const { rows } = await pool.query(`SELECT * FROM "wishlist".wishlist WHERE id = ANY($1::int[])`, [ids]);
  res.json(rows);
});

// GET /wishlists/:id - Retrieve a specific wishlist by ID
// Returns: Single wishlist object or 404 if not found
app.get('/wishlists/:id', async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist WHERE id=$1',[req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
});

// GET /wishlists/:id/items - Retrieve all items in a specific wishlist
// Returns: Array of wishlist items ordered by priority (ascending) then by ID
app.get('/wishlists/:id/items', async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist_item WHERE wishlist_id=$1 ORDER BY priority ASC, id ASC',[req.params.id]);
  res.json(rows);
});

// POST /wishlists - Create a new wishlist
// Body: { name: string, privacy?: 'Private' | 'Public' }
// Returns: Created wishlist object with 201 status
app.post('/wishlists', async (req,res)=>{
  const uid = userId(req); // Get authenticated user ID
  const { name, privacy='Private' } = req.body; // Default privacy to 'Private'
  const { rows } = await pool.query('INSERT INTO "wishlist".wishlist (name, owner_id, privacy) VALUES ($1,$2,$3) RETURNING *',[name, uid, privacy]);
  res.status(201).json(rows[0]);
});

// POST /wishlists/:id/items - Add a new item to a wishlist
// Body: { product_id: number, title: string, priority?: number }
// Returns: Created wishlist item object with 201 status
app.post('/wishlists/:id/items', async (req,res)=>{
  const uid = userId(req);
  const wishlistId = req.params.id;
  const { product_id, title, priority=0 } = req.body;
  
  // Check if user can edit this wishlist
  if (!(await canEditWishlist(uid, wishlistId))) {
    return res.status(403).json({error: 'insufficient permissions - only owners can add items in basic version'});
  }
  
  try{
    const { rows } = await pool.query(`INSERT INTO "wishlist".wishlist_item
      (product_id, wishlist_id, title, priority, added_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [product_id, wishlistId, title, priority, uid]);
    res.status(201).json(rows[0]);
  }catch(e){ res.status(400).json({error:e.message}); }
});

// DELETE /wishlists/:id/items/:itemId - Remove an item from a wishlist
// Returns: 204 No Content on successful deletion
app.delete('/wishlists/:id/items/:itemId', async (req,res)=>{
  const uid = userId(req);
  const wishlistId = req.params.id;
  
  // Check if user can edit this wishlist
  if (!(await canEditWishlist(uid, wishlistId))) {
    return res.status(403).json({error: 'insufficient permissions - only owners can delete items in basic version'});
  }
  
  await pool.query('DELETE FROM "wishlist".wishlist_item WHERE id=$1 AND wishlist_id=$2',[req.params.itemId, wishlistId]);
  res.status(204).end();
});

// Start the server and log the port
app.listen(PORT, ()=>console.log('wishlist-service on', PORT));