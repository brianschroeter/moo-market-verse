import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox'; // For is_recurring
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // For Date Picker
import { Calendar } from '@/components/ui/calendar'; // For Date Picker
import { AdminScheduleSlot, CreateAdminScheduleSlotPayload, AdminYouTubeChannel } from '@/services/types/youtubeSchedule-types';
import { cn } from '@/lib/utils'; // For shadcn/ui class merging
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Zod schema for validation
const slotFormSchema = z.object({
  youtube_channel_id: z.string().min(1, 'YouTube Channel is required'),
  is_recurring: z.boolean().default(true),
  day_of_week: z.array(z.number().min(0).max(6)).default([]), // Array of numbers, default to empty array
  specific_date: z.date().optional().nullable(),
  default_start_time_utc: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'), // HH:MM
  fallback_title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(data => {
  if (data.is_recurring) {
    return data.day_of_week.length > 0; // Must select at least one day if recurring
  }
  return true;
}, {
  message: 'At least one day of the week is required for recurring slots',
  path: ['day_of_week'],
}).refine(data => {
  if (!data.is_recurring) {
    return data.specific_date !== null && data.specific_date !== undefined;
  }
  return true;
}, {
  message: 'Specific date is required for non-recurring slots',
  path: ['specific_date'],
});

type ScheduleSlotFormData = z.infer<typeof slotFormSchema>;

interface ScheduleSlotFormProps {
  initialData?: AdminScheduleSlot | null;
  youtubeChannels: AdminYouTubeChannel[];
  onSubmit: (data: CreateAdminScheduleSlotPayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const weekDays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const ScheduleSlotForm: React.FC<ScheduleSlotFormProps> = ({
  initialData,
  youtubeChannels,
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const getInitialDayOfWeek = (): number[] => {
    if (initialData?.day_of_week) {
      if (Array.isArray(initialData.day_of_week)) {
        return initialData.day_of_week;
      }
      // Handle legacy single number or other non-array truthy values by wrapping in an array if it's a number
      if (typeof initialData.day_of_week === 'number') {
        return [initialData.day_of_week];
      }
    }
    return []; // Default to empty array if null, undefined, or not a recognized format
  };

  const { control, handleSubmit, reset, watch, formState: { errors }, setValue } = useForm<ScheduleSlotFormData>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: {
      youtube_channel_id: initialData?.youtube_channel_id || (youtubeChannels.length > 0 ? youtubeChannels[0].id : ''),
      is_recurring: initialData?.is_recurring === undefined ? true : initialData.is_recurring,
      day_of_week: getInitialDayOfWeek(), // Use helper for robust initialization
      specific_date: initialData?.specific_date ? new Date(initialData.specific_date) : null,
      default_start_time_utc: initialData?.default_start_time_utc?.substring(0,5) || '12:00',
      fallback_title: initialData?.fallback_title || '',
      notes: initialData?.notes || '',
    },
  });

  const isRecurring = watch('is_recurring');

  useEffect(() => {
    const newDayOfWeek = () => {
      if (initialData?.day_of_week) {
        if (Array.isArray(initialData.day_of_week)) {
          return initialData.day_of_week;
        }
        if (typeof initialData.day_of_week === 'number') {
          return [initialData.day_of_week];
        }
      }
      return [];
    };

    if (initialData) {
      reset({
        youtube_channel_id: initialData.youtube_channel_id,
        is_recurring: initialData.is_recurring,
        day_of_week: newDayOfWeek(), // Use consistent logic for reset
        specific_date: initialData.specific_date ? new Date(initialData.specific_date) : null,
        default_start_time_utc: initialData.default_start_time_utc?.substring(0,5) || '12:00',
        fallback_title: initialData.fallback_title || '',
        notes: initialData.notes || '',
      });
    } else {
      // Reset to default for new form
      reset({
        youtube_channel_id: youtubeChannels.length > 0 ? youtubeChannels[0].id : '',
        is_recurring: true,
        day_of_week: [], // Default to empty array for new form
        specific_date: null,
        default_start_time_utc: '12:00',
        fallback_title: '',
        notes: '',
      });
    }
  }, [initialData, reset, youtubeChannels]);

  const handleFormSubmit = (data: ScheduleSlotFormData) => {
    const payload: CreateAdminScheduleSlotPayload = {
      youtube_channel_id: data.youtube_channel_id,
      is_recurring: data.is_recurring,
      day_of_week: data.is_recurring ? (data.day_of_week.length > 0 ? data.day_of_week : null) : null, // Send null if empty array, or just send array
      specific_date: !data.is_recurring && data.specific_date ? format(data.specific_date, 'yyyy-MM-dd') : null,
      default_start_time_utc: `${data.default_start_time_utc}:00`, // Ensure seconds are added if DB expects HH:MM:SS
      fallback_title: data.fallback_title ?? null,
      notes: data.notes ?? null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2 pr-2 max-h-[70vh] overflow-y-auto">
      {/* YouTube Channel */}
      <div>
        <Label htmlFor="youtube_channel_id">YouTube Channel</Label>
        <Controller
          name="youtube_channel_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
              <SelectTrigger id="youtube_channel_id" className="mt-1 bg-lolcow-lightgray">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent className="bg-lolcow-lightgray text-white">
                {youtubeChannels.map(channel => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.custom_display_name || channel.channel_name || channel.youtube_channel_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.youtube_channel_id && <p className="text-sm text-red-400 mt-1">{errors.youtube_channel_id.message}</p>}
      </div>

      {/* Is Recurring Toggle */}
      <div className="flex items-center space-x-2 pt-2">
        <Controller
            name="is_recurring"
            control={control}
            render={({ field }) => (
                <Checkbox
                    id="is_recurring"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                            setValue('specific_date', null, { shouldValidate: true });
                        } else {
                            setValue('day_of_week', [], { shouldValidate: true });
                        }
                    }}
                />
            )}
        />
        <Label htmlFor="is_recurring" className="cursor-pointer">Is this a recurring weekly slot?</Label>
      </div>

      {/* Day of Week (if recurring) */}
      {isRecurring && (
        <div>
          <Label>Day(s) of the Week</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1 p-2 rounded-md border border-lolcow-lightgray">
            {weekDays.map(day => (
              <Controller
                key={day.value}
                name="day_of_week"
                control={control}
                render={({ field }) => {
                  const currentDays = field.value || [];
                  return (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={currentDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          const newDays = checked
                            ? [...currentDays, day.value]
                            : currentDays.filter(d => d !== day.value);
                          field.onChange(newDays.sort((a, b) => a - b));
                        }}
                      />
                      <Label htmlFor={`day-${day.value}`} className="font-normal cursor-pointer">{day.label}</Label>
                    </div>
                  );
                }}
              />
            ))}
          </div>
          {errors.day_of_week && <p className="text-sm text-red-400 mt-1">{errors.day_of_week.message}</p>}
        </div>
      )}

      {/* Specific Date (if not recurring) */}
      {!isRecurring && (
        <div>
          <Label htmlFor="specific_date">Specific Date</Label>
          <Controller
            name="specific_date"
            control={control}
            render={({ field }) => (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="specific_date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal mt-1 bg-lolcow-lightgray hover:bg-lolcow-lightgray hover:text-white",
                                !field.value && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-lolcow-darkgray border-lolcow-lightgray" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={(date) => field.onChange(date ?? null)}
                            initialFocus
                            className="text-white"
                        />
                    </PopoverContent>
                </Popover>
            )}
          />
          {errors.specific_date && <p className="text-sm text-red-400 mt-1">{errors.specific_date.message}</p>}
        </div>
      )}

      {/* Default Start Time UTC */}
      <div>
        <Label htmlFor="default_start_time_utc">Default Start Time (UTC - HH:MM)</Label>
        <Controller
          name="default_start_time_utc"
          control={control}
          render={({ field }) => <Input id="default_start_time_utc" type="time" {...field} className="mt-1 bg-lolcow-lightgray" />}
        />
        {errors.default_start_time_utc && <p className="text-sm text-red-400 mt-1">{errors.default_start_time_utc.message}</p>}
      </div>

      {/* Fallback Title */}
      <div>
        <Label htmlFor="fallback_title">Fallback Title (Optional)</Label>
        <Controller
          name="fallback_title"
          control={control}
          render={({ field }) => <Input id="fallback_title" {...field} value={field.value ?? ''} className="mt-1 bg-lolcow-lightgray" placeholder="E.g., Community Night"/>}
        />
        {errors.fallback_title && <p className="text-sm text-red-400 mt-1">{errors.fallback_title.message}</p>}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => <Textarea id="notes" {...field} value={field.value ?? ''} className="mt-1 bg-lolcow-lightgray" placeholder="Any internal notes for this slot..."/>}
        />
        {errors.notes && <p className="text-sm text-red-400 mt-1">{errors.notes.message}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-3">
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
          disabled={isSubmitting}
          className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white"
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {initialData ? 'Save Changes' : 'Add Slot'}
        </Button>
      </div>
    </form>
  );
};

export default ScheduleSlotForm; 