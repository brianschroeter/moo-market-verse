/* 
  Storage Policies for 'images' bucket
*/

-- Policy: Allow authenticated users to upload (insert)
CREATE POLICY "Allow authenticated uploads to images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'images');

-- Policy: Allow authenticated users to read/select 
CREATE POLICY "Allow authenticated reads from images" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'images');
