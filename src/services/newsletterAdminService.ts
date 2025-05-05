
import { fetchNewsletterSignups, deleteNewsletterSignup } from '../pages/api/admin/newsletter-signups';

export interface NewsletterSignup {
  id: string;
  email: string;
  created_at: string;
}

// Fetch all newsletter signups using the updated function
export const getNewsletterSignups = async (): Promise<NewsletterSignup[]> => {
  try {
    return await fetchNewsletterSignups();
  } catch (error: any) {
    console.error('Error in getNewsletterSignups:', error);
    throw new Error(error.message || 'Failed to fetch signups');
  }
};

// Delete a newsletter signup by ID using the updated function
export const deleteNewsletterSignup = async (id: string): Promise<{ message: string }> => {
  try {
    return await deleteNewsletterSignup(id);
  } catch (error: any) {
    console.error('Error in deleteNewsletterSignup:', error);
    throw new Error(error.message || 'Failed to delete signup');
  }
}; 
