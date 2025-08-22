-- Basic version seed data

-- Sample users
INSERT INTO "user"."user" (id, public_name, icon_url) VALUES
(1, 'alice', 'https://i.pravatar.cc/100?img=1'),
(2, 'bob', 'https://i.pravatar.cc/100?img=2'),
(3, 'carol', 'https://i.pravatar.cc/100?img=3'),
(4, 'dave', 'https://i.pravatar.cc/100?img=4')
ON CONFLICT (id) DO NOTHING;

-- Sample wishlists
INSERT INTO "wishlist"."wishlist" (id, name, owner_id, privacy) VALUES
(1, 'Alice''s Birthday', 1, 'shared'),
(2, 'Christmas List', 1, 'private'),
(3, 'Home Office Setup', 2, 'public')
ON CONFLICT (id) DO NOTHING;

-- Sample wishlist items
INSERT INTO "wishlist"."wishlist_item" (product_id, wishlist_id, title, priority, comments, added_by) VALUES
(1, 1, 'Wireless Headphones', 1, 'High quality sound', 1),
(2, 1, 'Smart Watch', 2, 'Fitness tracking features', 1),
(3, 2, 'Coffee Maker', 1, 'Programmable', 1),
(4, 3, 'Standing Desk', 1, 'Adjustable height', 2),
(5, 3, 'Ergonomic Chair', 2, 'Lumbar support', 2)
ON CONFLICT DO NOTHING;

-- Sample collaboration access (view-only)
INSERT INTO "collab"."wishlist_access" (wishlist_id, user_id, role, invited_by, display_name) VALUES
(1, 2, 'view_only', 1, 'Bob'),
(1, 3, 'view_only', 1, 'Carol')
ON CONFLICT DO NOTHING;

-- Reset sequences to prevent ID conflicts
SELECT setval('wishlist.wishlist_id_seq', (SELECT MAX(id) FROM wishlist.wishlist));
SELECT setval('wishlist.wishlist_item_id_seq', (SELECT MAX(id) FROM wishlist.wishlist_item)); 