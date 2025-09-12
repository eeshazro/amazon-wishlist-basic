## Collaborative Wishlist – Product Requirements (PRD) - Merged Architecture

### Summary
The Amazon Collaborative Wishlist system with merged architecture provides comprehensive wishlist management with role-based access control, invitation system, and comments infrastructure. This PRD defines the current implementation scope, users, journeys, acceptance criteria, and success metrics.

### Background
The merged architecture version provides:
- **Unified wishlist service** handling all wishlist domain functionality
- **Role-based access control**: owner, view_edit, view_only, comment_only
- **Enhanced invitations** with `access_type` and expiry
- **Comments infrastructure** ready for future implementation
- **Streamlined architecture** with single database and service

References:
- Technical specifications: `docs/tech_spec.md`
- API documentation: `docs/api_specifications.md`
- Database schema: `docs/05-database-erd.md`

### Goals
- **Streamlined Architecture**: Unified wishlist service with single database
- **Role-Based Access Control**: Granular permissions for different user types
- **Enhanced Invitations**: Flexible invitation system with access types
- **Performance**: No cross-service calls for permission checks
- **Maintainability**: Single codebase for wishlist domain

### Non-goals
- Rich text comments, attachments, reactions, or mentions
- Cross-wishlist commenting or global activity feeds
- External identity providers beyond existing demo auth

### Users & Roles
- Owner: Creates wishlists, manages roles, full control
- Editor (view_edit): Views and edits wishlist/items, can comment
- Viewer (view_only): Views items and existing comments only
- Invitee: Non-member who accepts an invitation token

### Scope
- **Backend**: Unified wishlist service with all collaboration features
- **Frontend**: Smart tab navigation, invite/accept flows, manage people and roles UI
- **API Gateway**: Simplified routing to unified wishlist service
- **Database**: Unified `wishlistdb` with public schema for all wishlist domain tables
- **Infrastructure**: Comments system ready for future implementation

### Features & Acceptance Criteria

1) Comments on wishlist items
- Add comment to an item if role ∈ {owner, view_edit, comment_only}
- List comments for an item; comments include commenter’s public name and icon
- Comments ordered by `created_at` descending
- Comment delete: owner or author may delete; others forbidden
- Error states: UNAUTHORIZED without token; FORBIDDEN without permission; NOT_FOUND for missing item

2) Role-based access control (RBAC)
- Roles: owner, view_edit, view_only, comment_only
- Owner can update a collaborator’s role via role management UI
- Permissions reflect the matrix in Full API docs (e.g., view_edit can add/edit items and comment; comment_only can comment but not edit items)
- UI disables actions user cannot perform; server validates regardless

3) Invitations with access types
- Owner can create invite with `access_type` ∈ {view_only, view_edit, comment_only}
- Invite contains token and expiry timestamp; token cannot be reused after acceptance or expiry
- Acceptance flow asks user for display name; grants role based on `access_type`
- Expired or invalid tokens produce appropriate errors

4) Web UI enhancements
- `AmazonItemCard` opens a `CommentThread` drawer/modal for comments
- `CommentThread` supports viewing thread and adding a new comment when permitted
- `ManagePeopleModal` lists collaborators, current roles, and allows owner updates/removal
- `InviteModal` generates invite links and shows expiry and access type

### User Journeys

Journey A: Owner invites collaborator with edit
1. Owner opens a wishlist → Invite → selects `view_edit` → copies link
2. Invitee opens link → sees wishlist details summary → accepts, sets display name
3. Invitee can add items and comment; owner sees them listed in Manage People

Journey B: Role change
1. Owner opens Manage People → updates a collaborator from `view_edit` to `view_only`
2. Collaborator immediately loses edit/comment controls in UI; server also enforces



### UX Notes
- Keep comments as simple single-line/paragraph text
- Show avatars and names inline for readability
- Surface disabled states on restricted actions with tooltips explaining required role
- Provide copy-to-clipboard for invite links and clear expiry messaging

### Dependencies
- User profiles for enrichment (`public_name`, `icon_url`)
- Collaboration service for invites/access/comments
- API gateway for auth and enrichment


### Rollout Plan
1. Ship DB migrations (add comments table; add invite `access_type`)
2. Deploy collaboration service with comment + role endpoints
3. Upgrade API gateway with routing/enrichment
4. Enable frontend UI (feature flag optional) once APIs are live
5. Backfill: none needed; existing invites default to `view_only`

### Risks & Mitigations
- Permission drift between UI and API → Always validate on server; disable in UI
- Token leakage → Long, random tokens; short expiries; delete on acceptance
- Comment spam/abuse → Keep scope minimal; owner delete; rate limit TBD

### Out of Scope (Future)
- Mentions, threads with replies, reactions
- Moderation/reporting flows

### Acceptance Test Scenarios (sample)
- View-only user cannot add items or comments (UI disabled, API returns FORBIDDEN)
- Editor can add/edit items and comment; cannot manage users
- Owner can change roles; changes reflect immediately in UI and API

