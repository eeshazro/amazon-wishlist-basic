// API Gateway - API Calls Version
// This version makes HTTP calls to external services (mock services)
// Simulates the real Amazon environment where you call other teams' APIs

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { userServiceClient, productServiceClient } from './src/serviceClients.js';

// Initialize Express application
const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';
const MOCK_SERVICES_URL = process.env.MOCK_SERVICES_URL || 'http://mock-services:3004';
const WISHLIST_URL = process.env.WISHLIST_SVC_URL || 'http://wishlist-service:3002';

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
app.use((err, req, res, next) => {
  console.error('GATEWAY_ERROR', err);
  res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// AUTHENTICATION ROUTES (Proxy to mock services)
// =============================================================================

// POST /auth/login - Proxy to mock services
app.post('/auth/login', wrap(async (req, res) => {
  try {
    const response = await fetch(`${MOCK_SERVICES_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Login proxy error:', error);
    res.status(500).json({ error: 'Login service unavailable' });
  }
}));

// =============================================================================
// PRODUCT ROUTES (Proxy to mock services)
// =============================================================================

// GET /products - Proxy to mock services
app.get('/products', wrap(async (req, res) => {
  try {
    const response = await fetch(`${MOCK_SERVICES_URL}/products`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Products proxy error:', error);
    res.status(500).json({ error: 'Product service unavailable' });
  }
}));

// GET /products/:id - Proxy to mock services
app.get('/products/:id', wrap(async (req, res) => {
  try {
    const response = await fetch(`${MOCK_SERVICES_URL}/products/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Product detail proxy error:', error);
    res.status(500).json({ error: 'Product service unavailable' });
  }
}));

// GET /categories - Proxy to mock services
app.get('/categories', wrap(async (req, res) => {
  try {
    const response = await fetch(`${MOCK_SERVICES_URL}/categories`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Categories proxy error:', error);
    res.status(500).json({ error: 'Product service unavailable' });
  }
}));

// =============================================================================
// WISHLIST ROUTES (Proxy to wishlist service with data enrichment)
// =============================================================================

// GET /api/wishlists/mine - Get user's wishlists with owner enrichment
app.get('/api/wishlists/mine', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/mine`, {
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    
    const wishlists = await response.json();
    
    // Enrich wishlists with owner information
    const enrichedWishlists = await Promise.all(wishlists.map(async (wishlist) => {
      try {
        const owner = await userServiceClient.getUserById(wishlist.owner_id);
        return {
          ...wishlist,
          owner: owner || { id: wishlist.owner_id, public_name: 'Unknown User' }
        };
      } catch (error) {
        console.error(`Error fetching owner ${wishlist.owner_id}:`, error);
        return {
          ...wishlist,
          owner: { id: wishlist.owner_id, public_name: 'Unknown User' }
        };
      }
    }));
    
    res.json(enrichedWishlists);
  } catch (error) {
    console.error('Wishlists proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// GET /api/wishlists/friends - Get user's access to shared wishlists
app.get('/api/wishlists/friends', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/access/mine`, {
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    
    const accessList = await response.json();
    
    // Get the actual wishlists for each access record
    const wishlistIds = accessList.map(access => access.wishlist_id);
    if (wishlistIds.length === 0) {
      return res.json([]);
    }
    
    const wishlistsResponse = await fetch(`${WISHLIST_URL}/wishlists/byIds?ids=${wishlistIds.join(',')}`, {
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (!wishlistsResponse.ok) {
      return res.status(wishlistsResponse.status).json(await wishlistsResponse.json());
    }
    
    const wishlists = await wishlistsResponse.json();
    
    // Enrich wishlists with access role information and owner details
    const enrichedWishlists = await Promise.all(wishlists.map(async (wishlist) => {
      const access = accessList.find(a => a.wishlist_id === wishlist.id);
      
      // Get owner information
      let owner = null;
      try {
        owner = await userServiceClient.getUserById(wishlist.owner_id);
      } catch (error) {
        console.error(`Error fetching owner ${wishlist.owner_id}:`, error);
        owner = { id: wishlist.owner_id, public_name: 'Unknown User' };
      }
      
      return {
        ...wishlist,
        role: access ? access.role : 'view_only',
        owner: owner || { id: wishlist.owner_id, public_name: 'Unknown User' }
      };
    }));
    
    res.json(enrichedWishlists);
  } catch (error) {
    console.error('Friends wishlists proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// GET /api/wishlists/:id/access - Get wishlist access list with user enrichment
app.get('/api/wishlists/:id/access', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/access`, {
      method: 'GET',
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    
    const accessList = await response.json();
    
    // Enrich access list with user profiles
    const enrichedAccessList = await Promise.all(accessList.map(async (access) => {
      try {
        const user = await userServiceClient.getUserById(access.user_id);
        return {
          ...access,
          user: user || { id: access.user_id, public_name: 'Unknown User' }
        };
      } catch (error) {
        console.error(`Error fetching user ${access.user_id}:`, error);
        return {
          ...access,
          user: { id: access.user_id, public_name: 'Unknown User' }
        };
      }
    }));
    
    res.json(enrichedAccessList);
  } catch (error) {
    console.error('Get access list proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// DELETE /api/wishlists/:id/access/:userId - Remove user access
app.delete('/api/wishlists/:id/access/:userId', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/access/${req.params.userId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (response.status === 204) {
      res.status(204).end();
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Remove access proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// GET /api/wishlists/:id - Get specific wishlist with owner enrichment
app.get('/api/wishlists/:id', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}`, {
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    
    const wishlist = await response.json();
    
    // Enrich wishlist with owner information
    try {
      const owner = await userServiceClient.getUserById(wishlist.owner_id);
      wishlist.owner = owner || { id: wishlist.owner_id, public_name: 'Unknown User' };
    } catch (error) {
      console.error(`Error fetching owner ${wishlist.owner_id}:`, error);
      wishlist.owner = { id: wishlist.owner_id, public_name: 'Unknown User' };
    }
    
    // Enrich items with product data
    if (wishlist.items && Array.isArray(wishlist.items)) {
      const enrichedItems = await Promise.all(wishlist.items.map(async (item) => {
        try {
          const product = await productServiceClient.getProductById(item.product_id);
          if (product) {
            return {
              ...item,
              product: product
            };
          } else {
            console.log(`Product ${item.product_id} not found for item ${item.id}`);
            return item;
          }
        } catch (error) {
          console.error(`Error fetching product ${item.product_id} for item ${item.id}:`, error);
          return item;
        }
      }));
      wishlist.items = enrichedItems;
    }
    
    res.json(wishlist);
  } catch (error) {
    console.error('Wishlist detail proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// GET /api/wishlists/:id/items - Get wishlist items with product enrichment
app.get('/api/wishlists/:id/items', wrap(async (req, res) => {
  try {
    // Get wishlist items from wishlist service
    const itemsResponse = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items`, {
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (!itemsResponse.ok) {
      return res.status(itemsResponse.status).json(await itemsResponse.json());
    }
    
    const items = await itemsResponse.json();
    
    // Enrich items with product data using service client
    const enrichedItems = await Promise.all(items.map(async (item) => {
      try {
        const product = await productServiceClient.getProductById(item.product_id);
        if (product) {
          return { ...item, product };
        } else {
          console.error(`Product not found: ${item.product_id}`);
          return { ...item, product: { id: item.product_id, title: 'Product not found' } };
        }
      } catch (error) {
        console.error(`Error fetching product ${item.product_id}:`, error);
        return { ...item, product: { id: item.product_id, title: 'Product unavailable' } };
      }
    }));
    
    res.json(enrichedItems);
  } catch (error) {
    console.error('Wishlist items proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// POST /api/wishlists - Create new wishlist
app.post('/api/wishlists', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Create wishlist proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// POST /api/wishlists/:id/items - Add item to wishlist
app.post('/api/wishlists/:id/items', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Add item proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// DELETE /api/wishlists/:id/items/:itemId - Remove item from wishlist
app.delete('/api/wishlists/:id/items/:itemId', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/items/${req.params.itemId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      }
    });
    
    if (response.status === 204) {
      res.status(204).send();
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Remove item proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// =============================================================================
// USER ROUTES (Proxy to mock services)
// =============================================================================

// GET /api/me - Get current user profile
app.get('/api/me', wrap(async (req, res) => {
  try {
    const response = await fetch(`${MOCK_SERVICES_URL}/me`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Mock service error', details: text });
    }
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Current user profile proxy error:', error);
    res.status(500).json({ error: 'User service unavailable' });
  }
}));

// GET /api/users/:id - Get user profile
app.get('/api/users/:id', wrap(async (req, res) => {
  try {
    const response = await fetch(`${MOCK_SERVICES_URL}/users/${req.params.id}`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('User profile proxy error:', error);
    res.status(500).json({ error: 'User service unavailable' });
  }
}));

// =============================================================================
// INVITE ROUTES (Proxy to wishlist service)
// =============================================================================

// POST /api/wishlists/:id/invites - Create an invitation for a wishlist
app.post('/api/wishlists/:id/invites', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/invites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    // If successful, create the invite link
    if (response.ok && data.token) {
      // Generate invite link for the frontend (port 5173)
      const frontendHost = req.get('host').replace(':8080', ':5173');
      const inviteLink = `${req.protocol}://${frontendHost}/wishlist/friends/invite/${data.token}`;
      res.status(response.status).json({
        ...data,
        inviteLink: inviteLink
      });
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Create invite proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// GET /api/invites/:token - Get invite details (public)
app.get('/api/invites/:token', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/invites/${req.params.token}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Invite details proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));

// POST /api/invites/:token/accept - Accept invite
app.post('/api/invites/:token/accept', wrap(async (req, res) => {
  try {
    const response = await fetch(`${WISHLIST_URL}/invites/${req.params.token}/accept`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'x-user-id': req.user.id.toString()
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Accept invite proxy error:', error);
    res.status(500).json({ error: 'Wishlist service unavailable' });
  }
}));


// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`API Gateway (API Calls) running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});