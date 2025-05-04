import React, { useState, useEffect } from 'react';
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNewsletterSignups, deleteNewsletterSignup, NewsletterSignup } from "@/services/newsletterAdminService";
import NewsletterSignupsTable from "@/components/admin/newsletter/NewsletterSignupsTable";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'; // Assuming you have this

const AdminNewsletterSignups: React.FC = () => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [signupToDelete, setSignupToDelete] = useState<NewsletterSignup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["newsletterSignups"];

  // Fetch signups
  const { data: signupsData, isLoading, error } = useQuery<NewsletterSignup[]>({
    queryKey: queryKey,
    queryFn: getNewsletterSignups,
  });
  
  // Log the raw data from useQuery
  useEffect(() => {
    console.log('Raw data from useQuery (signupsData):', signupsData);
    console.log('isLoading:', isLoading);
    console.log('error:', error);
  }, [signupsData, isLoading, error]);

  // Ensure signups is always an array before passing down
  const signups = Array.isArray(signupsData) ? signupsData : [];

  // Log the processed signups array
  useEffect(() => {
    console.log('Processed signups array passed to table:', signups);
  }, [signups]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNewsletterSignup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      toast({ title: "Success", description: "Newsletter signup deleted." });
      setShowDeleteConfirm(false);
      setSignupToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete signup.", variant: 'destructive' });
    },
    onSettled: () => {
        setIsDeleting(false);
    }
  });

  // Handlers
  const handleDeleteRequest = (signup: NewsletterSignup) => {
      setSignupToDelete(signup);
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
      if (!signupToDelete) return;
      setIsDeleting(true);
      deleteMutation.mutate(signupToDelete.id);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-fredoka text-white">Newsletter Signups</h1>
            <p className="text-gray-400 mt-1">View and manage newsletter subscriptions.</p>
          </div>
          {/* Add Export or other buttons here if needed */}
        </div>

        <NewsletterSignupsTable
          signups={signups}
          isLoading={isLoading}
          onDeleteRequest={handleDeleteRequest}
          deletingId={isDeleting ? signupToDelete?.id ?? null : null}
        />

        <ConfirmationDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={handleConfirmDelete}
            isConfirming={isDeleting}
            title="Confirm Signup Deletion"
            description={
              <>
                Are you sure you want to delete the signup for:{' '}
                <span className="font-semibold text-white">{signupToDelete?.email}</span>?
                This action cannot be undone.
              </>
            }
            confirmText="Delete Signup"
            confirmVariant="destructive"
          />
      </div>
    </AdminLayout>
  );
};

export default AdminNewsletterSignups; 