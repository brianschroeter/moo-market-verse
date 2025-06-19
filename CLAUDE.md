# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `npm run dev` - Start development server on port 3000
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Deployment Process
Standard deployment workflow for production:
```bash
npm run build
git add .
git commit -m "feat: Your commit message"
git push
vercel --prod
```

### Supabase Commands
- `npx supabase start` - Start local Supabase stack
- `npx supabase db reset` - Reset local database with migrations
- `npx supabase functions serve` - Serve edge functions locally
- `npx supabase gen types typescript --local` - Generate TypeScript types from database schema
- `npx supabase functions deploy` - Deploy all edge functions
- `npx supabase functions deploy <function-name>` - Deploy specific function

### Database Sync & Utility Scripts
Located in `scripts/` directory:

#### Fresh Development Setup
```bash
npx supabase start
./scripts/sync-all-production.sh
# Edit and run production-secrets-template.sh
npm run dev
```

#### Production Database Sync
- `./scripts/sync-production-db.sh` - Syncs production database to local (requires password)
- `./scripts/sync-all-production.sh` - Complete sync of database, edge functions, and storage
- `./scripts/check-sync-status.sh` - Comprehensive status check of local sync state

#### E-commerce Sync
- `./scripts/sync-all-shopify-orders.cjs` - Syncs ALL Shopify orders via edge function
- `./scripts/sync-shopify-orders.sh` - Shell script version for Shopify sync
- `./scripts/continuous-shopify-sync.cjs` - Continuous sync for fetching all orders
- `./scripts/sync-shopify-products.sh` - Syncs all Shopify products and collections
- `./scripts/sync-shopify-products.cjs` - Node.js script for Shopify product sync
- `./scripts/sync-all-printful-orders.cjs` - Syncs all Printful orders
- `./scripts/test-printful-sync.sh` - Test Printful sync functionality
- `./scripts/diagnose-shopify-sync.cjs` - Diagnose Shopify sync issues

#### YouTube Sync
- `./scripts/sync-youtube-schedule.sh` - Manual YouTube schedule sync (runs all 3 sync functions)
- `./scripts/check-youtube-sync.js` - Checks YouTube sync status, channels, API keys, and streams
- `./scripts/refresh-youtube-avatars.cjs` - Refreshes YouTube channel avatars

#### Testing & Diagnostics
- `./scripts/check-admin-access.js` - Verify admin access permissions
- `./scripts/check-production-orders.cjs` - Check production order data
- `./scripts/diagnose-shopify-sync.cjs` - Diagnose Shopify sync issues

### YouTube Sync Manual Endpoints
- Full sync: `curl -X POST "https://discord.lolcow.co/api/manual-youtube-sync" -H "Content-Type: application/json"`
- Active sync: `curl -X POST "https://discord.lolcow.co/api/manual-youtube-sync-active" -H "Content-Type: application/json"`
- Today sync: `curl -X POST "https://discord.lolcow.co/api/manual-youtube-sync-today" -H "Content-Type: application/json"`

### Type Safety Workflow
1. After database schema changes: `npx supabase gen types typescript --local`
2. Types auto-generated to `/src/integrations/supabase/types.ts`
3. Import database types: `import { Tables } from '@/integrations/supabase/types'`
4. Service interfaces defined in `/src/services/types/`
5. All Supabase queries use generated types for compile-time safety

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components built on Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State**: React Context + TanStack React Query
- **Routing**: React Router DOM v6
- **Deployment**: Vercel with SPA rewrite rules

### Key Architectural Patterns

#### Authentication Flow
- Uses Supabase Auth with Discord OAuth integration
- AuthContext provides global user state (`user`, `session`, `profile`, `isAdmin`)
- Development mode available with mocked authentication (check `AuthContext.tsx`)
- Device fingerprinting via FingerprintJS for fraud detection
- Concurrent operation prevention via useRef flags
- State persistence: Impersonation state persisted to localStorage
- Error handling: URL-based auth error detection and toast notifications
- Auto-cleanup: Corrupted auth state automatically detected and cleared on initialization

#### Development Mode Security
- `DEV_MODE` only activates when `import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true'`
- Mock user data in `/src/context/AuthContext.tsx` (NO hardcoded admin access)
- Admin roles still checked through proper role system even in dev mode
- Discord sync and fingerprinting disabled in dev mode
- Development user ID: `dev-user-id`, Discord ID: `dev-discord-id`

#### Admin Impersonation System
- **Purpose**: Admins can view application from user perspective
- **Implementation**: `/src/context/AuthContext.tsx` handles state switching
- **Security**: Only admin users can initiate impersonation
- **State Management**: Original and impersonated user data stored separately
- **Persistence**: Impersonation state survives page refreshes via localStorage
- **Usage**: `startImpersonation(userId)` and `stopImpersonation()` methods

#### Data Management
- TanStack React Query for all server state (5min stale time)
- Auto-generated TypeScript types from Supabase schema
- Row Level Security (RLS) policies on all database tables
- Service layer pattern for business logic (auth, discord, youtube, tickets)
- Query configuration: 5-minute stale time, retry disabled globally
- Client instance: Stable instance created outside component in `App.tsx`
- Mutation patterns: Use `queryClient.invalidateQueries()` for cache updates
- Loading states: Handle loading/error states consistently across components

#### Service Layer Patterns
- **Modular Organization**: Services organized by domain (`/services/auth/`, `/services/discord/`, `/services/ticket/`)
- **Type Safety**: Each service has corresponding types in `/services/types/`
- **Error Handling**: Consistent pattern - try/catch with `console.error` + rethrow
- **Authentication**: Services use `supabase.auth.getSession()` for user context
- **Example Pattern**: See `/src/services/ticket/ticketOperations.ts` for CRUD operations

#### Component Organization
- `src/components/ui/` - shadcn/ui component library
- `src/components/` - Business logic components
- `src/pages/` - Route components
- Compound component patterns for complex UI

#### Role-Based Access Control
- Database-level roles: admin, user (extensible enum)
- `ProtectedRoute` component with optional admin requirements
- Function-level permission checks in database

### Database Architecture

#### Core Tables
- **User Management**: `profiles`, `user_roles`, `user_devices`
- **Social Integration**: `discord_connections`, `discord_guilds`, `youtube_connections`, `youtube_memberships`
- **Content**: `featured_products`, `announcements`, `support_tickets`
- **E-commerce**: `shopify_orders`, printful integration tables
- **YouTube Content**: `youtube_channels`, `youtube_streams`, `schedule_slots`

#### Edge Functions (40+ serverless functions)
Located in `supabase/functions/` with TypeScript + Deno runtime:
- Authentication & user management
- Discord/YouTube API integrations
- Order processing & linking
- Newsletter subscriptions
- YouTube stream synchronization
- Admin management functions

#### YouTube Sync Architecture
- **sync-youtube-streams**: Main sync function with encryption salt handling (YOUTUBE_API_KEY_SALT)
- **sync-youtube-active**: Lightweight sync for live/upcoming streams (2min cache bypass)
- **sync-youtube-today**: Daily schedule sync with forceRefresh and skipCache
- **Stream Status**: Uses YouTube's `liveBroadcastContent` field for accurate status
- **Overnight Streams**: Streams starting after 8PM show on both days with day indicators
- **Cache Strategy**: 2-minute TTL for live content, aggressive bypass for real-time updates
- **Channel Sorting**: Ordered by earliest weekday stream time (Mon-Fri)
- **Cron Jobs**: Vercel cron (daily on free tier) + manual sync endpoints

#### Edge Function Patterns
- **Shared Utilities**: `/supabase/functions/_shared/auth.ts` and `cors.ts`
- **Authentication Pattern**: `ensureAdmin()` utility for admin-only functions
- **Client Types**: Dual client pattern (user-context vs admin service-role)
- **Error Handling**: Consistent CORS headers and JSON error responses
- **Configuration**: Individual function settings in `supabase/config.toml`
- **JWT Verification**: Many functions configured with `verify_jwt = false` for production sync

#### Row Level Security (RLS) Patterns
- **All tables use RLS**: Every table has policies for read/write access
- **Admin Functions**: Database functions like `is_admin()` and `assert_admin()`
- **User Context**: RLS policies use `auth.uid()` for user-scoped access
- **Cascading Deletes**: Relationships configured for proper cleanup
- **Edge Function Access**: Service role key bypasses RLS for admin operations

### Integration Architecture

#### Discord Integration
- OAuth with extended scopes: identify, email, connections, guilds
- Automatic profile creation and synchronization
- Guild membership tracking and role management
- `discord_connections` table stores user connections

#### YouTube Integration
- Membership verification and tracking
- Connection status monitoring
- Integration with content delivery
- Hybrid thumbnail approach: real thumbnails with colored placeholder fallback
- **Schedule Page**: Auto-refresh every 30s when live, 2min otherwise
- **Stream Table**: `youtube_streams` with live status tracking

#### E-commerce Integration

##### Shopify Sync Architecture
- **Order Sync**: `shopify-orders` handles pagination up to 200 pages (50,000 orders)
- **Product Sync**: `sync-shopify-products` syncs all products, collections, and relationships
- **Authentication**: Functions deployed with `--no-verify-jwt` for production sync
- **Sync Methods**: Available via curl script, Node.js script, or admin UI button
- **Required Env Variables**: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_API_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`
- **Product Display**: Products page uses database first, falls back to API if empty
- **Admin UI**: Product sync button available on Shopify Orders admin page
- **Order Linking**: `order_linking` edge function matches orders to users

##### Printful Sync Architecture
- **Admin UI**: Two sync buttons - "Sync Latest Orders" (incremental) and "Full Sync" (complete)
- **Service Function**: `syncPrintfulOrders()` calls `sync-printful-orders` edge function
- **Performance**: Incremental sync: 30-60 seconds, Full sync: 5-10 minutes for ~800 orders
- **Required Secret**: `PRINTFUL_API_KEY` must be set in Supabase secrets

### Environment Configuration

#### Required Environment Variables
- **Frontend**: `VITE_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Development**: `VITE_DEVMODE=true` enables development mode
- **Edge Functions**: Require multiple secrets (see `production-secrets-template.sh`)

#### Local Development Setup
1. Clone repository and install dependencies: `npm install`
2. Start Supabase: `npx supabase start`
3. Sync production data: `./scripts/sync-all-production.sh`
4. Configure secrets: Edit and run `production-secrets-template.sh`
5. Generate types: `npx supabase gen types typescript --local`
6. Start development server: `npm run dev`

### Common Issues and Solutions

#### YouTube Sync Not Working
- **Symptom**: Videos show as live when they're not, or scheduled videos show as "Streamed"
- **Cause**: Encryption salt mismatch or cache issues
- **Solution**: Check YOUTUBE_API_KEY_SALT environment variable, use manual sync endpoints

#### Navigation Items Not Persisting
- **Symptom**: Admin toggle changes revert after page refresh
- **Cause**: Navbar defaulting to show missing database items
- **Solution**: NavigationManager uses insert-or-update pattern, Navbar checks database state properly

#### Auth State Corruption
- **Symptom**: Authentication errors or infinite loops
- **Solution**: App automatically detects and clears corrupted auth state on initialization
- **Prevention**: Graceful signout handling for missing sessions

#### Edge Function Authentication
- **Issue**: Functions failing with authentication errors during production sync
- **Solution**: Many functions configured with `verify_jwt = false` in `supabase/config.toml`

### Development Notes
- The application includes development mode with mocked user data
- All database tables use RLS - ensure proper policies when adding new tables
- Edge functions can be configured to bypass JWT verification
- Use the existing service patterns when adding new integrations
- Follow established component patterns and TypeScript conventions
- Vercel deployment uses simple SPA rewrite rule in `vercel.json`