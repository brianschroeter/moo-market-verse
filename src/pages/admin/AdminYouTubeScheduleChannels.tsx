import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { YouTubeChannelsTable } from '@/components/admin/youtubeSchedule/channels/YouTubeChannelsTable';
import YouTubeChannelForm from '@/components/admin/youtubeSchedule/channels/YouTubeChannelForm';
import {
  getAdminYouTubeChannels,
  createAdminYouTubeChannel,
  updateAdminYouTubeChannel,
  deleteAdminYouTubeChannel,
} from '@/services/youtubeScheduleService';
import { AdminYouTubeChannel, CreateAdminYouTubeChannelPayload } from '@/services/types/youtubeSchedule-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
// import { useToast } from '@/components/ui/use-toast'; // Optional: for notifications

const AdminYouTubeScheduleChannels: React.FC = () => {
  const queryClient = useQueryClient();
  // const { toast } = useToast(); // Optional

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<AdminYouTubeChannel | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<AdminYouTubeChannel | null>(null);

  const { data: channels, isLoading, isError, error } = useQuery<AdminYouTubeChannel[], Error>({
    queryKey: ['adminYouTubeChannels'],
    queryFn: getAdminYouTubeChannels,
  });

  const createChannelMutation = useMutation<AdminYouTubeChannel, Error, CreateAdminYouTubeChannelPayload>({
    mutationFn: createAdminYouTubeChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminYouTubeChannels'] });
      setIsModalOpen(false);
      // toast({ title: 'Success', description: 'YouTube channel added.' });
    },
    onError: (err) => {
      console.error('Failed to create channel:', err);
      // toast({ variant: 'destructive', title: 'Error', description: `Failed to add channel: ${err.message}` });
    },
  });

  const updateChannelMutation = useMutation<AdminYouTubeChannel, Error, AdminYouTubeChannel>({
    mutationFn: updateAdminYouTubeChannel, // Assumes updateAdminYouTubeChannel takes the full AdminYouTubeChannel object
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminYouTubeChannels'] });
      setIsModalOpen(false);
      setEditingChannel(null);
      // toast({ title: 'Success', description: 'YouTube channel updated.' });
    },
    onError: (err) => {
      console.error('Failed to update channel:', err);
      // toast({ variant: 'destructive', title: 'Error', description: `Failed to update channel: ${err.message}` });
    },
  });

  const deleteChannelMutation = useMutation<void, Error, string>({
    mutationFn: deleteAdminYouTubeChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminYouTubeChannels'] });
      // toast({ title: 'Success', description: 'YouTube channel deleted.' });
    },
    onError: (err) => {
      console.error('Failed to delete channel:', err);
      // toast({ variant: 'destructive', title: 'Error', description: `Failed to delete channel: ${err.message}` });
    },
  });

  const handleAddChannel = () => {
    setEditingChannel(null);
    setIsModalOpen(true);
  };

  const handleEditChannel = (channel: AdminYouTubeChannel) => {
    setEditingChannel(channel);
    setIsModalOpen(true);
  };

  const handleDeleteChannel = (channel: AdminYouTubeChannel) => {
    setChannelToDelete(channel);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteChannel = () => {
    if (channelToDelete) {
      deleteChannelMutation.mutate(channelToDelete.id);
      setShowDeleteConfirm(false);
      setChannelToDelete(null);
    }
  };

  const handleFormSubmit = (data: CreateAdminYouTubeChannelPayload) => {
    if (editingChannel) {
      updateChannelMutation.mutate({ ...editingChannel, ...data });
    } else {
      createChannelMutation.mutate(data);
    }
  };

  if (isError) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-6 font-fredoka">Manage YouTube Channels</h1>
          <div className="text-red-400 bg-red-900/20 p-4 rounded-md">
            Error fetching YouTube channels: {error?.message}
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white font-fredoka">Manage YouTube Channels</h1>
          <Button onClick={handleAddChannel} className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add YouTube Channel
          </Button>
        </div>

        <YouTubeChannelsTable
          channels={channels || []}
          onEdit={handleEditChannel}
          onDelete={handleDeleteChannel}
          isLoading={isLoading}
        />

        <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingChannel(null);
          }
          setIsModalOpen(isOpen);
        }}>
          <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-fredoka text-xl">
                {editingChannel ? 'Edit YouTube Channel' : 'Add New YouTube Channel'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingChannel ? 'Update the details of the YouTube channel.' : 'Enter the details for the new YouTube channel.'}
              </DialogDescription>
            </DialogHeader>
            <YouTubeChannelForm
              initialData={editingChannel}
              onSubmit={handleFormSubmit}
              isSubmitting={createChannelMutation.isPending || updateChannelMutation.isPending}
              onCancel={() => {
                setIsModalOpen(false);
                setEditingChannel(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {channelToDelete && (
          <ConfirmationDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={handleConfirmDeleteChannel}
            isConfirming={deleteChannelMutation.isPending}
            title="Confirm Channel Deletion"
            description={
              <>
                Are you sure you want to permanently delete the channel <span className="font-semibold text-white">{channelToDelete.channel_name || channelToDelete.youtube_channel_id}</span>?
                This action cannot be undone.
              </>
            }
            confirmText="Confirm Delete"
            confirmVariant="destructive"
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminYouTubeScheduleChannels; 