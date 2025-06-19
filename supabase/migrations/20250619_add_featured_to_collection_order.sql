-- Add featured flag to collection_order table for priority collections

-- Add featured column
ALTER TABLE collection_order 
ADD COLUMN featured BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN collection_order.featured IS 'Mark collections as featured for priority display';

-- Update specific collections to be featured based on the previous hardcoded order
UPDATE collection_order 
SET featured = true 
WHERE collection_handle IN (
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
);

-- Create index for performance when filtering by featured status
CREATE INDEX idx_collection_order_featured ON collection_order(featured, display_order) WHERE is_visible = true;