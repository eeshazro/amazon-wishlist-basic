-- Cleanup script: Remove owner entries from wishlist_access table
-- This script removes any existing owner entries from the access table
-- since owners now have inherent access via wishlist.owner_id

-- Remove any entries where the user is the owner of the wishlist
DELETE FROM wishlist_access 
WHERE EXISTS (
    SELECT 1 FROM wishlist 
    WHERE wishlist.id = wishlist_access.wishlist_id 
    AND wishlist.owner_id = wishlist_access.user_id
);

-- Also remove any entries with role 'owner' (in case there are any)
DELETE FROM wishlist_access 
WHERE role = 'owner';

-- Verify the cleanup
SELECT 
    w.id as wishlist_id,
    w.name as wishlist_name,
    w.owner_id,
    wa.user_id,
    wa.role,
    wa.display_name
FROM wishlist w
LEFT JOIN wishlist_access wa ON w.id = wa.wishlist_id
ORDER BY w.id, wa.user_id;
