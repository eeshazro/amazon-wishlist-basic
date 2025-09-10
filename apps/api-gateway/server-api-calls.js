// API Gateway - API Calls Version
// This version simulates the real Amazon environment where you proxy to external services
// and handle data enrichment between services

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// Initialize Express application
const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';
const MOCK_SERVICES_URL = process.env.MOCK_SERVICES_URL || 'http://mock-services:3004';
const WISHLIST_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';

// Authentication middleware
function auth(req, res, next) {
  // Allow public routes without authentication
  if (req.path === '/health') return next();
  if (req.path.startsWith('/products')) return next();
  if (req.path.startsWith('/categories')) return next();
  if (req.path.startsWith('/auth/login')) return next();
  if (req.method === 'GET' && req.path.startsWith('/api/invites/')) return next();

  // Extract and validate JWT token
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Health check endpoint (before auth middleware)
app.get('/health', (req, res) => res.json({ ok: true, service: 'api-gateway' }));

// Apply authentication middleware to all routes
app.use(auth);

// Async route wrapper
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handling
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
});

function errorHandler(err, req, res, next) {
  console.error('GATEWAY_ERROR', err);
  const status = err.status || 502;
  let message = err.message || 'Internal error';
  try {
    const parsed = JSON.parse(message);
    message = parsed.error || message;
  } catch (_) {}
  res.status(status).json({ error: message });
}

app.use(errorHandler);

// Helper function for making HTTP requests
async function jget(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function jpost(url, body, options = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    ...options
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

// =============================================================================
// AUTHENTICATION ENDPOINTS (proxied to mock user service)
// =============================================================================

// POST /auth/login - Login endpoint
app.post('/auth/login', wrap(async (req, res) => {
  try {
    const response = await jpost(`${MOCK_SERVICES_URL}/auth/login`, req.body);
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}));

// GET /me - Get current user profile
app.get('/me', wrap(async (req, res) => {
  try {
    const response = await jget(`${MOCK_SERVICES_URL}/me`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}));

// =============================================================================
// PRODUCT ENDPOINTS (proxied to mock product service)
// =============================================================================

// GET /products - Return all products from the catalog
app.get('/products', wrap(async (req, res) => {
  try {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const response = await jget(`${PRODUCT_SERVICE_URL}/products${queryString}`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}));

// GET /products/:id - Return a specific product by ID
app.get('/products/:id', wrap(async (req, res) => {
  try {
    const response = await jget(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}));

// GET /products/byIds - Return multiple products by IDs
app.get('/products/byIds', wrap(async (req, res) => {
  try {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const response = await jget(`${MOCK_SERVICES_URL}/products/byIds${queryString}`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}));

// GET /categories - Return all available product categories
app.get('/categories', wrap(async (req, res) => {
  try {
    const response = await jget(`${MOCK_SERVICES_URL}/categories`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}));

// GET /products/search - Advanced search endpoint
app.get('/products/search', wrap(async (req, res) => {
  try {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const response = await jget(`${MOCK_SERVICES_URL}/products/search${queryString}`);
    res.json(response);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
}));

// =============================================================================
// WISHLIST ENDPOINTS (proxied to wishlist service with enrichment)
// =============================================================================

// GET /api/wishlists/mine - Get user's wishlists
app.get('/api/wishlists/mine', wrap(async (req, res) => {
  try {
    const response = await jget(`${WISHLIST_URL}/wishlists/mine`, {
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error fetching user wishlists:', error);
    res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
}));

// GET /api/wishlists/byIds - Get multiple wishlists by IDs
app.get('/api/wishlists/byIds', wrap(async (req, res) => {
  try {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const response = await jget(`${WISHLIST_URL}/wishlists/byIds${queryString}`, {
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error fetching wishlists by IDs:', error);
    res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
}));

// GET /api/wishlists/:id - Get specific wishlist
app.get('/api/wishlists/:id', wrap(async (req, res) => {
  try {
    const response = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}`, {
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
}));

// GET /api/wishlists/:id/items - Get wishlist items with enrichment
app.get('/api/wishlists/:id/items', wrap(async (req, res) => {
  try {
    const response = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}/items`, {
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error fetching wishlist items:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist items' });
  }
}));

// POST /api/wishlists - Create new wishlist
app.post('/api/wishlists', wrap(async (req, res) => {
  try {
    const response = await jpost(`${WISHLIST_URL}/wishlists`, req.body, {
      headers: { 'x-user-id': req.user.id }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating wishlist:', error);
    res.status(500).json({ error: 'Failed to create wishlist' });
  }
}));

// POST /api/wishlists/:id/items - Add item to wishlist
app.post('/api/wishlists/:id/items', wrap(async (req, res) => {
  try {
    const response = await jpost(`${WISHLIST_URL}/wishlists/${req.params.id}/items`, req.body, {
      headers: { 'x-user-id': req.user.id }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
}));

// DELETE /api/wishlists/:id/items/:itemId - Remove item from wishlist
app.delete('/api/wishlists/:id/items/:itemId', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items/${req.params.itemId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': req.user.id }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error removing item from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove item from wishlist' });
  }
}));

// =============================================================================
// COLLABORATION ENDPOINTS (proxied to wishlist service with enrichment)
// =============================================================================

// GET /api/access/mine - Get user's access to shared wishlists
app.get('/api/access/mine', wrap(async (req, res) => {
  try {
    const response = await jget(`${WISHLIST_URL}/access/mine`, {
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error fetching user access:', error);
    res.status(500).json({ error: 'Failed to fetch access' });
  }
}));

// GET /api/wishlists/:id/access - Get wishlist collaborators with user enrichment
app.get('/api/wishlists/:id/access', wrap(async (req, res) => {
  try {
    const response = await jget(`${WISHLIST_URL}/wishlists/${req.params.id}/access`, {
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error fetching wishlist access:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist access' });
  }
}));

// POST /api/wishlists/:id/invites - Create invitation
app.post('/api/wishlists/:id/invites', wrap(async (req, res) => {
  try {
    const response = await jpost(`${WISHLIST_URL}/wishlists/${req.params.id}/invites`, req.body, {
      headers: { 'x-user-id': req.user.id }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
}));

// GET /api/invites/:token - Get invitation details (public)
app.get('/api/invites/:token', wrap(async (req, res) => {
  try {
    const response = await jget(`${WISHLIST_URL}/invites/${req.params.token}`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
}));

// POST /api/invites/:token/accept - Accept invitation
app.post('/api/invites/:token/accept', wrap(async (req, res) => {
  try {
    const response = await jpost(`${WISHLIST_URL}/invites/${req.params.token}/accept`, req.body, {
      headers: { 'x-user-id': req.user.id }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
}));

// DELETE /api/wishlists/:id/access/:userId - Remove user access
app.delete('/api/wishlists/:id/access/:userId', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/access/${req.params.userId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': req.user.id }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error removing user access:', error);
    res.status(500).json({ error: 'Failed to remove user access' });
  }
}));

// PUT /api/wishlists/:id/access/:userId - Update user role
app.put('/api/wishlists/:id/access/:userId', wrap(async (req, res) => {
  try {
    const response = await jpost(`${WISHLIST_URL}/wishlists/${req.params.id}/access/${req.params.userId}`, req.body, {
      method: 'PUT',
      headers: { 'x-user-id': req.user.id }
    });
    res.json(response);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}));

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway (API Calls) running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
