# Amazon Collaborative Wishlist - Microservices Architecture Documentation

Welcome to the comprehensive documentation for the **Amazon Collaborative Wishlist** application. This documentation covers a microservices architecture that simulates the real Amazon work environment, where the wishlist team owns only their service and makes HTTP API calls to other teams' services.

## 📚 Documentation Index

### 🏗️ Architecture Overview
- **[api_specifications.md](api_specifications.md)** - Complete API documentation with all endpoints
- **[collaboration-guide.md](collaboration-guide.md)** - Guide for implementing advanced collaboration features
- **[development-guide.md](development-guide.md)** - Development setup and contribution guide
- **[tech_spec.md](tech_spec.md)** - Technical specifications and design decisions
- **[product_spec.md](product_spec.md)** - Product requirements and features

### 📊 Visual Documentation
- **[architecture-diagram.md](architecture-diagram.md)** - Visual system architecture diagrams
- **[system-flows.md](system-flows.md)** - Comprehensive flow diagrams for all operations
- **[database-erd.md](database-erd.md)** - Complete database ERD with relationships and external references

## 🏛️ System Architecture

The Amazon Collaborative Wishlist application follows a **microservices architecture with API calls** that simulates the real Amazon work environment:

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

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 8080 | Central entry point, authentication, data enrichment, routing |
| **Mock Services** | 3004 | Simulates external teams' services:<br/>• User authentication & profiles<br/>• Product catalog & search |
| **Wishlist Service** | 3002 | **Your team's service:**<br/>• Makes HTTP API calls to external services<br/>• Owns wishlist data and operations<br/>• Handles collaboration features<br/>• Manages invitations & access control |

## 🔄 Data Flow

### Typical Request Flow
1. **Frontend** sends request to API Gateway
2. **API Gateway** validates JWT token and extracts user context
3. **API Gateway** routes request to appropriate microservice
4. **Microservice** processes request and returns data
5. **API Gateway** enriches data from multiple services if needed
6. **Frontend** receives complete response

### Example: Viewing a Wishlist (Merged Architecture)
```
Frontend → API Gateway → Wishlist Service (get wishlist + user role + items)
                    ↓
                Frontend (complete wishlist with items, role, and permissions)
```

**Key Improvement**: No cross-service calls needed for permission checks - everything handled within the unified wishlist service.

## 🗄️ Database Architecture

The application uses **PostgreSQL** with a **unified schema approach**:

### Database Structure
- **`wishlistdb`** - Single database for all wishlist domain data
- **`public` schema** - Main application tables (wishlist domain)
- **`user` schema** - User management tables (for user service)

### Key Tables (Public Schema)
- `wishlist` - Wishlist containers with owner references
- `wishlist_item` - Items within wishlists with product references
- `wishlist_access` - User access permissions with role-based control
- `wishlist_invite` - Invitation tokens with access type specification
- `wishlist_comment` - Comments on wishlist items (infrastructure ready)

### Key Tables (User Schema)
- `user.user` - User accounts and profiles

## 🔐 Security & Access Control

### Authentication
- **JWT-based authentication** managed by User Service
- **Token validation** at API Gateway level
- **User context** passed via `x-user-id` headers

### Authorization
- **Simple access control** for wishlist collaboration
- **Permission levels**: owner, view_only
- **Invitation-based sharing** with expiration tokens

### Privacy Levels
- **Private** - Only owner and invited users
- **Public** - Anyone with the link can view
- **Shared** - Controlled access through invitations (view-only)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v15+)
- Docker (for containerized deployment)

### Quick Start
1. Clone the repository
2. Set up PostgreSQL database
3. Run database migrations (`db-basic/init/`)
4. Start services with Docker Compose (`ops-basic/docker-compose.yml`)
5. Access the application at `http://localhost:5173`

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://wishlist_user:wishlist_pass@localhost:5432/wishlist_db

# JWT
JWT_SECRET=your_jwt_secret_here

# Service URLs (for Docker)
USER_SVC_URL=http://user-service:3001
WISHLIST_SVC_URL=http://wishlist-service:3002
COLLAB_SVC_URL=http://collaboration-service:3003
```

## 📊 API Endpoints

### Public Endpoints
- `GET /products` - Product catalog
- `POST /auth/login` - User authentication
- `GET /api/invites/:token` - Invitation preview

### Protected Endpoints
- `GET /api/me` - Current user profile
- `GET /api/wishlists/mine` - User's wishlists
- `GET /api/wishlists/friends` - Wishlists shared with user
- `GET /api/wishlists/:id` - Specific wishlist with items and role
- `POST /api/wishlists` - Create wishlist
- `POST /api/wishlists/:id/items` - Add item
- `DELETE /api/wishlists/:id/items/:itemId` - Remove item

### Collaboration Endpoints (Basic)
- `GET /api/wishlists/:id/access` - List collaborators (owner only)
- `DELETE /api/wishlists/:id/access/:userId` - Remove collaborator (owner only)
- `PUT /api/wishlists/:id/access/:userId` - Update display name (owner only)
- `POST /api/wishlists/:id/invites` - Create invitation (view-only only)
- `POST /api/invites/:token/accept` - Accept invitation

## 🔧 Development

### Code Structure
```
amazon-collab-wishlist/
├── apps-basic/
│   ├── api-gateway/          # API Gateway service
│   ├── user-service/         # User management
│   ├── wishlist-service/     # Wishlist operations
│   ├── collaboration-service/ # Basic collaboration features
│   └── web-frontend/         # React frontend with Vite
├── db-basic/
│   └── init/                 # Database migrations
├── ops-basic/
│   └── docker-compose.yml    # Deployment configuration
└── docs/                     # This documentation
```

### Development Workflow
1. **Feature Development** - Work on individual microservices
2. **Integration Testing** - Test service interactions
3. **API Gateway Updates** - Update routing and enrichment logic
4. **Frontend Integration** - Update UI components
5. **Database Migrations** - Update schema if needed

## 🧪 Testing

### Service Testing
- Each microservice has its own test suite
- Mock external dependencies for unit tests
- Integration tests for service interactions

### API Testing
- Test API Gateway endpoints
- Verify data enrichment functionality
- Test authentication and authorization

### Database Testing
- Test database migrations
- Verify data integrity constraints
- Test performance with sample data

## 📈 Performance & Scalability

### Performance Optimizations
- **Database indexing** on frequently queried fields
- **Connection pooling** for database connections
- **Caching opportunities** for user profiles and product data
- **Efficient queries** with proper joins and filtering

### Scalability Considerations
- **Horizontal scaling** of microservices
- **Database partitioning** for large datasets
- **Load balancing** for API Gateway
- **Caching strategies** for frequently accessed data

## 🛠️ Monitoring & Observability

### Health Checks
- Each service provides `/health` endpoint
- Monitor service availability and response times
- Track database connection status

### Logging
- Structured logging across all services
- Error tracking and alerting
- Request tracing for debugging

### Metrics
- API response times
- Database query performance
- Service resource utilization

## 🔄 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose -f ops-basic/docker-compose.yml up -d

# View logs
docker-compose -f ops-basic/docker-compose.yml logs -f

# Stop services
docker-compose -f ops-basic/docker-compose.yml down
```

### Production Considerations
- **Environment variables** for configuration
- **Database backups** and recovery procedures
- **SSL/TLS** for secure communication
- **Rate limiting** and DDoS protection
- **Monitoring** and alerting setup

## 🤝 Contributing

### Development Guidelines
1. **Service Isolation** - Keep services independent
2. **API Design** - Follow RESTful principles
3. **Error Handling** - Implement proper error responses
4. **Documentation** - Update docs for new features
5. **Testing** - Add tests for new functionality

### Code Review Process
1. **Feature Branch** - Create branch for new feature
2. **Service Changes** - Update relevant microservice
3. **Integration** - Test with other services
4. **Documentation** - Update relevant docs
5. **Review** - Submit pull request for review

## 📞 Support

### Troubleshooting
- Check service health endpoints
- Review application logs
- Verify database connectivity
- Test API endpoints directly

### Common Issues
- **JWT Token Issues** - Check JWT_SECRET configuration
- **Database Connection** - Verify DATABASE_URL
- **Service Communication** - Check service URLs and ports
- **CORS Issues** - Verify CORS configuration

## ❌ Features NOT Included in Basic Version

### Comments System
- No comment endpoints
- No comment functionality
- No comment-related database tables
- No comment enrichment in responses
- No `CommentThread` component in frontend

### Role-Based Access Control
- No role management endpoints
- Simplified roles: only 'owner' and 'view_only'
- No granular permission control
- No role specification during invitations
- No PATCH endpoint for role updates

### Advanced Invitation Features
- No `access_type` field in invitations
- All invitations are view-only
- No role selection during acceptance
- No advanced invitation options

### Frontend Features
- No comment UI components
- No role management interface
- No comment threads on items
- Simplified item cards without comment sections

## 🔄 Migration Path to Full Version

To upgrade from basic to full version:

1. **Add Comments System**:
   - Create `wishlist_item_comment` table
   - Add comment endpoints to collaboration service
   - Add comment enrichment to API gateway
   - Add `CommentThread` component to frontend

2. **Add Role-Based Access Control**:
   - Add role management endpoints (PATCH)
   - Add `access_type` field to invitations
   - Implement permission validation for different roles
   - Add role management UI components

3. **Enhance Collaboration Features**:
   - Add comment permission checking
   - Add role update functionality
   - Add advanced invitation options
   - Add user enrichment for comments

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Last Updated**: January 2024  
**Version**: 1.0.0 (Basic)  
**Maintainer**: Development Team

## 🎯 Learning Objectives

This basic version is designed to help developers learn:

1. **Microservices Architecture** - Understanding service separation and communication
2. **API Gateway Pattern** - Centralized routing and data enrichment
3. **JWT Authentication** - Token-based authentication and authorization
4. **Database Design** - Schema separation and relationship modeling
5. **Service Integration** - How services communicate and share data
6. **Basic Collaboration** - Simple sharing and invitation systems

The basic version provides a solid foundation that can be extended with advanced features as developers become more comfortable with the architecture.

## 🎯 Key Features

### Basic Collaboration System
- **Simple Sharing** - View-only access to wishlists
- **Invitation System** - Basic invitation links with expiration
- **Access Control** - Simple owner vs collaborator permissions
- **Display Names** - Custom names for collaborators in wishlists

### Frontend Features
- **Clean Item Cards** - Simple product display without comments
- **Basic Sharing** - Invitation link generation
- **User Management** - Simple collaborator management
- **Responsive Design** - Amazon-style UI components 