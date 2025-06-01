# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `npm run dev` - Start development server on http://localhost:8080
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Supabase Commands
- `npx supabase start` - Start local Supabase stack
- `npx supabase db reset` - Reset local database with migrations
- `npx supabase functions serve` - Serve edge functions locally
- `npx supabase gen types typescript --local` - Generate TypeScript types from database schema

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

#### Data Management
- TanStack React Query for all server state (5min stale time)
- Auto-generated TypeScript types from Supabase schema
- Row Level Security (RLS) policies on all database tables
- Service layer pattern for business logic (auth, discord, youtube, tickets)

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
- Auto-generated types from `npm run generate-types`
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

### Key Integration Points

#### Discord Integration
- OAuth with extended scopes: identify, email, connections, guilds
- Automatic profile creation and synchronization
- Guild membership tracking and role management

#### YouTube Integration
- Membership verification and tracking
- Connection status monitoring
- Integration with content delivery

#### E-commerce
- Shopify order tracking
- Printful integration for product fulfillment
- Order linking and customer management

### Development Notes
- The application includes a development mode with mocked user data for testing
- All database tables use RLS - ensure proper policies when adding new tables
- Edge functions require JWT verification (configurable in `supabase/config.toml`)
- Use the existing service patterns when adding new integrations
- Follow established component patterns and TypeScript conventions