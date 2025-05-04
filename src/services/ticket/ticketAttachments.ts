
import { supabase } from "@/integrations/supabase/client";

export async function uploadAttachments(ticketId: string, messageId: string | null, files: File[]): Promise<void> {
  try {
    // Create a unique folder path for this ticket
    const folderPath = `tickets/${ticketId}`;

    for (const file of files) {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${folderPath}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create attachment record in the database
      const { error: dbError } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          message_id: messageId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath
        });

      if (dbError) {
        throw dbError;
      }
    }
  } catch (error) {
    console.error('Error uploading attachments:', error);
    throw error;
  }
}

export const getAttachmentUrl = (filePath: string): string => {
  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
  return data?.publicUrl || '#'; // Return '#' as fallback
};
