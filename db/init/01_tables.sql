-- Basic version tables (no comments, no advanced collaboration)

-- User schema
CREATE TABLE IF NOT EXISTS "user"."user" (
    id SERIAL PRIMARY KEY,
    public_name VARCHAR(255) NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist schema
CREATE TABLE IF NOT EXISTS "wishlist"."wishlist" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES "user"."user"(id) ON DELETE CASCADE,
    privacy VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "wishlist"."wishlist_item" (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    wishlist_id INTEGER NOT NULL REFERENCES "wishlist"."wishlist"(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    priority INTEGER DEFAULT 1,
    comments TEXT,
    added_by INTEGER NOT NULL REFERENCES "user"."user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id, product_id)
);

-- Collaboration schema (basic version - view-only only)
CREATE TABLE IF NOT EXISTS "collab"."wishlist_invite" (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES "wishlist"."wishlist"(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "collab"."wishlist_access" (
    wishlist_id INTEGER NOT NULL REFERENCES "wishlist"."wishlist"(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"."user"(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'view_only' CHECK (role IN ('view_only')),
    invited_by INTEGER REFERENCES "user"."user"(id) ON DELETE SET NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_name VARCHAR(255),
    PRIMARY KEY (wishlist_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_owner ON "wishlist"."wishlist"(owner_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_wishlist ON "wishlist"."wishlist_item"(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_added_by ON "wishlist"."wishlist_item"(added_by);
CREATE INDEX IF NOT EXISTS idx_wishlist_invite_token ON "collab"."wishlist_invite"(token);
CREATE INDEX IF NOT EXISTS idx_wishlist_invite_wishlist ON "collab"."wishlist_invite"(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_access_user ON "collab"."wishlist_access"(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_access_wishlist ON "collab"."wishlist_access"(wishlist_id); 