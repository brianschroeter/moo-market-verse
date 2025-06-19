-- Initialize Collections and Hide Specific Ones
-- This script will:
-- 1. Create entries for all collections in collection_order
-- 2. Hide the specified collections
-- 3. Mark featured collections

-- First, initialize all collections from shopify_collections
INSERT INTO collection_order (collection_handle, display_order, is_visible, featured)
SELECT 
    handle as collection_handle,
    ROW_NUMBER() OVER (ORDER BY title) - 1 as display_order,
    -- Hide specific collections, show all others
    CASE 
        WHEN handle IN ('featured-products', 'frontpage', 'lolcow-gaming', 'shop-all') 
        THEN false 
        ELSE true 
    END as is_visible,
    -- Mark featured collections
    CASE 
        WHEN handle IN (
            'lolcow-live',
            'lolcow-queen', 
            'lolcow-queens',
            'lolcow-rewind',
            'lolcow-nerd',
            'lolcow-test',
            'mafia-milkers',
            'lolcow-techtalk',
            'lolcow-tech-talk',
            'lolcow-cafe',
            'lolcow-aussy',
            'lolcow-aussie',
            'lolcow-ausi',
            'angry-grandpa'
        ) 
        THEN true 
        ELSE false 
    END as featured
FROM shopify_collections
ON CONFLICT (collection_handle) DO NOTHING;

-- Show what was created
SELECT 
    collection_handle,
    display_order,
    is_visible,
    featured
FROM collection_order
ORDER BY 
    featured DESC,  -- Featured collections first
    display_order ASC;