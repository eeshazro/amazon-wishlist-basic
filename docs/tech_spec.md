# Collaborative Wishlist – Technical Design (Tech Spec)

## Objective
Implement a production-ready collaborative wishlist system with:
- **Role-based access control (RBAC)** - Granular permissions for different user types
- **Comments system** - Infrastructure ready for item discussions
- **Enhanced invitation flows** - Flexible invitation types and access management
- **Streamlined architecture** - Unified wishlist service with domain-driven design

## Architecture Overview

### Service Design Philosophy
Following big tech best practices (Amazon/Google/Meta), we organize services by **Business Domain** rather than technical concerns:

- **User Service** - Owned by identity team (external reference)
- **Product Service** - Owned by catalog team (external reference)  
- **Wishlist Service** - Our domain, owns all wishlist-related functionality



### Current Architecture (Merged)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Gateway   │    │  User Service   │
│   (React/Vite)  │◄──►│   (Express.js)  │◄──►│   (Express.js)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                              │
│                              ▼
│                       ┌─────────────────┐
│                       │ Wishlist Service│
│                       │   (Express.js)  │
│                       │  (Unified)      │
│                       └─────────────────┘
│                              │
│                              ▼
│                       ┌─────────────────┐
│                       │   PostgreSQL    │
│                       │   (wishlistdb)  │
│                       └─────────────────┘
```

### Service Responsibilities

**Wishlist Service (Unified)**
- Wishlist CRUD operations
- Item management (including comments infrastructure)
- Invitation management
- Access control & permissions
- All wishlist-related business logic

**API Gateway**
- Authentication & routing
- Data enrichment from external services
- Cross-service orchestration

**Database Design**
- **Single Database**: `wishlistdb` with public schema
- **Service-Owned Data**: Each service owns its domain data completely
- **External References**: Use IDs to reference other services' data
- **Domain-Driven Schema**: All wishlist tables in cohesive public schema

A schema acts like a folder for tables, views, functions, and other database objects.
Without schemas, everything would live in a single namespace, making it messy and hard to avoid name collisions.
Example: You might need two different users tables—for app users and admin users. With schemas, you can have app.users and admin.users.Schemas allow you to apply permissions at a higher level.
Instead of granting access table by table, you can grant access to an entire schema.
Example: Give analysts read-only access to the analytics schema without exposing sensitive tables in the finance schema. sales schema → orders, customers, invoices
hr schema → employees, salaries, reviews
We will put all our tables in a Schema called public, we can later add schemas for things like analytics or audit for the wishlist. By default if we just create the tables postgres assigns it as public, but we can also change the name to core.


we normally seperate the services for 2 main reasons, 
first becaus of scalability, services are actually run on their own physical servers. Which take in requests to do things. If suddenly lots of people start editing wishlists, we can add more servers just for the wishlist service—without affecting the others. 

The second reason is it's just cleaner and more organized, Developers know where to go to make changes. User-related code is in the user service, wishlist code is in the wishlist service, etc. The organization makes it easier for teams to work on different services at the same time without stepping on each other’s toes.

in short splitting our code into seperate services makes the app easier to grow and better at handling lots of users plus easier to manage and have multiple people writing code.


let's look at our current wishlist app, it's broken into 3 services for 3 different functions. 


1. user-service (unchanged)
   - Authentication & user profiles
   - User directory for enrichment

2. wishlist-service (expanded)
   - Wishlist CRUD operations
   - Item management (including comments)
   - Permission enforcement for wishlist operations
   - All wishlist-related business logic

3. collaboration-service (focused)
   - Invitation management
   - Access control (who can access what)
   - Role management
   - Cross-wishlist features (future)

4. api-gateway (unchanged)
   - Authentication & routing
   - Data enrichment
   - Cross-service orchestration

user-service - Authentication, user profiles, user directory
everytime we need to do something related to getting the logged in users information we use a user service, this includes getting a users amazon profile information.


wishlist-service - Wishlist CRUD, item management
everytime we want to do something to a wishlist we will use a wishlist service. functions for creating or deleting a wishlists and adding and removing wihslist items.

collaboration-service - Invitations, access control, sharing
then there is an access service for the wishlist this is for things like getting which users have which permissions view only or edit on a speific wishlist. also where we will have functions for creating wishlist invites and comments.

api-gateway - Authentication, routing, data enrichment



- Services:
  - `user-service` (demo auth, user profiles)                      
  - `wishlist-service` (wishlists, items)                      change to list , should comments be here instead of in the collab service?
  - `collaboration-service` (access, invites, comments)        permission

  - `api-gateway` (JWT verification, proxying, cross-service enrichment)
  - `web-frontend` (React via Vite)
- Data: PostgreSQL with schemas: `user`, `wishlist`, `collab`
- Ports (local): gateway 8080, user 3001, wishlist 3002, collab 3003, frontend 5173





##CHANGES

### Data Model Changes
Apply DB changes from Migration Guide and ERD:
- Add `collab.wishlist_item_comment`
- Add `access_type` (VARCHAR) to `collab.wishlist_invite`
- Ensure `collab.wishlist_access` supports roles: owner, view_edit, view_only, comment_only

Indexes to add (from ERD):
- `idx_wishlist_item_comment_item` on `wishlist_item_id`
- `idx_wishlist_item_comment_user` on `user_id`
- `idx_invite_token` and `idx_invite_expires`

### Permission Model
Roles and permissions per full spec matrix:
- owner: all actions, manage users
- view_edit: view, add/edit/delete items, add comments
- view_only: view only
- comment_only: view + add comments

Server enforcement in collaboration-service for comments and access; gateway forwards auth context to services.

### API Surface (Gateway-facing)
Key endpoints to expose via gateway (normalized to `/api/...`):
- Collaboration (new/expanded):
  - `POST /api/collab/wishlists/:wishlistId/invites` (create invite with `access_type`)
  - `GET /api/collab/invites/:token`
  - `POST /api/collab/invites/:token/accept`
  - `GET /api/collab/wishlists/:wishlistId/access` (with user enrichment)
  - `DELETE /api/collab/wishlists/:wishlistId/access/:userId`
  - `PUT /api/collab/wishlists/:wishlistId/access/:userId` (role + display_name)
  - `POST /api/collab/items/:itemId/comments` (enrich response with `user`)
  - `GET /api/collab/items/:itemId/comments` (enrich list with `user`)

- Wishlist (existing): CRUD for wishlists and items, plus enrichment of owner and item authors

Response error contract:
```json
{ "error": "message", "code": "ERROR_CODE", "details": {} }
```

### Service Responsibilities
collaboration-service
- Validate permissions based on `wishlist_access` and owner
- Implement comment CRUD (create, list, delete) with ownership checks
- Manage invitations: issue, read, accept (map `access_type` → `role`)
- Update roles (PUT) with validation (only owner allowed)

api-gateway
- Verify JWT, attach `x-user-id` and current user context
- Proxy collaboration routes; enrich:
  - comments with `user` profile
  - access list with `user` profile
- Normalize errors and codes

wishlist-service
- No schema change; ensure item author `added_by` is surfaced for enrichment

user-service
- Expose `/api/users/:userId` and `/api/users/profile` for enrichment

### Frontend Changes
- Add `CommentThread` component (drawer/modal) per full version
- Update `AmazonItemCard` to show comment trigger and count
- Add `InviteModal` and `ManagePeopleModal` for invites and role updates
- Respect role-based UI gating; still rely on server enforcement

### Detailed Flows

1) Create Invitation
- Owner calls gateway → collab service emits token with `expires_at` and `access_type`
- Gateway returns payload; frontend copies link `/invite/:token`

2) Accept Invitation
- Frontend loads `/invite/:token` → gateway fetches invite → show wishlist summary
- User submits display name → gateway → collab accept → create `wishlist_access`

3) List Access
- Gateway → collab access list → for each `user_id` fetch profile from user-service → attach `user`

4) Add Comment
- Frontend posts comment text → gateway → collab creates row → gateway enriches with user profile → returns

5) Get Comments
- Gateway → collab list comments → enrich each with `user` profile

6) Update Role
- Owner triggers PUT → collab validates owner → updates `wishlist_access.role`

### Validation & Error Handling
- Auth required on all non-public endpoints (JWT via gateway)
- Validation errors: `VALIDATION_ERROR`
- AuthN failures: `UNAUTHORIZED`
- AuthZ failures: `FORBIDDEN`
- Missing resources: `NOT_FOUND`
- Invite failures: `INVITE_EXPIRED`, `INVITE_INVALID`

### Database Migration Plan
1. Run SQL to add `access_type` to `collab.wishlist_invite`
2. Create table `collab.wishlist_item_comment`
3. Create indexes as listed
4. Backfill: none required; default `access_type='view_only'`

