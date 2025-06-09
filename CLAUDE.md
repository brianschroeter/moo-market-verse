# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `npm run dev` - Start development server (auto-finds available port starting from 8080)
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Supabase Commands
- `npx supabase start` - Start local Supabase stack
- `npx supabase db reset` - Reset local database with migrations
- `npx supabase functions serve` - Serve edge functions locally
- `npx supabase gen types typescript --local` - Generate TypeScript types from database schema
- `npx supabase functions deploy` - Deploy all edge functions
- `npx supabase functions deploy <function-name>` - Deploy specific function

### Database Sync & Utility Scripts
Located in `scripts/` directory:

#### Production Database Sync
- `./scripts/sync-production-db.sh` - Syncs production database to local (requires password)
- `./scripts/sync-shopify-orders.sh` - Syncs ALL Shopify orders from production
- `./scripts/sync-all-shopify-orders.cjs` - Node.js script for Shopify order sync via edge function
- `./scripts/sync-all-printful-orders.cjs` - Node.js script for Printful order sync
- `./scripts/continuous-shopify-sync.cjs` - Continuous sync for fetching all orders

#### Testing & Diagnostics
- `./scripts/check-admin-access.js` - Verify admin access permissions
- `./scripts/check-production-orders.cjs` - Check production order data
- `./scripts/diagnose-shopify-sync.cjs` - Diagnose Shopify sync issues
- `./scripts/test-printful-sync.sh` - Test Printful sync functionality

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

### Key Architectural Patterns

#### Authentication Flow
- Uses Supabase Auth with Discord OAuth integration
- AuthContext provides global user state (`user`, `session`, `profile`, `isAdmin`)
- Development mode available with mocked authentication (check `AuthContext.tsx`)
- Device fingerprinting via FingerprintJS for fraud detection
- Concurrent operation prevention via useRef flags
- State persistence: Impersonation state persisted to localStorage
- Error handling: URL-based auth error detection and toast notifications

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

#### Edge Functions (20+ serverless functions)
Located in `supabase/functions/` with TypeScript + Deno runtime:
- Authentication & user management
- Discord/YouTube API integrations
- Order processing & linking
- Newsletter subscriptions

#### Edge Function Patterns
- **Shared Utilities**: `/supabase/functions/_shared/auth.ts` and `cors.ts`
- **Authentication Pattern**: `ensureAdmin()` utility for admin-only functions
- **Client Types**: Dual client pattern (user-context vs admin service-role)
- **Error Handling**: Consistent CORS headers and JSON error responses
- **Configuration**: Individual function settings in `supabase/config.toml`

#### Row Level Security (RLS) Patterns
- **All tables use RLS**: Every table has policies for read/write access
- **Admin Functions**: Database functions like `is_admin()` and `assert_admin()`
- **User Context**: RLS policies use `auth.uid()` for user-scoped access
- **Cascading Deletes**: Relationships configured for proper cleanup
- **Edge Function Access**: Service role key bypasses RLS for admin operations

### Configuration Files

#### Build & Development
- `vite.config.ts` - Vercel deployment, path aliases (`@/` → `src/`), development tools
- `tailwind.config.ts` - Custom LolCow theme colors, animations, typography
- `components.json` - shadcn/ui configuration
- `eslint.config.js` - TypeScript ESLint with React rules

#### Database & Deployment
- `supabase/config.toml` - Supabase project settings, edge function configs, Discord OAuth
- `supabase/migrations/` - 50+ migration files with comprehensive schema evolution
- `.env` - Supabase environment variables (project ref, URLs, keys)

### Development Patterns

#### Component Development
- Use existing shadcn/ui components from `src/components/ui/`
- Follow established patterns in business components
- TypeScript interfaces for all props
- Functional components with hooks

#### Database Interactions
- Use TanStack Query for all data fetching
- Auto-generated types from `npx supabase gen types typescript --local`
- Service layer functions for complex operations
- RLS policies for data security

#### Admin Features
- Comprehensive admin panel with role-based access
- Admin routes protected via `ProtectedRoute` with `requireAdmin`
- Database functions for admin operations

### Environment Setup
1. Configure Supabase environment variables in `.env`
2. Run `npx supabase start` for local development
3. Use development mode in AuthContext for testing without Discord auth
4. Generate types after schema changes: `npx supabase gen types typescript --local`
5. For production data sync: Use scripts in `scripts/` directory (requires database credentials)

#### Environment Variables
- **Required**: `VITE_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for client
- **Edge Functions**: `SUPABASE_SERVICE_ROLE_KEY` for admin operations (server-side only)
- **Development**: `VITE_DEVMODE=true` enables development mode
- **Discord**: OAuth credentials in `supabase/config.toml`
- **Security**: Service role key intentionally removed from client `.env` file

#### Testing Strategy
- **Current Approach**: Manual testing with development mode
- **No Test Framework**: No automated tests currently implemented
- **Development Testing**: Use `VITE_DEVMODE=true` for isolated testing
- **Edge Function Testing**: Use `npx supabase functions serve` for local testing
- **Database Testing**: Use `npx supabase db reset` for clean state

#### Deployment Architecture
- **Frontend**: Vercel SPA with simple rewrite rule (`vercel.json`)
- **Backend**: Supabase hosted (PostgreSQL + Auth + Edge Functions)
- **Build**: `npm run build` creates optimized production bundle
- **Types**: Auto-generated from Supabase schema, committed to repo

### Key Integration Points

#### Discord Integration
- OAuth with extended scopes: identify, email, connections, guilds
- Automatic profile creation and synchronization
- Guild membership tracking and role management

#### YouTube Integration
- Membership verification and tracking
- Connection status monitoring
- Integration with content delivery
- Hybrid thumbnail approach: real thumbnails with colored placeholder fallback

#### E-commerce
- Shopify order tracking
- Printful integration for product fulfillment
- Order linking and customer management

##### Shopify Sync Architecture
- **Edge Function**: `shopify-orders` handles pagination up to 200 pages (50,000 orders)
- **Authentication**: Function deployed with `--no-verify-jwt` for production sync
- **Sync Methods**: Available via curl script, Node.js script, or direct API call
- **Required Env Variables**: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_API_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`

##### Printful Sync Architecture
- **Admin UI**: Two sync buttons - "Sync Latest Orders" (incremental) and "Full Sync" (complete)
- **Service Function**: `syncPrintfulOrders()` calls `sync-printful-orders` edge function
- **Performance**: Incremental sync: 30-60 seconds, Full sync: 5-10 minutes for ~800 orders
- **Required Secret**: `PRINTFUL_API_KEY` must be set in Supabase secrets

#### Integration Error Handling
- **Discord API**: OAuth with extended scopes, automatic connection sync
- **YouTube API**: Membership verification with connection status tracking
- **E-commerce**: Shopify/Printful order linking with edge function processing
- **Error Recovery**: Graceful degradation when external APIs fail
- **Rate Limiting**: Built-in handling for API rate limits

### Development Notes
- The application includes a development mode with mocked user data for testing
- All database tables use RLS - ensure proper policies when adding new tables
- Edge functions require JWT verification (configurable in `supabase/config.toml`)
- Use the existing service patterns when adding new integrations
- Follow established component patterns and TypeScript conventions

#### Auth State Management
- **Auto-cleanup**: The app automatically detects and clears corrupted auth state on initialization
- **localStorage keys**: Supabase auth keys (`supabase.auth.*`, `sb-*`) are cleared when corruption is detected
- **Session validation**: Invalid sessions trigger automatic cleanup to prevent user errors
- **Graceful signout**: Missing sessions during signout are handled gracefully instead of showing errors