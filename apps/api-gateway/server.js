import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import url from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';
const USER_URL = process.env.USER_SVC_URL || 'http://user-service:3001';
const WISHLIST_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002';
const COLLAB_URL = process.env.COLLAB_SVC_URL || 'http://collaboration-service:3003';

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products/products.json'), 'utf-8'));

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

app.use(auth);

// Health
app.get('/health', (req,res)=>res.json({ok:true, service:'api-gateway'}));

// Async route wrapper so thrown errors go to Express instead of crashing the process
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global safety nets
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
  // Do NOT process.exit() in dev; let Docker restart if it really dies.
});

// Express error handler (last middleware)
function errorHandler(err, req, res, next) {
  console.error('GATEWAY_ERROR', err);
  const status = err.status || 502;
  let message = err.message || 'Internal error';
  // If the downstream sent JSON, it might be a stringified JSON; try to parse to extract {error:...}
  try {
    const parsed = JSON.parse(message);
    message = parsed.error || message;
  } catch (_) {}
  res.status(status).json({ error: message });
}

// ---- Products (public, served from JSON file) ----
app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const p = products.find(p => p.id == req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

// Proxy helpers
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

app.post('/auth/login', wrap(async (req, res) => {
  const r = await fetch(`${USER_URL}/auth/login`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify(req.body)
  });
  const data = await r.json();
  res.status(r.status).json(data);
}));

app.get('/api/me', wrap(async (req,res)=>{
  const r = await fetch(`${USER_URL}/me`, { headers:{ authorization: req.headers.authorization } });
  const data = await r.json();
  res.status(r.status).json(data);
}));

app.get('/api/wishlists/mine', wrap(async (req,res)=>{
  const data = await jget(`${WISHLIST_URL}/wishlists/mine`, { headers: { 'x-user-id': req.user.id } });
  res.json(data);
}));

app.get('/api/wishlists/friends', wrap(async (req,res)=>{
  const access = await jget(`${COLLAB_URL}/access/mine`, { headers: { 'x-user-id': req.user.id } });
  const ids = access.map(a=>a.wishlist_id);
  if(ids.length===0) return res.json([]);
  const lists = await jget(`${WISHLIST_URL}/wishlists/byIds?ids=${ids.join(',')}`, { headers: { 'x-user-id': req.user.id } });
  const roleById = Object.fromEntries(access.map(a=>[a.wishlist_id,a.role]));
  res.json(lists.map(l=>({...l, role: roleById[l.id]})));
}));

app.get('/api/wishlists/:id', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  const items = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}/items`);
  const outItems = items.map(it=>({ ...it, product: products.find(p=>p.id==it.product_id) }));
  let role = 'owner';
  if (w.owner_id !== req.user.id){
    const access = await jget(`${COLLAB_URL}/access/mine`, { headers: { 'x-user-id': req.user.id } });
    const me = access.find(a=>a.wishlist_id == w.id);
    role = me ? me.role : 'none';
  }
  res.json({ wishlist: w, items: outItems, role });
}));

app.post('/api/wishlists', wrap(async (req,res)=>{
  const w = await jpost(`${WISHLIST_URL}/wishlists`, req.body, { headers: { 'x-user-id': req.user.id, 'content-type':'application/json' } });
  res.status(201).json(w);
}));

app.post('/api/wishlists/:id/items', wrap(async (req,res)=>{
  const it = await jpost(`${WISHLIST_URL}/wishlists/${req.params.id}/items`, req.body, { headers: { 'x-user-id': req.user.id, 'content-type':'application/json' } });
  res.status(201).json(it);
}));

app.delete('/api/wishlists/:id/items/:itemId', wrap(async (req,res)=>{
  await jdel(`${WISHLIST_URL}/wishlists/${req.params.id}/items/${req.params.itemId}`);
  res.status(204).end();
}));

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

app.delete('/api/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});
  await jdel(`${COLLAB_URL}/wishlists/${req.params.id}/access/${req.params.userId}`);
  res.status(204).end();
}));

// Update display name for a user in a wishlist
app.put('/api/wishlists/:id/access/:userId', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});
  const data = await jpost(`${COLLAB_URL}/wishlists/${req.params.id}/access/${req.params.userId}`, req.body, { 
    headers: { 'x-owner-id': req.user.id, 'content-type': 'application/json' } 
  });
  res.json(data);
}));

// Create invitation (view-only only)
app.post('/api/wishlists/:id/invites', wrap(async (req,res)=>{
  const w = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`);
  if (w.owner_id !== req.user.id) return res.status(403).json({error:'owner required'});
  const data = await jpost(`${COLLAB_URL}/wishlists/${req.params.id}/invites`, {}, { headers: { 'content-type':'application/json' } });
  res.status(201).json({ ...data, inviteLink: `http://localhost:5173/wishlist/friends/invite/${data.token}` });
}));

app.get('/api/invites/:token', wrap(async (req,res)=>{
  const data = await jget(`${COLLAB_URL}/invites/${req.params.token}`);
  res.json(data);
}));

app.post('/api/invites/:token/accept', wrap(async (req,res)=>{
  const body = { display_name: (req.body.display_name || '').trim() || null };
  const data = await jpost(`${COLLAB_URL}/invites/${req.params.token}/accept`, body, { headers: { 'x-user-id': req.user.id, 'content-type': 'application/json' } });
  res.json(data);
}));

// register the error handler LAST
app.use(errorHandler);

app.listen(PORT, ()=>console.log('api-gateway on', PORT));