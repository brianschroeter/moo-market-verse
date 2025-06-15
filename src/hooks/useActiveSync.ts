import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that triggers active YouTube sync when the schedule page is viewed
 * This ensures live streams transition properly from upcoming to live
 */
export const useActiveSync = () => {
  const lastSyncRef = useRef<number>(0);
  const syncInProgressRef = useRef<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const triggerActiveSync = async () => {
      const now = Date.now();
      const minSyncInterval = 5 * 60 * 1000; // 5 minutes minimum between syncs

      // Skip if we synced recently or a sync is in progress
      if (
        syncInProgressRef.current ||
        now - lastSyncRef.current < minSyncInterval
      ) {
        return;
      }

      try {
        syncInProgressRef.current = true;
        lastSyncRef.current = now;

        console.log('[ActiveSync] Triggering active streams sync...');

        // Call the manual sync endpoint which doesn't require auth
        const response = await fetch('/api/manual-youtube-sync-active', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[ActiveSync] Sync completed:', result);
          
          // Invalidate schedule query to fetch fresh data
          await queryClient.invalidateQueries({ queryKey: ['schedule'] });
        } else {
          console.error('[ActiveSync] Sync failed:', response.status);
        }
      } catch (error) {
        console.error('[ActiveSync] Error triggering sync:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Trigger sync on mount
    triggerActiveSync();

    // Set up interval to sync every 5 minutes while the page is open
    const interval = setInterval(triggerActiveSync, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};