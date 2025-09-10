# Amazon Wishlist - API Calls Architecture

This version simulates the **real Amazon work environment** where you only own the wishlist service and make HTTP API calls to other teams' services.

## 🎯 What This Simulates

At Amazon, when you're on the wishlist team, you would:
- ✅ **Own only the wishlist service** - Your team's codebase
- ✅ **Make HTTP calls** to user-service (identity team) and product-service (catalog team)
- ✅ **Handle data enrichment** - Combine data from multiple services
- ✅ **Deal with service dependencies** - Other teams' APIs can change or be unavailable
- ✅ **Work with external service contracts** - You don't control the user or product APIs

## 🏗️ Architecture Overview

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

## 🔄 Key Differences from Original

| Original Architecture | API Calls Architecture |
|----------------------|------------------------|
| All services in one repo | Only wishlist service code |
| Direct database access | HTTP API calls to external services |
| Simple local development | Service discovery and dependencies |
| Full system control | Dependencies on other teams |
| Monolithic understanding | Microservice boundaries |

## 🚀 Running the System

### Quick Start

```bash
# Start all services
cd ops
docker-compose up -d
```

### Access Points

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:8080
- **Wishlist Service**: http://localhost:3002
- **Mock Services**: http://localhost:3004
- **Database**: localhost:5432

## 📁 Your Team's Repository Structure

```
amazon-wishlist-basic/               # Your team's codebase
├── apps/
│   ├── wishlist-service/           # Your service (makes API calls)
│   │   ├── src/
│   │   │   └── serviceClients.js   # HTTP clients for external services
│   │   ├── server.js               # Your service implementation
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── api-gateway/                # Central API entry point
│   ├── mock-services/              # Simulates external teams' services
│   └── web-frontend/               # React frontend
├── db/                             # Your database schema
└── ops/                            # Deployment configuration
```

## 🔧 Service Clients (Your Code)

You create HTTP clients to call other teams' services:

```javascript
// src/serviceClients.js
export class UserServiceClient {
  async getCurrentUser(authToken) {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return response.json();
  }
  
  async getUsersByIds(userIds) {
    const response = await fetch(`${this.baseUrl}/users?ids=${userIds.join(',')}`);
    return response.json();
  }
}
```

## 🌐 API Calls in Your Service

Your wishlist service makes HTTP calls instead of direct database access:

```javascript
// server-api-calls.js
app.get('/wishlists/:id/items', async (req, res) => {
  // Get items from your database
  const { rows } = await pool.query('SELECT * FROM wishlist_item WHERE wishlist_id=$1', [req.params.id]);
  
  // Enrich with product data from external service
  const enrichedItems = await Promise.all(
    rows.map(async (item) => {
      const product = await productServiceClient.getProductById(item.product_id);
      return { ...item, product };
    })
  );
  
  res.json(enrichedItems);
});
```

## 🎭 Mock Services (Simulates Other Teams)

The mock services simulate what other teams would provide:

```javascript
// Mock User Service (Identity Team)
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  res.json(user);
});

// Mock Product Service (Catalog Team)  
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  res.json(product);
});
```

## 🔄 Data Flow Example

1. **Frontend** calls API Gateway: `GET /api/wishlists/123/items`
2. **API Gateway** calls your Wishlist Service: `GET /wishlists/123/items`
3. **Your Service** queries your database for items
4. **Your Service** calls Product Service: `GET /products/456`
5. **Your Service** enriches items with product data
6. **Your Service** returns enriched data to API Gateway
7. **API Gateway** returns data to Frontend

## 🎓 What You Learn

### Real Amazon Experience
- **Service Boundaries**: Understanding what your team owns vs. depends on
- **API Contracts**: Working with other teams' service interfaces
- **Data Enrichment**: Combining data from multiple services
- **Error Handling**: Dealing with external service failures
- **Service Discovery**: Finding and calling other services

### Technical Skills
- **HTTP Client Design**: Creating robust service clients
- **Async Programming**: Handling multiple API calls
- **Error Resilience**: Graceful degradation when services are down
- **Data Transformation**: Enriching responses with external data

## 🐛 Common Challenges (Realistic!)

### Service Dependencies
```javascript
// What happens when user service is down?
try {
  const user = await userServiceClient.getUserById(userId);
  return { ...item, user };
} catch (error) {
  console.error('User service unavailable:', error);
  return { ...item, user: { id: userId, name: 'Unknown User' } };
}
```

### API Changes
```javascript
// Other team changes their API - you need to update your client
// Old: /users/profile
// New: /users/me
const response = await fetch(`${this.baseUrl}/users/me`); // Updated endpoint
```

### Performance Considerations
```javascript
// Batch requests instead of individual calls
const userIds = items.map(item => item.added_by);
const users = await userServiceClient.getUsersByIds(userIds); // One call instead of many
```

## 🎯 Current Implementation Status

This system is now fully implemented with:

- ✅ **Mock Services** - Simulates user and product services from other teams
- ✅ **Wishlist Service** - Makes HTTP API calls to external services
- ✅ **API Gateway** - Handles authentication and data enrichment
- ✅ **Frontend** - React application with full functionality
- ✅ **Database** - PostgreSQL with wishlist domain tables
- ✅ **Collaboration Features** - Invitations, access control, user management

## 📚 Next Steps for Collaboration Features

1. **Add Edit Permissions** - Implement `view_edit` role for collaborators
2. **Build Comments System** - Add commenting on wishlist items
3. **Real-time Updates** - WebSocket integration for live collaboration
4. **Notification System** - Email/SMS notifications for changes
5. **Advanced Permissions** - Granular role-based access control

See **[docs/collaboration-guide.md](docs/collaboration-guide.md)** for detailed implementation instructions.

## 🎯 Why This Matters

This architecture teaches you:
- **How Amazon actually works** - You don't build everything
- **Service ownership boundaries** - What's your responsibility vs. others'
- **Real-world complexity** - Dependencies, failures, and coordination
- **Production patterns** - HTTP clients, error handling, data enrichment

**This is exactly what you'd work on at Amazon!** 🚀
