import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from 'lucide-react';
import { NewsletterSignup } from '@/services/newsletterAdminService'; // Import the type
import { format } from 'date-fns'; // For formatting dates

interface NewsletterSignupsTableProps {
  signups: NewsletterSignup[];
  isLoading: boolean;
  onDeleteRequest: (signup: NewsletterSignup) => void;
  deletingId: string | null; // ID of the signup currently being deleted
}

const NewsletterSignupsTable: React.FC<NewsletterSignupsTableProps> = ({
  signups,
  isLoading,
  onDeleteRequest,
  deletingId,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
        <span className="ml-3 text-gray-400">Loading signups...</span>
      </div>
    );
  }

  if (!signups || signups.length === 0) {
    return <p className="text-center text-gray-400 py-5">No newsletter signups found.</p>;
  }

  return (
    <div className="rounded-md border border-lolcow-lightgray bg-lolcow-darkgray">
      <Table>
        <TableHeader>
          <TableRow className="border-lolcow-lightgray hover:bg-lolcow-black/20">
            <TableHead className="text-white font-semibold">Email</TableHead>
            <TableHead className="text-white font-semibold">Subscribed At</TableHead>
            <TableHead className="text-right text-white font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signups.map((signup) => (
            <TableRow key={signup.id} className="border-lolcow-lightgray hover:bg-lolcow-black/20">
              <TableCell className="text-gray-300">{signup.email}</TableCell>
              <TableCell className="text-gray-300">
                {format(new Date(signup.created_at), 'PPP p')} {/* Format date */}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteRequest(signup)}
                  disabled={deletingId === signup.id} // Disable while deleting this specific item
                  className="text-red-500 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                >
                  {deletingId === signup.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default NewsletterSignupsTable; 