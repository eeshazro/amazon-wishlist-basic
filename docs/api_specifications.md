# API Specifications - Amazon Collaborative Wishlist

This document provides comprehensive API documentation for the Amazon Collaborative Wishlist system. The architecture uses microservices with API calls to external services, simulating the real Amazon work environment.

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

## 🔐 Authentication

All API endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

JWT tokens are obtained from the mock user service login endpoint.

## 📡 API Gateway Endpoints

The API Gateway (Port 8080) serves as the central entry point and handles authentication, routing, and data enrichment.

### Authentication Endpoints

#### POST /auth/login
Login to get a JWT token.

**Request:**
```json
{
  "user": "alice"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/me
Get current user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "username": "alice",
  "public_name": "Alice Johnson",
  "email": "alice@example.com"
}
```

### User Endpoints

#### GET /api/users/:id
Get user information by ID.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "username": "alice",
  "public_name": "Alice Johnson",
  "email": "alice@example.com"
}
```

### Product Endpoints

#### GET /products
Get all products (paginated).

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
      "description": "Industry-leading noise canceling with Dual Noise Sensor technology",
      "price": 349.99,
      "currency": "USD",
      "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
      "category": "Electronics",
      "retailer": "Best Buy",
      "rating": 4.5,
      "review_count": 2847,
      "availability": "in_stock",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 20,
  "limit": 50,
  "offset": 0
}
```

#### GET /products/:id
Get product details by ID.

**Response:**
```json
{
  "id": 1,
  "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
  "description": "Industry-leading noise canceling with Dual Noise Sensor technology",
  "price": 349.99,
  "currency": "USD",
  "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  "category": "Electronics",
  "retailer": "Best Buy",
  "rating": 4.5,
  "review_count": 2847,
  "availability": "in_stock",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Wishlist Endpoints

#### GET /api/wishlists
Get all wishlists for the current user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Birthday Wishlist",
    "description": "Things I want for my birthday",
    "owner_id": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
        "priority": 1,
        "added_by": 1,
        "created_at": "2024-01-01T00:00:00Z",
        "product": {
          "id": 1,
          "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
          "price": 349.99,
          "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
        }
      }
    ],
    "access": [
      {
        "user_id": 2,
        "role": "view_only",
        "display_name": "Bob Smith",
        "user": {
          "id": 2,
          "public_name": "Bob Smith"
        }
      }
    ]
  }
]
```

#### GET /api/wishlists/:id
Get a specific wishlist by ID.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "name": "Birthday Wishlist",
  "description": "Things I want for my birthday",
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
      "priority": 1,
      "added_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "product": {
        "id": 1,
        "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
        "price": 349.99,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
      }
    }
  ],
  "access": [
    {
      "user_id": 2,
      "role": "view_only",
      "display_name": "Bob Smith",
      "user": {
        "id": 2,
        "public_name": "Bob Smith"
      }
    }
  ]
}
```

#### POST /api/wishlists
Create a new wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Holiday Wishlist",
  "description": "Things I want for the holidays"
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Holiday Wishlist",
  "description": "Things I want for the holidays",
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "items": [],
  "access": []
}
```

#### PUT /api/wishlists/:id
Update a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Updated Birthday Wishlist",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Updated Birthday Wishlist",
  "description": "Updated description",
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "items": [...],
  "access": [...]
}
```

#### DELETE /api/wishlists/:id
Delete a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```
204 No Content
```

### Wishlist Item Endpoints

#### POST /api/wishlists/:id/items
Add an item to a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "product_id": 1,
  "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
  "priority": 1
}
```

**Response:**
```json
{
  "id": 2,
  "product_id": 1,
  "wishlist_id": 1,
  "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
  "priority": 1,
  "added_by": 1,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### DELETE /api/wishlists/:id/items/:itemId
Remove an item from a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```
204 No Content
```

### Collaboration Endpoints

#### GET /api/wishlists/friends
Get wishlists shared with the current user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": 3,
    "name": "Bob's Birthday List",
    "description": "Bob's birthday wishlist",
    "owner_id": 2,
    "created_at": "2024-01-01T00:00:00Z",
    "items": [...],
    "access": [...],
    "role": "view_only"
  }
]
```

#### POST /api/wishlists/:id/invites
Create an invitation for a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{}
```

**Response:**
```json
{
  "token": "DMTTLZ4Gl6E9he_gRG9OsxMjVKyKBGmp",
  "inviteLink": "http://localhost:5173/wishlist/friends/invite/DMTTLZ4Gl6E9he_gRG9OsxMjVKyKBGmp",
  "expires_at": "2024-01-08T00:00:00Z"
}
```

#### POST /api/invites/:token/accept
Accept an invitation.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{}
```

**Response:**
```json
{
  "message": "Invitation accepted successfully",
  "wishlist_id": 1,
  "role": "view_only"
}
```

#### GET /api/wishlists/:id/access
Get list of collaborators for a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "user_id": 2,
    "role": "view_only",
    "display_name": "Bob Smith",
    "user": {
      "id": 2,
      "public_name": "Bob Smith"
    }
  }
]
```

#### DELETE /api/wishlists/:id/access/:userId
Remove user access from a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```
204 No Content
```

## 🔧 Mock Services Endpoints

The mock services (Port 3004) simulate external teams' services.

### User Service Endpoints

#### POST /auth/login
Login endpoint for development.

**Request:**
```json
{
  "user": "alice"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /me
Get current user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "username": "alice",
  "public_name": "Alice Johnson",
  "email": "alice@example.com"
}
```

#### GET /users/:id
Get user by ID.

**Response:**
```json
{
  "id": 1,
  "username": "alice",
  "public_name": "Alice Johnson",
  "email": "alice@example.com"
}
```

### Product Service Endpoints

#### GET /products
Get all products.

**Response:**
```json
{
  "products": [...],
  "total": 20,
  "limit": 50,
  "offset": 0
}
```

#### GET /products/:id
Get product by ID.

**Response:**
```json
{
  "id": 1,
  "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
  "description": "Industry-leading noise canceling with Dual Noise Sensor technology",
  "price": 349.99,
  "currency": "USD",
  "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  "category": "Electronics",
  "retailer": "Best Buy",
  "rating": 4.5,
  "review_count": 2847,
  "availability": "in_stock",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## 🚀 Wishlist Service Endpoints

The wishlist service (Port 3002) is your team's service that makes API calls to external services.

### Internal Endpoints (Called by API Gateway)

#### GET /wishlists
Get all wishlists for a user.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

#### GET /wishlists/:id
Get a specific wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

#### POST /wishlists
Create a new wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
Content-Type: application/json
```

#### PUT /wishlists/:id
Update a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
Content-Type: application/json
```

#### DELETE /wishlists/:id
Delete a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

#### POST /wishlists/:id/items
Add an item to a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
Content-Type: application/json
```

#### DELETE /wishlists/:id/items/:itemId
Remove an item from a wishlist.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

#### GET /access/mine
Get wishlists shared with the current user.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

#### POST /wishlists/:id/invites
Create an invitation.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
Content-Type: application/json
```

#### POST /invites/:token/accept
Accept an invitation.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
Content-Type: application/json
```

#### GET /wishlists/:id/access
Get wishlist collaborators.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

#### DELETE /wishlists/:id/access/:userId
Remove user access.

**Headers:**
```
Authorization: Bearer <jwt_token>
x-user-id: 1
```

## 🔄 Data Flow Examples

### 1. Getting a Wishlist with Items

```
Frontend → API Gateway → Wishlist Service → Database
                ↓
         Wishlist Service → Product Service (API call)
                ↓
         Wishlist Service → User Service (API call)
                ↓
         API Gateway → Frontend (enriched data)
```

### 2. Adding an Item to Wishlist

```
Frontend → API Gateway → Wishlist Service → Database
                ↓
         Wishlist Service → Product Service (API call for validation)
                ↓
         API Gateway → Frontend (success response)
```

### 3. Accepting an Invitation

```
Frontend → API Gateway → Wishlist Service → Database
                ↓
         Wishlist Service → User Service (API call for user validation)
                ↓
         API Gateway → Frontend (success response)
```

## 🚨 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "error": "only owner can view access list"
}
```

#### 404 Not Found
```json
{
  "error": "wishlist not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Wishlist service unavailable"
}
```

### External Service Errors

When external services are unavailable, the system gracefully degrades:

```json
{
  "id": 1,
  "title": "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
  "product": null,  // Product service unavailable
  "added_by": 1,
  "user": {
    "id": 1,
    "public_name": "Unknown User"  // User service unavailable
  }
}
```

## 🔧 Development Notes

### Service Dependencies

- **Wishlist Service** depends on **User Service** and **Product Service**
- **API Gateway** depends on **Wishlist Service** and **Mock Services**
- **Frontend** depends on **API Gateway**

### Data Enrichment

The wishlist service enriches data by making HTTP calls to external services:

```javascript
// Example: Enriching wishlist items with product data
const enrichedItems = await Promise.all(
  items.map(async (item) => {
    try {
      const product = await productServiceClient.getProductById(item.product_id);
      return { ...item, product };
    } catch (error) {
      console.error('Product service unavailable:', error);
      return { ...item, product: null };
    }
  })
);
```

### Authentication Flow

1. User logs in via `/auth/login`
2. Receives JWT token
3. Token is passed in `Authorization` header for all requests
4. API Gateway validates token and extracts user ID
5. User ID is passed to wishlist service via `x-user-id` header

This architecture simulates the real Amazon work environment where teams own their services and make API calls to other teams' services.