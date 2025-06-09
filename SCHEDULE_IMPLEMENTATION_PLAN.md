# YouTube Schedule Implementation Plan

## Overview
This document outlines the comprehensive plan for building out the YouTube schedule system, focusing on efficient API usage, real-time live stream tracking, and proper handling of schedule discrepancies.

## Current State Analysis

### What's Already Built
- ✅ Database schema for channels, schedule slots, and live streams
- ✅ Admin interface for managing channels and schedule slots
- ✅ Edge functions for admin CRUD operations
- ✅ YouTube API integration for channel lookup
- ✅ Service layer with type-safe operations

### What Needs Implementation
- ❌ YouTube live stream fetching and synchronization
- ❌ Frontend schedule display with real data
- ❌ Past shows section
- ❌ Schedule vs actual broadcast discrepancy handling
- ❌ API usage optimization and caching
- ❌ Public endpoints for schedule data

## YouTube API Quota Management

### API Quotas and Costs
- Default quota: 10,000 units per day
- Search API: 100 units per request
- Videos API: 1 unit per request
- Channels API: 1 unit per request

### Optimization Strategy
1. **Batch Requests**: Fetch data for multiple channels in single API calls
2. **Smart Caching**: Store results with TTL, refresh only when necessary
3. **Incremental Updates**: Only fetch new/changed data
4. **Fallback Options**: Use RSS feeds as backup data source

## Implementation Phases

### Phase 1: Core Database Enhancements ✅
**Status**: Schema already exists, minor enhancements needed

Existing tables:
- `youtube_channels`: Channel information
- `schedule_slots`: Expected schedule with recurring patterns
- `live_streams`: Cache for YouTube broadcast data

Enhancements needed:
```sql
-- Add fields to live_streams table for better tracking
ALTER TABLE live_streams 
ADD COLUMN fetched_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN scheduled_vs_actual_diff INTERVAL,
ADD COLUMN matched_slot_id UUID REFERENCES schedule_slots(id);

-- Add index for efficient queries
CREATE INDEX idx_live_streams_channel_start ON live_streams(channel_id, scheduled_start_time);

-- API usage tracking table
CREATE TABLE youtube_api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  units_used INTEGER NOT NULL,
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  channel_ids TEXT[],
  response_cached BOOLEAN DEFAULT FALSE
);
```

### Phase 2: YouTube Live Stream Sync System

#### 2.1 Edge Function: sync-youtube-streams
```typescript
// supabase/functions/sync-youtube-streams/index.ts
interface SyncConfig {
  channelIds?: string[];  // Specific channels or all
  lookAheadHours?: number; // Default 24
  lookBackHours?: number;  // Default 12 for past shows
  forceRefresh?: boolean;  // Bypass cache
}

// Endpoints:
// GET /sync-youtube-streams - Public endpoint for scheduled cron
// POST /sync-youtube-streams - Admin endpoint for manual sync
```

#### 2.2 Caching Strategy
- Cache YouTube API responses for 15 minutes minimum
- Check `fetched_at` timestamp before making new requests
- Implement stale-while-revalidate pattern
- Store raw API responses for debugging

#### 2.3 YouTube API Integration
```typescript
// Fetch upcoming broadcasts efficiently
async function fetchUpcomingBroadcasts(channelIds: string[]) {
  // Use search API with eventType=upcoming
  // Batch requests where possible
  // Track API usage in database
}

// Fetch recent videos (past shows)
async function fetchRecentVideos(channelIds: string[], hours: number) {
  // Use search API with publishedAfter parameter
  // Limit to reasonable timeframe (24-48 hours)
  // Only fetch if explicitly requested
}
```

### Phase 3: Schedule Matching Algorithm

#### 3.1 Matching Logic
```typescript
interface ScheduleMatcher {
  // Find the schedule slot that best matches a live stream
  findMatchingSlot(stream: LiveStream, slots: ScheduleSlot[]): {
    slot: ScheduleSlot | null;
    confidence: number; // 0-1 score
    timeDifference: number; // minutes
  };
  
  // Determine if stream is within acceptable window
  isWithinScheduleWindow(
    streamTime: Date, 
    slotTime: Date, 
    toleranceMinutes: number = 30
  ): boolean;
}
```

#### 3.2 Discrepancy Handling
- Track when streams don't match expected schedule
- Store time difference in `scheduled_vs_actual_diff`
- Flag for admin review if difference > threshold
- Send notifications for major discrepancies

### Phase 4: Frontend Schedule Display

#### 4.1 Public Edge Function: get-schedule
```typescript
// Returns combined schedule + live stream data
interface ScheduleResponse {
  channels: Channel[];
  scheduleSlots: ScheduleSlot[];
  liveStreams: LiveStream[];
  lastUpdated: Date;
  nextUpdateIn: number; // seconds
}
```

#### 4.2 Frontend Components

##### ScheduleCalendar Component
```typescript
// Weekly grid view showing:
// - Expected schedule slots (from database)
// - Actual/upcoming streams (from YouTube)
// - Visual indicators for matches/mismatches
// - Click to expand for details
```

##### LiveStreamCard Component
```typescript
// Display individual stream with:
// - Thumbnail, title, channel
// - Scheduled vs actual time
// - Status (upcoming, live, completed)
// - Link to YouTube
```

##### PastShowsSection Component
```typescript
// Collapsible section showing:
// - Videos from last 24-48 hours
// - Lazy loaded to save initial page load
// - Optional based on user preference
```

#### 4.3 Real-time Updates
- Use React Query with 5-minute stale time
- WebSocket for live status updates (optional)
- Optimistic UI updates for better UX
- Background refetch when tab becomes active

### Phase 5: Admin Enhancements

#### 5.1 Sync Management Dashboard
- Current sync status and last run time
- API usage metrics and remaining quota
- Manual sync triggers with progress
- Channel-specific sync options

#### 5.2 Discrepancy Reports
- List streams that don't match schedule
- Time difference visualization
- Bulk acknowledgment options
- Export functionality for analysis

#### 5.3 Schedule Templates
- Create recurring weekly patterns
- Copy schedules between channels
- Bulk schedule updates
- Holiday/special event overrides

### Phase 6: Performance & Monitoring

#### 6.1 Metrics to Track
- API calls per sync cycle
- Cache hit/miss ratios
- Average response times
- Schedule match accuracy
- User engagement metrics

#### 6.2 Optimization Targets
- < 100 API units per channel per day
- < 3 second page load time
- > 90% cache hit rate
- < 1% failed sync rate

#### 6.3 Monitoring & Alerts
- API quota usage warnings at 80%
- Failed sync notifications
- Large discrepancy alerts
- Performance degradation alerts

## Technical Implementation Details

### API Response Caching
```typescript
interface CachedResponse {
  channelId: string;
  endpoint: string;
  response: any;
  fetchedAt: Date;
  ttlSeconds: number;
  apiUnitsUsed: number;
}

// Helper to check if cache is still valid
function isCacheValid(cached: CachedResponse): boolean {
  const age = Date.now() - cached.fetchedAt.getTime();
  return age < cached.ttlSeconds * 1000;
}
```

### Error Handling
```typescript
class YouTubeAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public quotaExceeded: boolean = false
  ) {
    super(message);
  }
}

// Graceful degradation
async function fetchWithFallback(channelId: string) {
  try {
    return await fetchFromYouTubeAPI(channelId);
  } catch (error) {
    if (error.quotaExceeded) {
      return await fetchFromCache(channelId);
    }
    // Try RSS feed as last resort
    return await fetchFromRSSFeed(channelId);
  }
}
```

### Rate Limiting
```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      await this.delay(1000); // 1 request per second
    }
    
    this.processing = false;
  }
  
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Database Migration Order

1. First migration: Add new fields to `live_streams` table
2. Second migration: Create `youtube_api_usage` table
3. Third migration: Add indexes for performance
4. Fourth migration: Create functions for schedule matching

## Security Considerations

1. **API Keys**: Store YouTube API key in Supabase secrets
2. **Rate Limiting**: Implement request throttling
3. **Access Control**: Public read, admin write for schedule data
4. **Input Validation**: Sanitize all user inputs
5. **CORS**: Properly configure for edge functions

## Success Metrics

1. **API Efficiency**: < 10% of daily quota used
2. **Data Freshness**: Live streams updated within 15 minutes
3. **User Experience**: Schedule loads in < 2 seconds
4. **Accuracy**: > 95% schedule matching accuracy
5. **Reliability**: > 99.9% uptime for sync system

## Timeline Estimate

- Phase 1: 2-4 hours (database updates)
- Phase 2: 8-12 hours (YouTube sync system)
- Phase 3: 4-6 hours (matching algorithm)
- Phase 4: 8-12 hours (frontend implementation)
- Phase 5: 4-6 hours (admin enhancements)
- Phase 6: 4-6 hours (optimization & monitoring)

**Total**: 30-46 hours of development

## Next Steps

1. Review and approve this plan
2. Set up YouTube API credentials
3. Begin Phase 1 implementation
4. Test with single channel before scaling
5. Monitor API usage closely during development