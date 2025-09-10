-- Merged wishlist service tables (all in public schema)
-- User data is handled by external user service

-- User table (for user service)
CREATE TABLE IF NOT EXISTS "user".user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    public_name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL, -- References external user service
    privacy VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist items
CREATE TABLE IF NOT EXISTS wishlist_item (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL, -- References external product service
    wishlist_id INTEGER NOT NULL REFERENCES wishlist(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    priority INTEGER DEFAULT 1,
    added_by INTEGER NOT NULL, -- References external user service
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id, product_id)
);

-- Wishlist access control (collaboration features)
CREATE TABLE IF NOT EXISTS wishlist_access (
    wishlist_id INTEGER NOT NULL REFERENCES wishlist(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL, -- References external user service
    role VARCHAR(20) NOT NULL DEFAULT 'view_only' 
        CHECK (role IN ('owner', 'view_edit', 'view_only', 'comment_only')),
    invited_by INTEGER, -- References external user service
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_name VARCHAR(255),
    PRIMARY KEY (wishlist_id, user_id)
);

-- Wishlist invitations
CREATE TABLE IF NOT EXISTS wishlist_invite (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlist(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    access_type VARCHAR(20) NOT NULL DEFAULT 'view_only'
        CHECK (access_type IN ('view_only', 'view_edit', 'comment_only')),
    expires_at TIMESTAMP NOT NULL,
    created_by INTEGER NOT NULL, -- References external user service
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments on wishlist items (for future collaborative features)
CREATE TABLE IF NOT EXISTS wishlist_comment (
    id SERIAL PRIMARY KEY,
    wishlist_item_id INTEGER NOT NULL REFERENCES wishlist_item(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL, -- References external user service
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_owner ON wishlist(owner_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_wishlist ON wishlist_item(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_added_by ON wishlist_item(added_by);
CREATE INDEX IF NOT EXISTS idx_wishlist_invite_token ON wishlist_invite(token);
CREATE INDEX IF NOT EXISTS idx_wishlist_invite_wishlist ON wishlist_invite(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_access_user ON wishlist_access(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_access_wishlist ON wishlist_access(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_access_user_role ON wishlist_access(user_id, role);
CREATE INDEX IF NOT EXISTS idx_wishlist_comment_item ON wishlist_comment(wishlist_item_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_comment_user ON wishlist_comment(user_id); 