# Development Guide: Implementing Full Collaboration Features

This guide outlines all the tasks required to implement the full collaborative wishlist system after running the database migration (`04_migration.sql` and `05_seed.sql`).

## 🎯 Overview

After the migration, you'll have:
- ✅ Database schema with comments, simplified roles (owner, edit, view_only), and access types
- ✅ Sample data demonstrating all features
- ❌ API endpoints for new features
- ❌ Frontend components for collaboration
- ❌ Permission checking for simplified roles

## 📋 Development Tasks Checklist

### Phase 1: Backend API Development

#### 1.1 Comments System Endpoints

**Task: Create comment management endpoints in `apps/wishlist-service/server.js`**

```javascript
// GET /wishlists/:id/items/:itemId/comments
// Get all comments for a specific wishlist item
app.get('/wishlists/:id/items/:itemId/comments', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Check if user can view the wishlist
  // 2. Query comments with user enrichment
  // 3. Return comments ordered by created_at DESC
}));

// POST /wishlists/:id/items/:itemId/comments
// Add a new comment to a wishlist item
app.post('/wishlists/:id/items/:itemId/comments', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Check if user can comment (role: owner, edit)
  // 2. Validate comment content
  // 3. Insert comment with user_id
  // 4. Return created comment with user info
}));

// DELETE /wishlists/:id/items/:itemId/comments/:commentId
// Delete a comment (owner or comment author only)
app.delete('/wishlists/:id/items/:itemId/comments/:commentId', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Check if user is owner or comment author
  // 2. Delete comment
  // 3. Return success response
}));
```

**Required Helper Functions:**
```javascript
// Check if user can comment on a wishlist
async function canCommentOnWishlist(userId, wishlistId) {
  // Check if user has role: owner or edit
}

// Get user info for comment enrichment
async function enrichCommentsWithUserInfo(comments) {
  // Fetch user details from user service for each comment
}
```

#### 1.2 Advanced Role Management Endpoints

**Task: Create role management endpoints**

```javascript
// PATCH /wishlists/:id/access/:userId
// Update a user's role in a wishlist (owner only)
app.patch('/wishlists/:id/access/:userId', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Check if requester is owner
  // 2. Validate new role (owner, edit, view_only)
  // 3. Update wishlist_access table
  // 4. Return updated access record
}));

// GET /wishlists/:id/access
// Get all users with access to a wishlist (enhanced)
app.get('/wishlists/:id/access', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Check if user can view access list
  // 2. Return users with their roles and user info
  // 3. Include invitation status
}));
```

#### 1.3 Enhanced Invitation System

**Task: Update invitation endpoints to support access types**

```javascript
// POST /wishlists/:id/invites (ENHANCED)
// Create invitation with specific access type
app.post('/wishlists/:id/invites', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Accept access_type in request body
  // 2. Validate access_type (view_only, edit)
  // 3. Create invitation with access_type
  // 4. Return invitation with access_type
}));

// POST /invites/:token/accept (ENHANCED)
// Accept invitation and grant role based on access_type
app.post('/invites/:token/accept', wrap(async (req, res) => {
  // Implementation needed:
  // 1. Get invitation with access_type
  // 2. Create wishlist_access with role = access_type
  // 3. Delete invitation
  // 4. Return access record
}));
```

#### 1.4 Permission Checking Updates

**Task: Update existing permission functions**

```javascript
// Update canEditWishlist to support edit role
async function canEditWishlist(userId, wishlistId) {
  // Check if user has role: owner OR edit
}

// New function: Check if user can comment
async function canCommentOnWishlist(userId, wishlistId) {
  // Check if user has role: owner OR edit
}

// New function: Check if user can manage roles
async function canManageWishlistRoles(userId, wishlistId) {
  // Check if user is owner
}
```

### Phase 2: API Gateway Updates

#### 2.1 Comment Enrichment

**Task: Update API Gateway to enrich responses with comment data**

```javascript
// In apps/api-gateway/server.js
// Update wishlist item responses to include comments
async function enrichWishlistItemsWithComments(items) {
  // Add comments array to each item
  // Fetch comments ordered by created_at
}

// Update wishlist responses to include comment data
async function enrichWishlistWithComments(wishlist) {
  // Add comments for items
  // Add recent comments if needed
}
```

#### 2.2 Role-Based Response Filtering

**Task: Filter API responses based on user roles**

```javascript
// Filter wishlist items based on user permissions
function filterItemsByRole(items, userRole) {
  // view_only users see all items but no edit options
  // edit users see all items with edit options
}

// Filter access list based on user permissions
function filterAccessListByRole(accessList, userRole) {
  // Only owners can see full access list
  // Others see limited information
}
```

### Phase 3: Frontend Component Development

#### 3.1 Comment System Components

**Task: Create comment-related React components**

**File: `apps/web-frontend/src/components/CommentThread.jsx` (UPDATE)**
```jsx
// Replace the placeholder with full comment functionality
export default function CommentThread({ auth, wid, itemId, canComment }) {
  // Implementation needed:
  // 1. Fetch comments for the item
  // 2. Display comments in chronological order
  // 3. Show comment form if user can comment
  // 4. Handle comment submission
  // 5. Handle comment deletion (if user is owner or author)
  // 6. Show user avatars and names
  // 7. Format timestamps nicely
}
```

**File: `apps/web-frontend/src/components/CommentForm.jsx` (NEW)**
```jsx
// New component for adding comments
export default function CommentForm({ itemId, onCommentAdded }) {
  // Implementation needed:
  // 1. Text area for comment input
  // 2. Submit button
  // 3. Character limit validation
  // 4. API call to post comment
  // 5. Success/error handling
}
```

**File: `apps/web-frontend/src/components/CommentItem.jsx` (NEW)**
```jsx
// Individual comment display component
export default function CommentItem({ comment, canDelete, onDelete }) {
  // Implementation needed:
  // 1. Display comment content
  // 2. Show author name and avatar
  // 3. Show timestamp
  // 4. Delete button (if canDelete)
  // 5. Handle delete confirmation
}
```

#### 3.2 Role Management Components

**Task: Create role management UI components**

**File: `apps/web-frontend/src/components/ManagePeopleModal.jsx` (UPDATE)**
```jsx
// Update existing component to support role changes
export default function ManagePeopleModal({ wishlist, isOpen, onClose }) {
  // Implementation needed:
  // 1. List all users with access
  // 2. Show current roles
  // 3. Role change dropdown (owner only)
  // 4. Remove user button (owner only)
  // 5. API calls for role updates
  // 6. Confirmation dialogs
}
```

**File: `apps/web-frontend/src/components/RoleBadge.jsx` (NEW)**
```jsx
// Component to display user roles
export default function RoleBadge({ role, size = "small" }) {
  // Implementation needed:
  // 1. Display role with appropriate styling
  // 2. Different colors for different roles
  // 3. Tooltip with role description
}
```

#### 3.3 Enhanced Invitation Components

**Task: Update invitation components to support access types**

**File: `apps/web-frontend/src/components/InviteModal.jsx` (UPDATE)**
```jsx
// Update to include access type selection
export default function InviteModal({ wishlist, isOpen, onClose }) {
  // Implementation needed:
  // 1. Access type selection (view_only, edit)
  // 2. Description of each access type
  // 3. Generate invitation with access_type
  // 4. Display invitation link with access type info
}
```

**File: `apps/web-frontend/src/components/InviteAccept.jsx` (UPDATE)**
```jsx
// Update to show access type being granted
export default function InviteAccept({ token }) {
  // Implementation needed:
  // 1. Fetch invitation details including access_type
  // 2. Display what access will be granted
  // 3. Show wishlist preview
  // 4. Accept invitation with access_type
}
```

#### 3.4 Enhanced Item Cards

**Task: Update item cards to show comment functionality**

**File: `apps/web-frontend/src/components/AmazonItemCard.jsx` (UPDATE)**
```jsx
// Add comment functionality to existing item cards
export default function AmazonItemCard({ item, auth, wid, canDelete, onDelete }) {
  // Implementation needed:
  // 1. Add "View Comments" button
  // 2. Open CommentThread when clicked
  // 3. Show comment form if user can comment
}
```

### Phase 4: Permission Integration

#### 4.1 Role-Based UI Updates

**Task: Update all components to respect user roles**

```jsx
// In WishlistView.jsx
// Add role-based permission checking
const userRole = wishlist.role; // From API response
const canEdit = ['owner', 'edit'].includes(userRole);
const canComment = ['owner', 'edit'].includes(userRole);
const canManageRoles = userRole === 'owner';

// Conditionally render UI elements based on permissions
{canEdit && <AddItemButton />}
{canComment && <CommentButton />}
{canManageRoles && <ManagePeopleButton />}
```

#### 4.2 API Integration

**Task: Update API calls to handle new endpoints**

**File: `apps/web-frontend/src/lib/api.js` (UPDATE)**
```javascript
// Add new API functions
export const api = {
  // Existing functions...
  
  // Comment functions
  getComments: (wishlistId, itemId) => 
    fetch(`/api/wishlists/${wishlistId}/items/${itemId}/comments`),
  
  addComment: (wishlistId, itemId, content) =>
    fetch(`/api/wishlists/${wishlistId}/items/${itemId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),
  
  deleteComment: (wishlistId, itemId, commentId) =>
    fetch(`/api/wishlists/${wishlistId}/items/${itemId}/comments/${commentId}`, {
      method: 'DELETE'
    }),
  
  // Role management functions
  updateUserRole: (wishlistId, userId, role) =>
    fetch(`/api/wishlists/${wishlistId}/access/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }),
  
  // Enhanced invitation functions
  createInvite: (wishlistId, accessType) =>
    fetch(`/api/wishlists/${wishlistId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ access_type: accessType })
    })
};
```

### Phase 5: Testing & Validation

#### 5.1 Test Scenarios

**Task: Create comprehensive test scenarios**

```javascript
// Test scenarios to implement:
// 1. Owner can do everything
// 2. Edit user can add/remove items and comment
// 3. View-Only user can only view
// 4. Role changes work correctly
// 5. Invitations with different access types (view_only, edit)
// 6. Comment permissions work correctly
// 7. UI elements show/hide based on roles
```

#### 5.2 Error Handling

**Task: Implement proper error handling**

```javascript
// Error scenarios to handle:
// 1. User tries to comment without permission
// 2. User tries to edit without permission
// 3. User tries to change roles without being owner
// 4. Invalid access types in invitations (only view_only, edit allowed)
// 5. Comment deletion by non-authorized users
// 6. Network errors during API calls
```

## 🚀 Implementation Order

### Week 1: Backend Foundation
1. ✅ Run database migration
2. 🔲 Implement comment endpoints
3. 🔲 Update permission checking functions
4. 🔲 Test backend endpoints

### Week 2: Role Management
1. 🔲 Implement role management endpoints
2. 🔲 Update invitation system
3. 🔲 Test role-based permissions
4. 🔲 Update API Gateway

### Week 3: Frontend Components
1. 🔲 Create comment components
2. 🔲 Update role management UI
3. 🔲 Enhance invitation components
4. 🔲 Update item cards

### Week 4: Integration & Testing
1. 🔲 Integrate all components
2. 🔲 Test all user scenarios
3. 🔲 Handle edge cases
4. 🔲 Performance optimization

## 📚 Additional Resources

- **Database Schema**: See `04_migration.sql` for complete schema
- **Sample Data**: See `05_seed.sql` for test scenarios
- **API Examples**: Use the sample data to test endpoints
- **Role Matrix**: Document which roles can perform which actions

## 🎯 Success Criteria

The implementation is complete when:
- ✅ All comment functionality works
- ✅ Role management works for owners
- ✅ Invitations support different access types
- ✅ UI respects user permissions
- ✅ All test scenarios pass
- ✅ Error handling is comprehensive
- ✅ Performance is acceptable

This guide provides a complete roadmap for implementing the full collaborative wishlist system!
