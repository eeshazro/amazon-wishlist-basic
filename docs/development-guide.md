# Development Guide - Amazon Collaborative Wishlist

This guide provides comprehensive instructions for setting up, developing, and contributing to the Amazon Collaborative Wishlist system.

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** - For containerized development
- **Node.js 16+** - For local development (optional)
- **Git** - For version control

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd amazon-wishlist-basic
   ```

2. **Start all services:**
   ```bash
   cd ops
   docker-compose up -d
   ```

3. **Verify services are running:**
   ```bash
   docker-compose ps
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:8080
   - Database: localhost:5432

## 🏗️ Architecture Overview

### Service Structure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Gateway   │    │  Mock Services  │
│   (React/Vite)  │◄──►│   (Express.js)  │◄──►│  (User + Product│
└─────────────────┘    └─────────────────┘    │   APIs)         │
│                              │              └─────────────────┘
│                              ▼
│                       ┌─────────────────┐
│                       │ Wishlist Service│
│                       │   (Your Code)   │
│                       │  (API Calls)    │
│                       └─────────────────┘
│                              │
│                              ▼
│                       ┌─────────────────┐
│                       │   PostgreSQL    │
│                       │   (Your DB)     │
│                       └─────────────────┘
```

### Service Responsibilities

- **Mock Services** (Port 3004) - Simulates external teams' user and product services
- **Wishlist Service** (Port 3002) - Your team's service that makes API calls to external services
- **API Gateway** (Port 8080) - Central entry point with authentication and routing
- **Web Frontend** (Port 5173) - React application with smart navigation
- **PostgreSQL** (Port 5432) - Wishlist service's database

## 🔧 Development Workflow

### 1. Making Changes to Wishlist Service

The wishlist service is your team's main codebase:

```bash
# Edit files in apps/wishlist-service/
vim apps/wishlist-service/server.js

# Rebuild and restart the service
cd ops
docker-compose up -d --build wishlist-service
```

### 2. Making Changes to API Gateway

```bash
# Edit files in apps/api-gateway/
vim apps/api-gateway/server.js

# Rebuild and restart the service
cd ops
docker-compose up -d --build api-gateway
```

### 3. Making Changes to Frontend

```bash
# Edit files in apps/web-frontend/
vim apps/web-frontend/src/components/SomeComponent.jsx

# Rebuild and restart the service
cd ops
docker-compose up -d --build web-frontend
```

### 4. Database Changes

```bash
# Edit schema files in db/init/
vim db/init/01_tables.sql

# Rebuild database container
cd ops
docker-compose up -d --build postgres
```

## 🗄️ Database Development

### Schema Management

The database schema is defined in `db/init/`:

- `01_tables.sql` - Table definitions
- `02_seed.sql` - Sample data
- `03_test_data.sql` - Test data for development

### Connecting to Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U wishlist_user -d wishlist_db

# Or use the connection string
psql postgresql://wishlist_user:wishlist_pass@localhost:5432/wishlist_db
```

### Common Database Operations

```sql
-- View all tables
\dt

-- View wishlist data
SELECT * FROM wishlist;

-- View wishlist access
SELECT * FROM wishlist_access;

-- View wishlist items
SELECT * FROM wishlist_item;

-- View wishlist invites
SELECT * FROM wishlist_invite;
```

## 🔌 API Development

### Adding New Endpoints

1. **Add to Wishlist Service** (`apps/wishlist-service/server.js`):
   ```javascript
   app.get('/wishlists/:id/custom-endpoint', wrap(async (req, res) => {
     const uid = userId(req);
     const wishlistId = req.params.id;
     
     // Your implementation here
     res.json({ message: 'Success' });
   }));
   ```

2. **Add to API Gateway** (`apps/api-gateway/server.js`):
   ```javascript
   app.get('/api/wishlists/:id/custom-endpoint', wrap(async (req, res) => {
     try {
       const response = await fetch(`${WISHLIST_URL}/wishlists/${req.params.id}/custom-endpoint`, {
         headers: { 
           'Authorization': req.headers.authorization,
           'x-user-id': req.user.id.toString()
         }
       });
       
       const data = await response.json();
       res.status(response.status).json(data);
     } catch (error) {
       console.error('Custom endpoint proxy error:', error);
       res.status(500).json({ error: 'Wishlist service unavailable' });
     }
   }));
   ```

3. **Add to Frontend** (if needed):
   ```javascript
   const response = await fetch(`${API}/api/wishlists/${id}/custom-endpoint`, {
     headers: { authorization: `Bearer ${auth.token}` }
   });
   const data = await response.json();
   ```

### Testing API Endpoints

```bash
# Test with curl
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/wishlists

# Test with authentication
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user": "alice"}'
```

## 🧪 Testing

### Manual Testing

1. **Test User Flow:**
   - Login as different users (alice, bob, carol)
   - Create wishlists
   - Add items to wishlists
   - Share wishlists via invitations
   - Accept invitations
   - Manage collaborators

2. **Test API Endpoints:**
   - Use curl or Postman to test all endpoints
   - Verify authentication works
   - Test error handling

### Automated Testing

```bash
# Run tests (when implemented)
npm test

# Run specific test suite
npm test -- --grep "wishlist"
```

## 🐛 Debugging

### Viewing Logs

```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs wishlist-service
docker-compose logs api-gateway
docker-compose logs mock-services

# Follow logs in real-time
docker-compose logs -f wishlist-service
```

### Common Issues

1. **Service Won't Start:**
   ```bash
   # Check if ports are available
   lsof -i :3002
   lsof -i :8080
   
   # Restart specific service
   docker-compose restart wishlist-service
   ```

2. **Database Connection Issues:**
   ```bash
   # Check database status
   docker-compose exec postgres pg_isready
   
   # View database logs
   docker-compose logs postgres
   ```

3. **External Service Issues:**
   ```bash
   # Test mock services
   curl http://localhost:3004/health
   curl http://localhost:3004/users
   curl http://localhost:3004/products
   ```

### Debugging Tips

1. **Add Console Logs:**
   ```javascript
   console.log('Debug info:', { userId, wishlistId, data });
   ```

2. **Use Browser DevTools:**
   - Network tab to see API calls
   - Console for JavaScript errors
   - Application tab for local storage

3. **Database Debugging:**
   ```sql
   -- Check if data exists
   SELECT COUNT(*) FROM wishlist;
   SELECT COUNT(*) FROM wishlist_access;
   
   -- Check specific records
   SELECT * FROM wishlist WHERE id = 1;
   ```

## 🔄 Adding Collaboration Features

### 1. Edit Permissions

See [collaboration-guide.md](collaboration-guide.md) for detailed instructions.

### 2. Comments System

The infrastructure is ready. Follow the collaboration guide to implement.

### 3. Real-time Updates

Add WebSocket support following the patterns in the collaboration guide.

## 📦 Deployment

### Production Considerations

1. **Environment Variables:**
   ```bash
   # Set production values
   export JWT_SECRET="your-production-secret"
   export DATABASE_URL="your-production-db-url"
   export MOCK_SERVICES_URL="your-production-mock-services-url"
   ```

2. **Security:**
   - Use strong JWT secrets
   - Enable HTTPS
   - Set up proper CORS policies
   - Add rate limiting

3. **Monitoring:**
   - Add health checks
   - Set up logging
   - Monitor external service calls
   - Add metrics collection

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

### Code Style

- Follow existing patterns in the codebase
- Use consistent naming conventions
- Add comments for complex logic
- Handle errors gracefully

### Pull Request Process

1. **Create Feature Branch:**
   ```bash
   git checkout -b feature/new-collaboration-feature
   ```

2. **Make Changes:**
   - Follow the architecture patterns
   - Add tests for new functionality
   - Update documentation

3. **Test Changes:**
   ```bash
   # Test locally
   docker-compose up -d
   # Run manual tests
   ```

4. **Submit Pull Request:**
   - Describe the changes
   - Include test instructions
   - Update relevant documentation

### Development Guidelines

1. **Service Boundaries:**
   - Keep wishlist service focused on wishlist domain
   - Make HTTP calls to external services
   - Don't duplicate external service logic

2. **Error Handling:**
   - Handle external service failures gracefully
   - Provide meaningful error messages
   - Log errors for debugging

3. **Data Enrichment:**
   - Enrich data by calling external services
   - Handle cases where external services are unavailable
   - Cache responses when appropriate

## 📚 Resources

### Documentation

- [API Specifications](api_specifications.md) - Complete API documentation
- [Collaboration Guide](collaboration-guide.md) - Guide for adding collaboration features
- [Architecture Overview](README.md) - System architecture and design decisions

### External Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Getting Help

### Common Questions

1. **Q: How do I add a new user?**
   A: Edit `apps/mock-services/data/users.json` and restart the mock-services container.

2. **Q: How do I add new products?**
   A: Edit `apps/mock-services/data/products.json` and restart the mock-services container.

3. **Q: How do I reset the database?**
   A: Run `docker-compose down` and `docker-compose up -d` to recreate all containers.

4. **Q: How do I debug API calls?**
   A: Check the browser Network tab and service logs using `docker-compose logs`.

### Troubleshooting

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Test external services: `curl http://localhost:3004/health`
4. Check database connectivity: `docker-compose exec postgres pg_isready`

This development guide should help you get started and contribute effectively to the Amazon Collaborative Wishlist system!
