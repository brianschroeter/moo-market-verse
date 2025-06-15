import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAdminScheduleSlots,
  createAdminScheduleSlot,
  updateAdminScheduleSlot,
  deleteAdminScheduleSlot,
  syncYouTubeStreams,
} from '@/services/youtubeScheduleService';
import { AdminScheduleSlot, CreateAdminScheduleSlotPayload, UpdateAdminScheduleSlotPayload, AdminYouTubeChannel } from '@/services/types/youtubeSchedule-types';
import ScheduleSlotForm from '@/components/admin/youtubeSchedule/slots/ScheduleSlotForm';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { getAdminYouTubeChannels } from '@/services/youtubeScheduleService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const AdminYouTubeSchedulePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AdminScheduleSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<AdminScheduleSlot | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch YouTube Channels (for the form's channel selector)
  const { data: youtubeChannels, isLoading: isLoadingChannels } = useQuery<AdminYouTubeChannel[], Error>({
    queryKey: ['adminYouTubeChannels'],
    queryFn: getAdminYouTubeChannels,
  });

  // Fetch Schedule Slots
  const { data: scheduleSlots, isLoading: isLoadingSlots, isError, error } = useQuery<AdminScheduleSlot[], Error>({
    queryKey: ['adminScheduleSlots'],
    queryFn: () => getAdminScheduleSlots(),
  });

  // Mutations
  const createSlotMutation = useMutation<AdminScheduleSlot, Error, CreateAdminScheduleSlotPayload>({
    mutationFn: createAdminScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminScheduleSlots'] });
      setIsSlotModalOpen(false);
      toast({ title: 'Success', description: 'Schedule slot added.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to add slot: ${err.message}` });
    },
  });

  const updateSlotMutation = useMutation<AdminScheduleSlot, Error, UpdateAdminScheduleSlotPayload>({
    mutationFn: updateAdminScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminScheduleSlots'] });
      setIsSlotModalOpen(false);
      setEditingSlot(null);
      toast({ title: 'Success', description: 'Schedule slot updated.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update slot: ${err.message}` });
    },
  });

  const deleteSlotMutation = useMutation<void, Error, string>({
    mutationFn: deleteAdminScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminScheduleSlots'] });
      toast({ title: 'Success', description: 'Schedule slot deleted.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to delete slot: ${err.message}` });
    },
  });

  const handleAddSlot = () => {
    setEditingSlot(null);
    setIsSlotModalOpen(true);
  };

  const handleEditSlot = (slot: AdminScheduleSlot) => {
    setEditingSlot(slot);
    setIsSlotModalOpen(true);
  };

  const handleDeleteSlot = (slot: AdminScheduleSlot) => {
    setSlotToDelete(slot);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteSlot = () => {
    if (slotToDelete) {
      deleteSlotMutation.mutate(slotToDelete.id);
      setShowDeleteConfirm(false);
      setSlotToDelete(null);
    }
  };

  const handleSlotFormSubmit = (data: CreateAdminScheduleSlotPayload) => {
    if (editingSlot) {
      updateSlotMutation.mutate({ ...data, id: editingSlot.id } as UpdateAdminScheduleSlotPayload);
    } else {
      createSlotMutation.mutate(data);
    }
  };

  const handleSyncStreams = async () => {
    setIsSyncing(true);
    try {
      const response = await syncYouTubeStreams({
        lookAheadHours: 48,
        lookBackHours: 240, // 10 days back to ensure full previous week coverage
        forceRefresh: true,
        maxResults: 50 // Increased to get more videos per channel
      });

      if (response.success) {
        toast({ 
          title: 'Success', 
          description: `YouTube sync completed! ${response.totalSynced || 0} streams synced.` 
        });
        
        // Optionally, show detailed results
        if (response.channels && response.channels.length > 0) {
          const channelDetails = response.channels
            .map(ch => `${ch.channel}: ${ch.total || 0} videos`)
            .join(', ');
          console.log('Sync details:', channelDetails);
        }
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Sync Failed', 
          description: response.error || 'Failed to sync YouTube streams' 
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Sync Error', 
        description: 'An unexpected error occurred while syncing' 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isError) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-6 font-fredoka">Manage Channel Schedule</h1>
          <div className="text-red-400 bg-red-900/20 p-4 rounded-md">
            Error fetching schedule slots: {error?.message}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Helper to format time (HH:MM) - assuming time is in "HH:MM:SS" or "HH:MM"
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return 'N/A';
    return timeStr.substring(0, 5);
  };

  // Helper to get day of week string
  const getDayOfWeekString = (dayIndices: number[] | number | null | undefined): string => {
    if (!Array.isArray(dayIndices) || dayIndices.length === 0) {
      // If it's not an array or is an empty array, return 'N/A'.
      // This also handles single numbers (legacy data) gracefully.
      return 'N/A';
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Using short names for multiple days
    return dayIndices
      .map(index => days[index] || 'Err')
      .sort((a, b) => {
        // Sort based on the original index in the days array to maintain logical order
        const indexA = days.indexOf(a);
        const indexB = days.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0; // Both are 'Err' or unexpected
        if (indexA === -1) return 1; // Put 'Err' at the end
        if (indexB === -1) return -1; // Put 'Err' at the end
        return indexA - indexB;
      })
      .join(', ');
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white font-fredoka">Manage Channel Schedule</h1>
          <div className="flex gap-2">
            <Button 
              onClick={handleSyncStreams} 
              variant="outline" 
              className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray/[.15]"
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Sync YouTube Streams
                </>
              )}
            </Button>
            <Button onClick={handleAddSlot} className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Schedule Slot
            </Button>
          </div>
        </div>

        {isLoadingSlots || isLoadingChannels ? (
          <div className="text-center text-gray-400 py-8">Loading schedule data...</div>
        ) : (
          <div className="rounded-md border bg-lolcow-charcoal border-lolcow-lightgray">
            <Table>
              <TableHeader>
                <TableRow className="border-lolcow-lightgray">
                  <TableHead className="text-gray-300">Channel</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Date / Day</TableHead>
                  <TableHead className="text-gray-300">Start Time (UTC)</TableHead>
                  <TableHead className="text-gray-300">Fallback Title</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleSlots && scheduleSlots.length > 0 ? (
                  scheduleSlots.map((slot) => {
                    const channel = youtubeChannels?.find(c => c.id === slot.youtube_channel_id);
                    return (
                      <TableRow key={slot.id} className="border-lolcow-lightgray hover:bg-lolcow-gray/10">
                        <TableCell className="text-gray-200 py-3">
                          {channel ? (channel.custom_display_name || channel.channel_name) : 'Unknown Channel'}
                        </TableCell>
                        <TableCell className="text-gray-200 py-3">
                          {slot.is_recurring ? 'Recurring' : 'Specific Date'}
                        </TableCell>
                        <TableCell className="text-gray-200 py-3">
                          {slot.is_recurring ? getDayOfWeekString(slot.day_of_week) : (slot.specific_date ? format(new Date(slot.specific_date), 'PPP') : 'N/A')}
                        </TableCell>
                        <TableCell className="text-gray-200 py-3">{formatTime(slot.default_start_time_utc)}</TableCell>
                        <TableCell className="text-gray-200 py-3">{slot.fallback_title || <span className="text-gray-500 italic">Not set</span>}</TableCell>
                        <TableCell className="text-gray-200 py-3">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditSlot(slot)} className="hover:bg-lolcow-lightgray/[.15] p-1.5">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSlot(slot)} className="hover:bg-lolcow-lightgray/[.15] p-1.5 text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                      No schedule slots found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog for Adding/Editing Schedule Slot */}
        <Dialog open={isSlotModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) setEditingSlot(null);
          setIsSlotModalOpen(isOpen);
        }}>
          <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-fredoka text-xl">
                {editingSlot ? 'Edit Schedule Slot' : 'Add New Schedule Slot'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingSlot ? 'Update the details of this schedule slot.' : 'Enter the details for the new schedule slot.'}
              </DialogDescription>
            </DialogHeader>
            
            <ScheduleSlotForm
              initialData={editingSlot}
              youtubeChannels={youtubeChannels || []}
              onSubmit={handleSlotFormSubmit}
              isSubmitting={createSlotMutation.isPending || updateSlotMutation.isPending}
              onCancel={() => {
                setIsSlotModalOpen(false);
                setEditingSlot(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Deleting Slot */}
        {slotToDelete && (
          <ConfirmationDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={handleConfirmDeleteSlot}
            isConfirming={deleteSlotMutation.isPending}
            title="Confirm Slot Deletion"
            description={
              <>
                Are you sure you want to permanently delete this schedule slot?
                {slotToDelete.fallback_title && <><br/>Title: <span className="font-semibold text-white">{slotToDelete.fallback_title}</span></>}
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

export default AdminYouTubeSchedulePage; 