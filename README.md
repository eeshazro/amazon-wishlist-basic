# Amazon Collaborative Wishlist - Basic Version

This is the **Basic Version** of the Amazon Collaborative Wishlist application, designed as a starting point for learning microservices architecture and basic collaboration features.

**This is a standalone repository** - it contains all the basic functionality without the advanced collaboration features.

## 🎯 What's Included

### Core Features
- ✅ **User Authentication** - JWT-based login system
- ✅ **Wishlist Management** - Create, view, edit, and delete wishlists
- ✅ **Item Management** - Add and remove items from wishlists
- ✅ **Basic Sharing** - Generate invitation links for view-only access
- ✅ **User Management** - Invite users and manage access (view-only)
- ✅ **Product Catalog** - Browse and search products

### Architecture
- ✅ **Microservices** - Separate services for users, wishlists, and collaboration
- ✅ **API Gateway** - Central entry point with data enrichment
- ✅ **PostgreSQL Database** - Schema-separated data storage
- ✅ **React Frontend** - Modern UI with Amazon-inspired design
- ✅ **Docker Deployment** - Containerized services

## ❌ What's NOT Included (Advanced Features)

### Comments System
- ❌ No comment functionality on wishlist items
- ❌ No comment threads or discussions
- ❌ No comment permissions or moderation

### Advanced Collaboration
- ❌ No role-based access control (only owner and view-only)
- ❌ No edit permissions for collaborators
- ❌ No comment-only roles
- ❌ No advanced invitation types

### Advanced Features
- ❌ No real-time notifications
- ❌ No advanced search and filtering
- ❌ No bulk operations
- ❌ No export/import functionality

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
│   ├── api-gateway/              # Central API entry point
│   ├── user-service/             # Authentication & user management
│   ├── wishlist-service/         # Wishlist & item operations
│   ├── collaboration-service/    # Basic sharing & invitations
│   └── web-frontend/             # React frontend
├── db/                          # Database schema
│   └── init/                     # Database migrations
├── ops/                         # Deployment config
│   └── docker-compose.yml        # Docker services
├── starter/                     # Documentation and guides
└── README.md                    # This file
```

## 🔧 Development

### Local Development
```bash
# Start database only
cd ops
docker-compose up postgres -d

# Run services locally
cd apps/user-service && npm install && npm start
cd apps/wishlist-service && npm install && npm start
cd apps/collaboration-service && npm install && npm start
cd apps/api-gateway && npm install && npm start
cd apps/web-frontend && npm install && npm start
```

### Database Schema
The basic version uses a simplified schema:
- `user.user` - User accounts and profiles
- `wishlist.wishlist` - Wishlist containers
- `wishlist.wishlist_item` - Items within wishlists
- `collab.wishlist_invite` - Invitation tokens (view-only)
- `collab.wishlist_access` - User access permissions (view-only)

## 🎓 Learning Path

This basic version is designed to help you learn:

1. **Microservices Architecture** - Understanding service separation
2. **API Gateway Pattern** - Centralized routing and data enrichment
3. **JWT Authentication** - Token-based authentication
4. **Database Design** - Schema separation and relationships
5. **Service Integration** - How services communicate
6. **Basic Collaboration** - Simple sharing and invitation systems

## 🔄 Migration to Full Version

To upgrade to the full version with advanced features:

1. **Add Comments System:**
   - Create `wishlist_item_comment` table
   - Add comment endpoints to collaboration service
   - Add comment UI components

2. **Add Role-Based Access Control:**
   - Add `view_edit` and `comment_only` roles
   - Add role management endpoints
   - Add role selection in invitation UI

3. **Add Advanced Collaboration:**
   - Add permission checking for different roles
   - Add real-time features
   - Add advanced invitation options

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check if database is running
docker-compose -f ops-basic/docker-compose.yml ps

# View database logs
docker-compose -f ops-basic/docker-compose.yml logs postgres
```

**Service Startup Issues:**
```bash
# View all service logs
docker-compose -f ops-basic/docker-compose.yml logs

# Restart specific service
docker-compose -f ops-basic/docker-compose.yml restart api-gateway
```

**Port Conflicts:**
- Ensure ports 5432, 3001-3003, 8080, and 5173 are available
- Stop any existing services using these ports

## 📚 Documentation

For detailed documentation, see:
- [API Specifications](docs/starter%20basic/api_specifications_basic.md)
- [Database Schema](docs/starter%20basic/database_erd_basic.md)
- [Service Documentation](docs/starter%20basic/)

## 🤝 Contributing

This basic version is designed for learning. To contribute to the full version:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Ready to learn?** Start with this basic version and gradually add advanced features as you become comfortable with the architecture! # amazon-wishlist-basic
