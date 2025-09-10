// Mock Services - Simulates external user-service and product-service APIs
// This simulates the real Amazon environment where you'd call other teams' services
// In production, these would be separate services owned by different teams

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import url from 'url';

// Initialize Express application
const app = express();
app.use(cors());
app.use(express.json());

// Set up __dirname for ES modules compatibility
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Configuration
const PORT = process.env.PORT || 3004;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';

// Load test data
const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/users.json'), 'utf-8'));
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/products.json'), 'utf-8'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'mock-services' }));

// =============================================================================
// USER SERVICE MOCK API (simulates identity team's service)
// =============================================================================

// POST /auth/login - Development login endpoint
app.post('/auth/login', (req, res) => {
  try {
    const username = (req.body.user || '').toLowerCase();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(400).json({ error: 'unknown user' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, name: user.public_name }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.json({ accessToken: token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /me - Get current user's profile (requires JWT authentication)
app.get('/me', (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'missing token' });
    }
    
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === payload.sub);
    
    if (!user) {
      return res.status(404).json({ error: 'not found' });
    }
    
    // Return only public profile fields
    res.json({
      id: user.id,
      public_name: user.public_name,
      icon_url: user.icon_url,
      created_at: user.created_at
    });
  } catch (e) {
    res.status(401).json({ error: 'invalid token' });
  }
});

// GET /users/:id - Get public profile of any user
app.get('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'not found' });
    }
    
    res.json({
      id: user.id,
      public_name: user.public_name,
      icon_url: user.icon_url,
      created_at: user.created_at
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /users - User directory for bulk user lookups
app.get('/users', (req, res) => {
  try {
    const idsParam = (req.query.ids || '').trim();
    if (!idsParam) return res.json([]);
    
    const ids = idsParam.split(',').map(s => parseInt(s, 10)).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    
    const foundUsers = users
      .filter(u => ids.includes(u.id))
      .map(u => ({
        id: u.id,
        public_name: u.public_name,
        icon_url: u.icon_url
      }));
    
    res.json(foundUsers);
  } catch (err) {
    console.error('USER_SVC /users error', err);
    res.status(500).json({ error: 'failed to fetch users' });
  }
});

// =============================================================================
// PRODUCT SERVICE MOCK API (simulates catalog team's service)
// =============================================================================

// GET /products - Return all products from the catalog
app.get('/products', (req, res) => {
  try {
    let filteredProducts = [...products];
    
    // Filter by category if provided
    if (req.query.category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }
    
    // Search by title or description if provided
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    
    res.json({
      products: paginatedProducts,
      total: filteredProducts.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /products/:id - Return a specific product by ID
app.get('/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /products/byIds - Return multiple products by IDs
app.get('/products/byIds', (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean).map(id => parseInt(id));
    
    if (ids.length === 0) {
      return res.json([]);
    }
    
    const foundProducts = products.filter(p => ids.includes(p.id));
    res.json(foundProducts);
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /categories - Return all available product categories
app.get('/categories', (req, res) => {
  try {
    const categories = [...new Set(products.map(p => p.category))].sort();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /products/search - Advanced search endpoint
app.get('/products/search', (req, res) => {
  try {
    let filteredProducts = [...products];
    
    // Text search
    if (req.query.q) {
      const searchTerm = req.query.q.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.retailer.toLowerCase().includes(searchTerm)
      );
    }
    
    // Category filter
    if (req.query.category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }
    
    // Price range filter
    if (req.query.minPrice) {
      const minPrice = parseFloat(req.query.minPrice);
      filteredProducts = filteredProducts.filter(p => p.price >= minPrice);
    }
    
    if (req.query.maxPrice) {
      const maxPrice = parseFloat(req.query.maxPrice);
      filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
    }
    
    // Rating filter
    if (req.query.rating) {
      const minRating = parseFloat(req.query.rating);
      filteredProducts = filteredProducts.filter(p => p.rating >= minRating);
    }
    
    // Sort by relevance (for now, just by rating descending)
    filteredProducts.sort((a, b) => b.rating - a.rating);
    
    // Apply pagination
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    
    res.json({
      products: paginatedProducts,
      total: filteredProducts.length,
      limit,
      offset,
      query: req.query
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Mock Services running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`User API: http://localhost:${PORT}/auth/login`);
  console.log(`Product API: http://localhost:${PORT}/products`);
});
