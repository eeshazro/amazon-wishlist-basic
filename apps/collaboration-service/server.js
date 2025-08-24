// Collaboration Service - Manages wishlist sharing, invitations, and access control
// This service handles collaborative features like inviting users to wishlists,
// managing access permissions, and tracking user roles within shared wishlists

// apps-basic/collaboration-service/server.js
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import { nanoid } from 'nanoid'; // For generating unique invitation tokens

const { Pool } = pkg;
const app = express();

app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Configuration
const PORT = process.env.PORT || 3003; // Default port 3003, can be overridden by environment
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); // PostgreSQL connection pool
const WISHLIST_SVC_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002'; // Wishlist service URL for enrichment

// ---------- Error Handling and Safety Nets ----------
// Async route wrapper - ensures thrown errors are caught by Express error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handling - prevent unhandled promise rejections from crashing the app
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
});

// Express error handler middleware - handles all errors thrown in routes
function errorHandler(err, req, res, next) {
  console.error('COLLAB_ERROR', err);
  const status = err.status || 500; // Default to 500 Internal Server Error
  const message = typeof err === 'string' ? err : err.message || 'Internal error';
  res.status(status).json({ error: message });
}
// ----------------------------------

// Helper function: Extract user ID from x-user-id header (set by API gateway)
function uid(req){ return parseInt(req.headers['x-user-id']||'0',10); }

// Health check endpoint
app.get('/health', (req,res)=>res.json({ok:true, service:'collaboration-service'}));

// GET /access/mine - Get current user's access to shared wishlists
// Returns: Array of wishlist access records with role information
app.get('/access/mine', wrap(async (req,res)=>{
  const userId = uid(req); // Get authenticated user ID
  const { rows } = await pool.query('SELECT wishlist_id, role FROM "collab".wishlist_access WHERE user_id=$1',[userId]);
  res.json(rows);
}));

// GET /wishlists/:id/access - Get list of collaborators for a wishlist (owner only)
// Headers: x-owner-id - ID of the wishlist owner
// Returns: Array of access records for all collaborators
app.get('/wishlists/:id/access', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10); // Wishlist ID
  const ownerId = parseInt(req.headers['x-owner-id']||'0',10); // Owner ID from header
  console.log('[COLLAB] GET /wishlists/:id/access', { wid, ownerId });
  
  if(!ownerId) return res.status(403).json({error:'owner required'}); // Verify owner authorization
  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_access WHERE wishlist_id=$1',[wid]);
  console.log('[COLLAB] access rows', rows);
  res.json(rows);
}));

// DELETE /wishlists/:id/access/:userId - Remove a collaborator from a wishlist
// Returns: 204 No Content on successful removal
app.delete('/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  await pool.query('DELETE FROM "collab".wishlist_access WHERE wishlist_id=$1 AND user_id=$2',[req.params.id, req.params.userId]);
  res.status(204).end();
}));

// PUT /wishlists/:id/access/:userId - Update collaborator's display name in a wishlist
// Body: { display_name: string }
// Returns: Updated access record
app.put('/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10); // Wishlist ID
  const targetUserId = parseInt(req.params.userId,10); // Target user ID
  const ownerId = parseInt(req.headers['x-owner-id']||'0',10); // Owner ID from header
  const displayName = (req.body.display_name || '').trim() || null; // Display name from request body

  if(!ownerId) return res.status(403).json({error:'owner required'}); // Verify owner authorization

  // Update the display name for the specified user in this wishlist
  await pool.query('UPDATE "collab".wishlist_access SET display_name=$1 WHERE wishlist_id=$2 AND user_id=$3', [displayName, wid, targetUserId]);
  
  // Return the updated access record
  const { rows } = await pool.query(
    'SELECT wishlist_id, user_id, role, invited_by, invited_at, display_name FROM "collab".wishlist_access WHERE wishlist_id=$1 AND user_id=$2',
    [wid, targetUserId]
  );
  if (!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
}));

// POST /wishlists/:id/invites - Create an invitation for a wishlist
// Returns: Invitation token and expiration date
// Note: All invitations in the basic version are view-only
app.post('/wishlists/:id/invites', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10); // Wishlist ID
  const token = nanoid(16); // Generate unique 16-character token
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // Token expires in 72 hours

  // Create invitation record in database
  const { rows } = await pool.query(
    'INSERT INTO "collab".wishlist_invite (wishlist_id, token, expires_at) VALUES ($1,$2,$3) RETURNING token, expires_at',
    [wid, token, expiresAt]
  );
  res.status(201).json(rows[0]);
}));

// GET /invites/:token - Get invitation details by token
// Returns: Invitation information with enriched wishlist and inviter details
app.get('/invites/:token', wrap(async (req,res)=>{
  // Find valid (non-expired) invitation
  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_invite WHERE token=$1 AND expires_at > NOW()',[req.params.token]);
  if(!rows[0]) return res.status(404).json({error:'invalid or expired'});
  
  const invite = rows[0];
  const wid = invite.wishlist_id;
  
  // Enrich with wishlist details
  let wishlist = null;
  try {
    const wishlistRes = await fetch(`${WISHLIST_SVC_URL}/wishlists/${wid}`);
    if (wishlistRes.ok) {
      wishlist = await wishlistRes.json();
    }
  } catch (e) {
    console.error('Failed to fetch wishlist details:', e);
  }
  
  // Enrich with inviter (wishlist owner) details
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
  
  // Return enriched invitation data
  res.json({
    ...invite,
    wishlist_name: wishlist?.name || 'Unknown Wishlist',
    inviter_name: inviter?.public_name || `User ${wishlist?.owner_id || 'Unknown'}`
  });
}));

// POST /invites/:token/accept - Accept an invitation
// Body: { display_name?: string }
// Returns: Confirmation of acceptance with role and wishlist information
app.post('/invites/:token/accept', wrap(async (req,res)=>{
  const userId = uid(req); // Get authenticated user ID
  const displayName = (req.body.display_name || '').trim() || null; // Optional display name
  console.log('[COLLAB] POST /invites/:token/accept', { token: req.params.token, userId, displayName });

  // Validate invitation token
  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_invite WHERE token=$1 AND expires_at > NOW()',[req.params.token]);
  if(!rows[0]) return res.status(404).json({error:'invalid or expired'});
  
  const wid = rows[0].wishlist_id;
  const role = 'view_only'; // All invites are view-only in basic version

  // Insert or update access record (upsert pattern)
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

// Register error handler LAST (after all routes)
app.use(errorHandler);

// Start the server
app.listen(PORT, ()=>console.log('collaboration-service on', PORT));