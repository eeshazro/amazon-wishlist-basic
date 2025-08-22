// apps-basic/collaboration-service/server.js
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import { nanoid } from 'nanoid';

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WISHLIST_SVC_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002';

// ---------- Safety nets ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
});

// Express error handler (last)
function errorHandler(err, req, res, next) {
  console.error('COLLAB_ERROR', err);
  const status = err.status || 500;
  const message = typeof err === 'string' ? err : err.message || 'Internal error';
  res.status(status).json({ error: message });
}
// ----------------------------------

function uid(req){ return parseInt(req.headers['x-user-id']||'0',10); }

app.get('/health', (req,res)=>res.json({ok:true, service:'collaboration-service'}));

// Access listings for current user
app.get('/access/mine', wrap(async (req,res)=>{
  const userId = uid(req);
  const { rows } = await pool.query('SELECT wishlist_id, role FROM "collab".wishlist_access WHERE user_id=$1',[userId]);
  res.json(rows);
}));

// Owner-only: list collaborators
app.get('/wishlists/:id/access', wrap(async (req,res)=>{
  const wid = parseInt(req.params.id,10);
  const ownerId = parseInt(req.headers['x-owner-id']||'0',10);
  console.log('[COLLAB] GET /wishlists/:id/access', { wid, ownerId });
  if(!ownerId) return res.status(403).json({error:'owner required'});
  const { rows } = await pool.query('SELECT * FROM "collab".wishlist_access WHERE wishlist_id=$1',[wid]);
  console.log('[COLLAB] access rows', rows);
  res.json(rows);
}));

app.delete('/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  await pool.query('DELETE FROM "collab".wishlist_access WHERE wishlist_id=$1 AND user_id=$2',[req.params.id, req.params.userId]);
  res.status(204).end();
}));

// Update display name for a user in a wishlist
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

// Create invite (view-only only)
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

// Get invite
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

// Accept invite (view-only only)
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

// Register error handler LAST
app.use(errorHandler);

app.listen(PORT, ()=>console.log('collaboration-service on', PORT));