-- Test data for API calls architecture
-- This creates some sample wishlists and items for testing

-- Insert test wishlists
INSERT INTO wishlist (id, name, owner_id, privacy, created_at) VALUES
(1, 'Carol''s Birthday Wishlist', 3, 'Public', NOW()),
(2, 'Alice''s Holiday List', 1, 'Private', NOW()),
(3, 'Bob''s Tech Wishlist', 2, 'Public', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test wishlist items
INSERT INTO wishlist_item (id, product_id, wishlist_id, title, priority, added_by, created_at) VALUES
(1, 1, 1, 'Noise-cancelling Headphones', 1, 3, NOW()),
(2, 12, 1, 'Smart Watch', 2, 3, NOW()),
(3, 9, 1, 'Coffee Maker', 3, 3, NOW()),
(4, 11, 2, 'Bluetooth Speaker', 1, 1, NOW()),
(5, 8, 2, 'Wireless Mouse', 2, 1, NOW()),
(6, 11, 3, 'Bluetooth Speaker', 1, 2, NOW()),
(7, 17, 3, 'Portable Charger', 2, 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test wishlist access (collaboration)
INSERT INTO wishlist_access (wishlist_id, user_id, role, display_name) VALUES
(1, 1, 'view_only', 'Alice Johnson'),
(1, 2, 'view_only', 'Bob Smith'),
(2, 3, 'view_only', 'Carol Davis'),
(3, 1, 'view_only', 'Alice Johnson')
ON CONFLICT (wishlist_id, user_id) DO NOTHING;
