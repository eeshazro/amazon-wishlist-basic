// User Service - Manages user authentication, profiles, and user directory
// This service handles user login, profile management, and provides user information
// to other services for enrichment purposes

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

// Initialize Express application
const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Configuration
const PORT = process.env.PORT || 3001; // Default port 3001, can be overridden by environment
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me'; // JWT signing secret
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); // PostgreSQL connection pool

// Health check endpoint - used by load balancers and monitoring systems
app.get('/health', (req,res)=>res.json({ok:true, service:'user-service'}));

// POST /auth/login - Development login endpoint
// Body: { user: 'alice' | 'bob' | 'carol' | 'dave' }
// Returns: JWT access token for the specified user
// Note: This is a simplified login for development/demo purposes
app.post('/auth/login', async (req,res)=>{
  try {
    const username = (req.body.user||'').toLowerCase(); // Normalize username to lowercase
    const { rows } = await pool.query('SELECT * FROM "user".user ORDER BY id ASC'); // Get all users
    const map = { alice: rows[0], bob: rows[1], carol: rows[2], dave: rows[3] }; // Map usernames to user records
    const u = map[username];
    if(!u) return res.status(400).json({error:'unknown user'}); // Return error for unknown users
    
    // Generate JWT token with user ID and name, expires in 7 days
    const token = jwt.sign({ sub: u.id, name: u.public_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ accessToken: token });
  } catch (e) { res.status(500).json({error:e.message}); }
});

// GET /me - Get current user's profile (requires JWT authentication)
// Headers: Authorization: Bearer <token>
// Returns: User profile information
app.get('/me', async (req,res)=>{
  try {
    // Extract and validate JWT token
    const auth = req.headers.authorization||'';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if(!token) return res.status(401).json({error:'missing token'});
    
    const payload = jwt.verify(token, JWT_SECRET); // Verify token and extract payload
    const { rows } = await pool.query('SELECT id, public_name, icon_url, created_at FROM "user".user WHERE id=$1',[payload.sub]);
    if(!rows[0]) return res.status(404).json({error:'not found'});
    res.json(rows[0]);
  } catch (e) { res.status(401).json({error:'invalid token'}); }
});

// GET /users/:id - Get public profile of any user
// Returns: Public user information (id, public_name, icon_url, created_at)
app.get('/users/:id', async (req,res)=>{
  const { rows } = await pool.query('SELECT id, public_name, icon_url, created_at FROM "user".user WHERE id=$1',[req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
});

// GET /users - User directory for bulk user lookups
// Query params: ids - comma-separated list of user IDs
// Returns: Array of user objects with basic information
// Used by other services to enrich user data (names, icons, etc.)
app.get('/users', async (req, res) => {
  try {
    const idsParam = (req.query.ids || '').trim();
    if (!idsParam) return res.json([]); // Return empty array if no IDs provided
    
    // Parse and validate user IDs
    const ids = idsParam.split(',').map(s => parseInt(s, 10)).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    
    // Query database for users with the specified IDs
    const { rows } = await pool.query(
      'SELECT id, public_name, icon_url FROM "user".user WHERE id = ANY($1::int[])',
      [ids]
    );
    res.json(rows);
  } catch (err) {
    console.error('USER_SVC /users error', err);
    res.status(500).json({ error: 'failed to fetch users' });
  }
});

// Start the server and log the port
app.listen(PORT, ()=>console.log('user-service on', PORT));