-- Check if youtube_api_keys table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'youtube_api_keys'
) as table_exists;

-- Check table structure if it exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'youtube_api_keys'
ORDER BY ordinal_position;

-- Check if we have any API keys
SELECT COUNT(*) as key_count FROM public.youtube_api_keys;