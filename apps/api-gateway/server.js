// API Gateway - Central entry point for all client requests
// This service handles authentication, routing, and orchestration between microservices
// It acts as a reverse proxy and provides a unified API interface

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import url from 'url';

// Initialize Express application
const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Set up __dirname for ES modules compatibility
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Configuration - Environment variables with sensible defaults
const PORT = process.env.PORT || 8080; // Default gateway port
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me'; // JWT signing secret
const USER_URL = process.env.USER_SVC_URL || 'http://user-service:3001'; // User service URL
const WISHLIST_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002'; // Wishlist service URL
const COLLAB_URL = process.env.COLLAB_SVC_URL || 'http://collaboration-service:3003'; // Collaboration service URL

// Load product catalog from JSON file (static data)
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products/products.json'), 'utf-8'));

// Authentication middleware - validates JWT tokens for protected routes
function auth(req,res,next){
  // Allow public routes without authentication
  if (req.path.startsWith('/products')) return next();          // Product catalog is public
  if (req.path.startsWith('/auth/login')) return next();        // Login endpoint is public
  if (req.method === 'GET' && req.path.startsWith('/api/invites/')) return next(); // Invite preview is public

  // Extract and validate JWT token
  const auth = req.headers.authorization||'';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if(!token) return res.status(401).json({error:'missing token'});
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name }; // Attach user info to request
    return next();
  }catch(e){ return res.status(401).json({error:'invalid token'}); }
}

// Apply authentication middleware to all routes
app.use(auth);

// Health check endpoint
app.get('/health', (req,res)=>res.json({ok:true, service:'api-gateway'}));

// Async route wrapper - ensures thrown errors are caught by Express error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handling - prevent unhandled promise rejections from crashing the app
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
  // Do NOT process.exit() in dev; let Docker restart if it really dies.
});

// Express error handler middleware - handles all errors thrown in routes
function errorHandler(err, req, res, next) {
  console.error('GATEWAY_ERROR', err);
  const status = err.status || 502; // Default to 502 Bad Gateway for downstream errors
  let message = err.message || 'Internal error';
  // If the downstream sent JSON, it might be a stringified JSON; try to parse to extract {error:...}
  try {
    const parsed = JSON.parse(message);
    message = parsed.error || message;
  } catch (_) {}
  res.status(status).json({ error: message });
}

// ---- Products API (public, served from JSON file) ----
// GET /products - Return all products from the catalog
app.get('/products', (req, res) => {
  res.json(products);
});

// GET /products/:id - Return a specific product by ID
app.get('/products/:id', (req, res) => {
  const p = products.find(p => p.id == req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

// ---- HTTP Client Helpers ----
// Helper function for GET requests to downstream services
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

// Helper function for POST requests to downstream services
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

// Helper function for DELETE requests to downstream services
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

// ---- Authentication Routes ----
// POST /auth/login - Proxy login request to user service
app.post('/auth/login', wrap(async (req, res) => {
  const r = await fetch(`${USER_URL}/auth/login`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify(req.body)
  });
  const data = await r.json();
  res.status(r.status).json(data);
}));

// GET /api/me - Get current user profile
app.get('/api/me', wrap(async (req,res)=>{
  const r = await fetch(`${USER_URL}/me`, { headers:{ authorization: req.headers.authorization } });
  const data = await r.json();
  res.status(r.status).json(data);
}));

// ---- Wishlist Routes ----
// GET /api/wishlists/mine - Get current user's own wishlists
app.get('/api/wishlists/mine', wrap(async (req,res)=>{
  const data = await jget(`${WISHLIST_URL}/wishlists/mine`, { headers: { 'x-user-id': req.user.id } });
  res.json(data);
}));

// GET /api/wishlists/friends - Get wishlists shared with current user
app.get('/api/wishlists/friends', wrap(async (req,res)=>{
  // Get user's access to shared wishlists
  const access = await jget(`${COLLAB_URL}/access/mine`, { headers: { 'x-user-id': req.user.id } });
  const ids = access.map(a=>a.wishlist_id);
  if(ids.length===0) return res.json([]);
  
  // Fetch wishlist details and enrich with user's role
  const lists = await jget(`${WISHLIST_URL}/wishlists/byIds?ids=${ids.join(',')}`, { headers: { 'x-user-id': req.user.id } });
  const roleById = Object.fromEntries(access.map(a=>[a.wishlist_id,a.role]));
  res.json(lists.map(l=>({...l, role: roleById[l.id]})));
}));

// GET /api/wishlists/:id - Get specific wishlist with items and user's role
app.get('/api/wishlists/:id', wrap(async (req,res)=>{
  // Fetch wishlist and items
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  const items = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}/items`);
  
  // Enrich items with product information
  const outItems = items.map(it=>({ ...it, product: products.find(p=>p.id==it.product_id) }));
  
  // Determine user's role (owner, collaborator, or none)
  let role = 'owner';
  if (w.owner_id !== req.user.id){
    const access = await jget(`${COLLAB_URL}/access/mine`, { headers: { 'x-user-id': req.user.id } });
    const me = access.find(a=>a.wishlist_id == w.id);
    role = me ? me.role : 'none';
  }
  res.json({ wishlist: w, items: outItems, role });
}));

// POST /api/wishlists - Create a new wishlist
app.post('/api/wishlists', wrap(async (req,res)=>{
  const w = await jpost(`${WISHLIST_URL}/wishlists`, req.body, { headers: { 'x-user-id': req.user.id, 'content-type':'application/json' } });
  res.status(201).json(w);
}));

// POST /api/wishlists/:id/items - Add item to wishlist
app.post('/api/wishlists/:id/items', wrap(async (req,res)=>{
  const wishlistId = req.params.id;
  
  // Check if user can edit this wishlist (only owners in basic version)
  const w = await jget(`${WISHLIST_URL}/wishlists/${wishlistId}`);
  if (w.owner_id !== req.user.id) {
    return res.status(403).json({error: 'insufficient permissions - only owners can add items in basic version'});
  }
  
  const it = await jpost(`${WISHLIST_URL}/wishlists/${wishlistId}/items`, req.body, { headers: { 'x-user-id': req.user.id, 'content-type':'application/json' } });
  res.status(201).json(it);
}));

// DELETE /api/wishlists/:id/items/:itemId - Remove item from wishlist
app.delete('/api/wishlists/:id/items/:itemId', wrap(async (req,res)=>{
  const wishlistId = req.params.id;
  
  // Check if user can edit this wishlist (only owners in basic version)
  const w = await jget(`${WISHLIST_URL}/wishlists/${wishlistId}`);
  if (w.owner_id !== req.user.id) {
    return res.status(403).json({error: 'insufficient permissions - only owners can delete items in basic version'});
  }
  
  await jdel(`${WISHLIST_URL}/wishlists/${wishlistId}/items/${req.params.itemId}`, { headers: { 'x-user-id': req.user.id } });
  res.status(204).end();
}));

// ---- Collaboration Routes ----
// GET /api/wishlists/:id/access - Get list of collaborators (owner only)
app.get('/api/wishlists/:id/access', wrap(async (req,res)=>{
  // Verify user is the owner
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});

  // Get access list from collaboration service
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

  // Return enriched access list with owner and collaborators
  const out = [
    { user_id: w.owner_id, role: 'owner', display_name: null, user: byId[w.owner_id] || { id: w.owner_id, public_name: `User ${w.owner_id}`, icon_url: null } },
    ...access.map(a => ({
      ...a,
      user: byId[a.user_id] || { id: a.user_id, public_name: `User ${a.user_id}`, icon_url: null }
    }))
  ];
  res.json(out);
}));

// DELETE /api/wishlists/:id/access/:userId - Remove collaborator (owner only)
app.delete('/api/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});
  await jdel(`${COLLAB_URL}/wishlists/${req.params.id}/access/${req.params.userId}`);
  res.status(204).end();
}));

// PUT /api/wishlists/:id/access/:userId - Update collaborator display name (owner only)
app.put('/api/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});
  const data = await jpost(`${COLLAB_URL}/wishlists/${req.params.id}/access/${req.params.userId}`, req.body, { 
    headers: { 'x-owner-id': req.user.id, 'content-type': 'application/json' } 
  });
  res.json(data);
}));

// ---- Invitation Routes ----
// POST /api/wishlists/:id/invites - Create invitation link (owner only)
app.post('/api/wishlists/:id/invites', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});
  const data = await jpost(`${COLLAB_URL}/wishlists/${req.params.id}/invites`, {}, { headers: { 'content-type':'application/json' } });
  res.status(201).json({ ...data, inviteLink: `http://localhost:5173/wishlist/friends/invite/${data.token}` });
}));

// GET /api/invites/:token - Get invitation details (public)
app.get('/api/invites/:token', wrap(async (req,res)=>{
  const data = await jget(`${COLLAB_URL}/invites/${req.params.token}`);
  res.json(data);
}));

// POST /api/invites/:token/accept - Accept invitation
app.post('/api/invites/:token/accept', wrap(async (req,res)=>{
  const body = { display_name: (req.body.display_name || '').trim() || null };
  const data = await jpost(`${COLLAB_URL}/invites/${req.params.token}/accept`, body, { headers: { 'x-user-id': req.user.id, 'content-type': 'application/json' } });
  res.json(data);
}));

// Register the error handler LAST (after all routes)
app.use(errorHandler);

// Start the server
app.listen(PORT, ()=>console.log('api-gateway on', PORT));