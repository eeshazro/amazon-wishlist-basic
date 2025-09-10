
-- Merged wishlist service seed data
-- Note: User data is now handled by external user service

-- Sample users (for user service)
INSERT INTO "user".user (id, username, public_name, icon_url) VALUES
(1, 'alice', 'Alice Johnson', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'),
(2, 'bob', 'Bob Smith', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'),
(3, 'carol', 'Carol Davis', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'),
(4, 'dave', 'Dave Wilson', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')
ON CONFLICT (id) DO NOTHING;

-- Sample wishlists (using user IDs from external user service)
INSERT INTO wishlist (id, name, owner_id, privacy) VALUES
(1, 'Alice''s Birthday', 1, 'shared'),
(2, 'Christmas List', 1, 'private'),
(3, 'Home Office Setup', 2, 'public')
ON CONFLICT (id) DO NOTHING;

-- Sample wishlist items
INSERT INTO wishlist_item (product_id, wishlist_id, title, priority, added_by) VALUES
(1, 1, 'Noise-cancelling Headphones', 1, 1),
(12, 1, 'Smart Watch', 2, 1),
(9, 2, 'Coffee Maker', 1, 1),
(21, 3, 'Monitor Arm', 1, 2),
(16, 3, 'Gaming Chair', 2, 2)
ON CONFLICT DO NOTHING;

-- Sample collaboration access (view-only)
INSERT INTO wishlist_access (wishlist_id, user_id, role, invited_by, display_name) VALUES
(1, 2, 'view_only', 1, 'Bob'),
(1, 3, 'view_only', 1, 'Carol')
ON CONFLICT DO NOTHING;

-- Reset sequences to prevent ID conflicts
SELECT setval('wishlist_id_seq', (SELECT MAX(id) FROM wishlist));
SELECT setval('wishlist_item_id_seq', (SELECT MAX(id) FROM wishlist_item)); 