# Amazon Collaborative Wishlist - Microservices Architecture

This is a **production-ready collaborative wishlist system** that simulates the real Amazon work environment. It features a microservices architecture where the wishlist team owns only their service and makes HTTP API calls to other teams' services (user and product services).

**This repository demonstrates how Amazon teams actually work** - with service ownership boundaries, external API dependencies, and data enrichment patterns.

## 🎯 What's Included

### Core Features
- ✅ **User Authentication** - JWT-based login system with user profiles
- ✅ **Wishlist Management** - Create, view, edit, and delete wishlists
- ✅ **Item Management** - Add and remove items from wishlists
- ✅ **Collaborative Sharing** - Generate invitation links with role-based access
- ✅ **Role-Based Access Control** - Owner, view_edit, view_only, and comment_only roles
- ✅ **User Management** - Invite users and manage access permissions
- ✅ **Product Catalog** - Browse and search products
- ✅ **Comments System** - Comment on wishlist items (infrastructure ready)
- ✅ **Smart Tab Navigation** - Automatic tab switching based on user permissions

### Architecture
- ✅ **Microservices with API Calls** - Wishlist service makes HTTP calls to external services
- ✅ **Mock Services** - Simulates user and product services from other teams
- ✅ **API Gateway** - Central entry point with authentication and data enrichment
- ✅ **PostgreSQL Database** - Wishlist service owns its own database
- ✅ **React Frontend** - Modern UI with Amazon-inspired design
- ✅ **Docker Deployment** - Containerized services with health checks
- ✅ **Real Amazon Patterns** - Service boundaries, external dependencies, data enrichment

## 🏗️ Current Architecture

### Service Structure
- **Mock Services** (Port 3004) - Simulates external teams' services:
  - User authentication, profiles, JWT management
  - Product catalog with search and details
- **Wishlist Service** (Port 3002) - **Your team's service** that:
  - Owns wishlist data and operations
  - Makes HTTP API calls to external services
  - Handles collaboration features (invitations, access control)
  - Manages role-based permissions
- **API Gateway** (Port 8080) - Central entry point with authentication and routing
- **Web Frontend** (Port 5173) - React application with smart navigation

### Database Design
- **Wishlist Database**: `wishlistdb` owned by wishlist service
- **External References**: User IDs and Product IDs reference other services
- **Service Ownership**: Each service owns its domain data completely
- **API Dependencies**: Wishlist service enriches data via HTTP calls

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 16+ (for local development)

### Running the Application

1. **Clone and navigate to the project:**
   ```bash
   git clone <your-repo-url>
   cd amazon-wishlist-basic
   ```

2. **Start the application:**
   ```bash
   cd ops
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:8080
   - Database: localhost:5432

4. **Default credentials:**
   - Use any username/password combination (demo mode)

## 📁 Project Structure

```
amazon-wishlist-basic/
├── apps/                         # Microservices
│   ├── api-gateway/              # Central API entry point with authentication
│   ├── mock-services/            # Simulates external teams' services (user + product)
│   ├── wishlist-service/         # Your team's service (makes API calls)
│   └── web-frontend/             # React frontend with smart navigation
├── db/                          # Wishlist service database schema
│   └── init/                     # Database initialization scripts
│       ├── 01_tables.sql         # Wishlist domain tables
│       ├── 02_seed.sql           # Sample wishlist data
│       └── 03_test_data.sql      # Test data for development
├── docs/                        # Comprehensive documentation
│   ├── README.md                # Architecture overview
│   ├── tech_spec.md             # Technical specifications
│   ├── product_spec.md          # Product requirements
│   ├── api_specifications.md    # Complete API documentation
│   └── collaboration-guide.md   # Guide for adding collaboration features
├── ops/                         # Deployment configuration
│   └── docker-compose.yml       # Docker services configuration
└── README.md                    # This file
```

## 🔧 Development

### Local Development
```bash
# Start all services
cd ops
docker-compose up -d

# Or start individual services
docker-compose up postgres -d
docker-compose up mock-services -d
docker-compose up wishlist-service -d
docker-compose up api-gateway -d
docker-compose up web-frontend -d
```

### Database Schema
The wishlist service owns its own database with these tables:
- `wishlist` - Wishlist containers with owner references (external user IDs)
- `wishlist_item` - Items within wishlists with product references (external product IDs)
- `wishlist_access` - User access permissions with role-based control
- `wishlist_invite` - Invitation tokens with access type specification
- `wishlist_comment` - Comments on wishlist items (infrastructure ready)

**Note**: User and product data are fetched via HTTP API calls to external services.

## 🎓 Learning Path

This architecture simulates the real Amazon work environment and teaches you:

1. **Service Ownership Boundaries** - Understanding what your team owns vs. depends on
2. **API Gateway Pattern** - Centralized routing, authentication, and data enrichment
3. **External Service Dependencies** - Making HTTP calls to other teams' services
4. **Data Enrichment Patterns** - Combining data from multiple services
5. **Error Handling** - Dealing with external service failures and timeouts
6. **Role-Based Access Control** - Implementing granular permissions
7. **Real Amazon Patterns** - Service boundaries, API contracts, and team coordination

## 🔄 Key Architectural Decisions

### Why API Calls Architecture?
- **Real Amazon Experience**: Simulates how teams actually work at Amazon
- **Service Boundaries**: Clear ownership of data and functionality
- **External Dependencies**: Learn to work with other teams' services
- **Data Enrichment**: Combine data from multiple sources
- **Error Resilience**: Handle external service failures gracefully

### Database Design Philosophy
- **Service-Owned Data**: Each service owns its domain data completely
- **External References**: Use IDs to reference other services' data
- **Single Database per Service**: One database per business domain
- **API Dependencies**: Enrich data via HTTP calls to external services

## 🚀 Adding Collaboration Features

This system is ready for advanced collaboration features. The next developer can easily add:

### Ready-to-Implement Features
- **Edit Invites** - Allow users to edit wishlist items (currently only view-only)
- **Comments System** - Infrastructure is already in place
- **Real-time Updates** - WebSocket integration for live collaboration
- **Advanced Permissions** - Granular role-based access control
- **Notification System** - Email/SMS notifications for wishlist changes

### Implementation Guide
See **[docs/collaboration-guide.md](docs/collaboration-guide.md)** for detailed instructions on adding these features.

## 📚 Documentation

For detailed technical information, see the `/docs` directory:
- **[docs/README.md](docs/README.md)** - Architecture overview and service documentation
- **[docs/tech_spec.md](docs/tech_spec.md)** - Technical specifications and design decisions
- **[docs/product_spec.md](docs/product_spec.md)** - Product requirements and features
- **[docs/api_specifications.md](docs/api_specifications.md)** - Complete API documentation
- **[docs/collaboration-guide.md](docs/collaboration-guide.md)** - Guide for adding collaboration features

### 📊 Visual Documentation
- **[docs/architecture-diagram.md](docs/architecture-diagram.md)** - Visual system architecture diagrams
- **[docs/system-flows.md](docs/system-flows.md)** - Comprehensive flow diagrams for all operations
- **[docs/database-erd.md](docs/database-erd.md)** - Entity Relationship Diagrams for database schema

## 🔄 Next Steps for Collaboration Features

The system is architected to easily add advanced collaboration features:

1. **Edit Permissions:**
   - Modify `wishlist_access` table to support `view_edit` role
   - Update invitation system to allow role selection
   - Add permission checks in wishlist service

2. **Comments System:**
   - The `wishlist_comment` table is already created
   - Add comment endpoints to wishlist service
   - Create comment UI components in frontend

3. **Real-time Collaboration:**
   - Add WebSocket support to wishlist service
   - Implement live updates for wishlist changes
   - Add presence indicators for active users

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check if database is running
cd ops
docker-compose ps

# View database logs
docker-compose logs postgres
```

**Service Startup Issues:**
```bash
# View all service logs
docker-compose logs

# Restart specific service
docker-compose restart wishlist-service
```

**External Service Issues:**
```bash
# Check if mock services are running
docker-compose logs mock-services

# Test external service connectivity
curl http://localhost:3004/users
curl http://localhost:3004/products
```

**Port Conflicts:**
- Ensure ports 5432, 3002, 3004, 8080, and 5173 are available
- Stop any existing services using these ports

## 🤝 Contributing

This project is designed for learning and collaboration. To contribute:

1. **Fork the repository**
2. **Create a feature branch** for your collaboration features
3. **Follow the architecture patterns** - make API calls to external services
4. **Add tests** for new functionality
5. **Update documentation** for any new features
6. **Submit a pull request**

### Development Guidelines
- Follow the existing service boundaries
- Use HTTP API calls for external data
- Maintain the wishlist service ownership model
- Add comprehensive error handling for external services

## 📄 License

This project is licensed under the MIT License.

---

**Ready to build collaboration features?** This architecture provides the perfect foundation for adding advanced wishlist collaboration features while learning real Amazon development patterns! 🚀
