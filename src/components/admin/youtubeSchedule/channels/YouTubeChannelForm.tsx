import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea'; // For potential notes or longer fields if added
import { AdminYouTubeChannel, CreateAdminYouTubeChannelPayload } from '@/services/types/youtubeSchedule-types';
import { getYouTubeChannelDetails, YouTubeChannelDetails } from '../../../../services/youtubeScheduleService'; // <-- Import the service
import { Loader2, Search } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client'; // No longer needed for direct invoke here

// Define the Zod schema for validation
const formSchema = z.object({
  youtube_channel_id: z.string().min(1, 'YouTube Channel ID is required (e.g., UCxxxxxxxxxxxxxxx or @handle)'),
  // channel_name and avatar_url removed from direct form input
});

type YouTubeChannelFormData = z.infer<typeof formSchema>;

interface FetchedChannelInfo {
  name: string | null;
  avatarUrl: string | null;
  actualChannelId: string; // The verified/resolved YouTube Channel ID
}

interface YouTubeChannelFormProps {
  initialData?: AdminYouTubeChannel | null;
  onSubmit: (data: CreateAdminYouTubeChannelPayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const YouTubeChannelForm: React.FC<YouTubeChannelFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const [fetchedChannelInfo, setFetchedChannelInfo] = useState<FetchedChannelInfo | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { control, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<YouTubeChannelFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      youtube_channel_id: initialData?.youtube_channel_id || '',
    },
  });

  const currentYoutubeChannelIdInput = watch('youtube_channel_id');

  useEffect(() => {
    if (initialData) {
      reset({
        youtube_channel_id: initialData.youtube_channel_id,
      });
      // Pre-fill fetched info from initialData if available
      if (initialData.channel_name || initialData.avatar_url) {
        setFetchedChannelInfo({
          name: initialData.channel_name,
          avatarUrl: initialData.avatar_url,
          actualChannelId: initialData.youtube_channel_id, // Assume initialData.youtube_channel_id is the resolved one
        });
      } else {
        setFetchedChannelInfo(null);
      }
    } else {
      reset({
        youtube_channel_id: '',
      });
      setFetchedChannelInfo(null);
    }
    setFetchError(null);
  }, [initialData, reset]);

  const handleFetchChannelDetails = async () => {
    const channelIdOrHandle = getValues('youtube_channel_id');
    if (!channelIdOrHandle.trim()) {
      setFetchError("Please enter a YouTube Channel ID or @handle.");
      return;
    }
    setIsFetchingDetails(true);
    setFetchError(null);
    setFetchedChannelInfo(null); // Clear previous results

    try {
      // Call the service function instead of invoking directly
      const result = await getYouTubeChannelDetails(channelIdOrHandle);

      if (!result || !result.id) { // Adjusted to match YouTubeChannelDetails interface
        throw new Error('Invalid response or channel not found by the function.');
      }
      
      setFetchedChannelInfo({
        name: result.name || 'N/A',
        avatarUrl: result.pfpUrl || null, // Adjusted to match YouTubeChannelDetails interface (pfpUrl)
        actualChannelId: result.id,
      });
      // Optionally, update the youtube_channel_id field in the form to the resolved ID
      // setValue('youtube_channel_id', result.id, { shouldValidate: true });

    } catch (err: any) {
      // The service function already stringifies the error nicely
      console.error("Error in handleFetchChannelDetails:", err);
      setFetchError(err.message || 'An unknown error occurred while fetching details.');
      setFetchedChannelInfo(null);
    } finally {
      setIsFetchingDetails(false);
    }
  };


  const handleFormSubmit = (data: YouTubeChannelFormData) => {
    if (!fetchedChannelInfo && !initialData?.channel_name) {
      // If no initial data for name (meaning it's a new entry or was never fetched)
      // and no fetched info, we probably shouldn't submit or should warn.
      // For now, let's prevent submission if critical fetched info is missing for a new channel.
      // This logic might need refinement based on whether channel_name/avatar_url are truly optional in DB.
      // The CreateAdminYouTubeChannelPayload requires channel_name & avatar_url to be string | null.
      setFetchError("Please fetch channel details before submitting a new channel.");
      // However, if custom_display_name is provided, maybe that's enough?
      // Forcing fetch for now.
      if (!initialData) return; // Strict: only allow submit if fetched for new entries.
    }

    const payload: CreateAdminYouTubeChannelPayload = {
      youtube_channel_id: fetchedChannelInfo?.actualChannelId || initialData?.youtube_channel_id || data.youtube_channel_id,
      channel_name: fetchedChannelInfo?.name || initialData?.channel_name || null,
      avatar_url: fetchedChannelInfo?.avatarUrl || initialData?.avatar_url || null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="youtube_channel_id" className="text-gray-300">YouTube Channel ID or @Handle (Required)</Label>
        <div className="flex items-center space-x-2 mt-1">
          <Controller
            name="youtube_channel_id"
            control={control}
            render={({ field }) => (
              <Input
                id="youtube_channel_id"
                {...field}
                className="flex-grow py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray focus:ring-lolcow-blue placeholder:text-gray-500"
                placeholder="e.g., UCxxxx or @handle"
              />
            )}
          />
          <Button
            type="button"
            onClick={handleFetchChannelDetails}
            disabled={isFetchingDetails || !currentYoutubeChannelIdInput.trim()}
            variant="secondary"
            className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white px-3 py-2"
          >
            {isFetchingDetails ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Fetch</span>
          </Button>
        </div>
        {errors.youtube_channel_id && <p className="text-sm text-red-400 mt-1">{errors.youtube_channel_id.message}</p>}
        {fetchError && <p className="text-sm text-red-400 mt-1">{fetchError}</p>}
      </div>

      {fetchedChannelInfo && (
        <div className="mt-4 p-3 bg-lolcow-lightgray/30 rounded-md space-y-2">
          <h4 className="text-md font-semibold text-white">Fetched Channel Details:</h4>
          {fetchedChannelInfo.avatarUrl && (
            <img
              src={fetchedChannelInfo.avatarUrl}
              alt={fetchedChannelInfo.name || 'Channel Avatar'}
              className="w-16 h-16 rounded-full bg-lolcow-lightgray/30"
            />
          )}
          {!fetchedChannelInfo.avatarUrl && fetchedChannelInfo.name && (
             <div className="w-16 h-16 rounded-full flex items-center justify-center bg-lolcow-blue text-white text-2xl font-semibold">
                {fetchedChannelInfo.name.charAt(0).toUpperCase()}
              </div>
          )}
          <p className="text-gray-300">
            <span className="font-medium text-white">Name:</span> {fetchedChannelInfo.name || 'N/A'}
          </p>
          <p className="text-gray-300 text-xs font-mono">
            <span className="font-medium text-white">Resolved ID:</span> {fetchedChannelInfo.actualChannelId}
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-lolcow-gray text-gray-300 hover:bg-lolcow-gray/20"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || (isFetchingDetails && !initialData) } // Prevent submit while fetching for new item
          className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {initialData ? 'Save Changes' : 'Add Channel'}
        </Button>
      </div>
    </form>
  );
};

export default YouTubeChannelForm; 