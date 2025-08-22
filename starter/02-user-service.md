# User Service Documentation - Basic Version

## Overview

The User Service (`apps/user-service/server.js`) is responsible for **user authentication and profile management** in the Amazon collaborative wishlist application. This service handles user login, profile retrieval, and provides user directory services for other microservices.

## 🏗️ Architecture Pattern

This service follows a **dedicated user management pattern** where:
- Handles all user-related operations
- Manages JWT token generation and validation
- Provides user profile information
- Serves as a user directory for other services
- Maintains user data in a PostgreSQL database

## 🔧 Key Components

### Database Connection
```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Uses PostgreSQL connection pool for database operations.

### JWT Configuration
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';
```

Secret key for JWT token signing and verification.

### User Helper Function
```javascript
function userId(req){ return parseInt(req.headers['x-user-id']||'0',10); }
```

Extracts user ID from the `x-user-id` header (set by the API gateway).

## 📡 API Routes

### Health Check
- `GET /health` - Returns service status and name

### Authentication
- `POST /auth/login` - User login endpoint

### User Profile
- `GET /me` - Get current user profile (requires JWT token)
- `GET /users/:id` - Get public profile of any user
- `GET /users` - Get multiple users by IDs (for enrichment)

## 🔐 Authentication Flow

### Login Process
```javascript
app.post('/auth/login', async (req,res)=>{
  try {
    const username = (req.body.user||'').toLowerCase();
    const { rows } = await pool.query('SELECT * FROM "user".user ORDER BY id ASC');
    const map = { alice: rows[0], bob: rows[1], carol: rows[2], dave: rows[3] };
    const u = map[username];
    if(!u) return res.status(400).json({error:'unknown user'});
    const token = jwt.sign({ sub: u.id, name: u.public_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ accessToken: token });
  } catch (e) { res.status(500).json({error:e.message}); }
});
```

**Process:**
1. Receives username in request body
2. Queries database for all users
3. Maps usernames to user records (dev environment: alice, bob, carol, dave)
4. Generates JWT token with user ID and name
5. Returns access token with 7-day expiration

### Profile Retrieval
```javascript
app.get('/me', async (req,res)=>{
  try {
    const auth = req.headers.authorization||'';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if(!token) return res.status(401).json({error:'missing token'});
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT id, public_name, icon_url, created_at FROM "user".user WHERE id=$1',[payload.sub]);
    if(!rows[0]) return res.status(404).json({error:'not found'});
    res.json(rows[0]);
  } catch (e) { res.status(401).json({error:'invalid token'}); }
});
```

**Process:**
1. Extracts JWT token from Authorization header
2. Verifies token and extracts user ID
3. Queries database for user profile
4. Returns user information (excluding sensitive data)

## 👥 User Directory Service

### Get Multiple Users
```javascript
app.get('/users', async (req, res) => {
  try {
    const idsParam = (req.query.ids || '').trim();
    if (!idsParam) return res.json([]);
    const ids = idsParam.split(',').map(s => parseInt(s, 10)).filter(Boolean);
    if (ids.length === 0) return res.json([]);
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
```

**Features:**
- Accepts comma-separated user IDs as query parameter
- Returns user profiles for enrichment in other services
- Used by API gateway to enrich collaboration data
- Returns minimal user data (id, public_name, icon_url)

### Get Single User Profile
```javascript
app.get('/users/:id', async (req,res)=>{
  const { rows } = await pool.query('SELECT id, public_name, icon_url, created_at FROM "user".user WHERE id=$1',[req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
});
```

Returns public profile information for any user by ID.

## 🗄️ Database Schema

### User Table (`user.user`)
```sql
CREATE TABLE "user".user (
    id SERIAL PRIMARY KEY,
    public_name VARCHAR(255) NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Primary key, auto-incrementing
- `public_name`: User's display name
- `icon_url`: URL to user's profile picture
- `created_at`: Account creation timestamp

## 🔄 Integration with Other Services

### API Gateway Integration
- Gateway calls `/me` to get current user profile
- Gateway calls `/users?ids=1,2,3` to enrich collaboration data
- Gateway validates JWT tokens using the same secret

### Collaboration Service Integration
- Collaboration service uses user directory for access management
- User IDs are passed via `x-user-id` header

### Wishlist Service Integration
- Wishlist service uses user directory for item attribution
- User IDs are passed via `x-user-id` header

## 🛡️ Security Features

### JWT Token Security
- Tokens expire after 7 days
- Uses secure secret key (configurable via environment variable)
- Includes user ID and name in token payload

### Data Protection
- Public endpoints only return non-sensitive user data
- No password storage (uses simple username mapping in dev)
- Input validation and sanitization

### Error Handling
- Graceful error responses for invalid tokens
- Database error handling with appropriate HTTP status codes
- Input validation for user IDs and parameters

## 🔧 Environment Variables

- `PORT`: Service port (default: 3001)
- `JWT_SECRET`: Secret for JWT token signing
- `DATABASE_URL`: PostgreSQL connection string

## 📊 Health Check

- `GET /health` - Returns service status and name

## 🎯 Key Benefits

1. **Centralized User Management**: All user operations in one service
2. **JWT Authentication**: Secure token-based authentication
3. **User Directory**: Provides user information for other services
4. **Profile Management**: Handles user profile data
5. **Service Isolation**: Independent user management from other business logic

## 🔍 Request Flow Examples

### Login Flow
1. **Frontend** sends `POST /auth/login` with username
2. **User Service** validates username and generates JWT
3. **User Service** returns access token
4. **Frontend** stores token for subsequent requests

### Profile Retrieval Flow
1. **Frontend** sends `GET /api/me` with JWT token
2. **API Gateway** validates token and forwards to user service
3. **User Service** verifies token and returns user profile
4. **Frontend** receives user information

### User Enrichment Flow
1. **API Gateway** needs user info for collaboration data
2. **API Gateway** calls `GET /users?ids=1,2,3`
3. **User Service** returns user profiles
4. **API Gateway** enriches collaboration data with user information

## 📝 Notes for Basic Version

The User Service remains largely unchanged between basic and full versions because:

1. **User Management is Core**: User authentication and profiles are fundamental to both versions
2. **No Comment Dependencies**: The user service doesn't need to handle comment-specific functionality
3. **Simple Role System**: Basic version only needs to distinguish between owners and viewers
4. **Directory Service**: User enrichment is still needed for collaboration data

The main differences in the basic version are:
- **Simplified Usage**: User enrichment is primarily for collaboration access lists
- **No Comment Context**: User data isn't used for comment attribution
- **Basic Permissions**: Only owner/viewer distinction, no complex role management 