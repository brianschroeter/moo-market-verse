
import { supabase } from "@/integrations/supabase/client";

export const uploadImage = async (file: File, imageName: string): Promise<string | null> => {
  try {
    // Create a bucket if it doesn't exist (you might want to do this separately)
    const bucketName = 'images';
    
    // Upload the file to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(`featured/${imageName}`, file);
      
    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
    
    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(`featured/${imageName}`);
      
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};
