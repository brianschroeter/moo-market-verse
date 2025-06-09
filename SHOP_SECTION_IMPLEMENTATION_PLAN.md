# Shop Section Implementation Plan

## Overview
This document outlines the implementation plan for adding a Shop section to the LolCow Portal application. The Shop will integrate with Shopify to display collections and allow users to browse products by collection.

## Architecture Overview

### Technology Integration
- **Frontend**: React + TypeScript components
- **Backend**: Shopify Storefront API integration via Supabase Edge Functions
- **Data Flow**: Shopify Collections → Edge Function → React Components
- **Navigation**: New "Shop" route with collection-based browsing

## Required Shopify API Setup

### Shopify Storefront API Access Token
1. **Create Private App in Shopify Admin**:
   - Go to: Apps > App and sales channel settings > Develop apps
   - Click "Create an app"
   - Name: "LolCow Portal Integration"

2. **Configure Storefront API Access**:
   - In the app configuration, go to "Configuration" tab
   - Under "Storefront API access scopes", enable:
     - `unauthenticated_read_product_listings`
     - `unauthenticated_read_product_inventory`
     - `unauthenticated_read_collection_listings`
     - `unauthenticated_read_product_tags`

3. **Generate Access Token**:
   - Install the app in your store
   - Copy the "Storefront access token" (starts with `shpat_`)

### Environment Variables
Add to Supabase Edge Function secrets:
```bash
# Required for Shop functionality
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_SHOP_DOMAIN=your-shop-name.myshopify.com
SHOPIFY_STOREFRONT_API_VERSION=2024-04
```

## Database Schema Changes

### New Tables
```sql
-- Collections cache table
CREATE TABLE shopify_collections (
  id BIGINT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  products_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products cache table (extend existing if any)
CREATE TABLE shopify_products (
  id BIGINT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active',
  featured_image_url TEXT,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  available BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection-Product relationship
CREATE TABLE collection_products (
  collection_id BIGINT REFERENCES shopify_collections(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES shopify_products(id) ON DELETE CASCADE,
  position INTEGER,
  PRIMARY KEY (collection_id, product_id)
);

-- Add RLS policies
ALTER TABLE shopify_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- Public read access (shop is public)
CREATE POLICY "Public read access to collections" ON shopify_collections
FOR SELECT USING (true);

CREATE POLICY "Public read access to products" ON shopify_products
FOR SELECT USING (true);

CREATE POLICY "Public read access to collection products" ON collection_products
FOR SELECT USING (true);
```

## Edge Functions

### New Edge Function: `shopify-storefront`
Location: `supabase/functions/shopify-storefront/index.ts`

**Purpose**: Interface with Shopify Storefront API for public product data

**Endpoints**:
- `GET /collections` - List all collections
- `GET /collections/{handle}` - Get collection details with products
- `GET /products/{handle}` - Get individual product details
- `POST /sync-collections` - Admin sync collections from Shopify

**Key Features**:
- GraphQL queries to Shopify Storefront API
- Response caching in Supabase
- Error handling for API limits
- Support for pagination

### Sample GraphQL Queries

**Collections List**:
```graphql
query GetCollections($first: Int!) {
  collections(first: $first) {
    edges {
      node {
        id
        handle
        title
        description
        image {
          url
        }
        products(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Collection with Products**:
```graphql
query GetCollectionProducts($handle: String!, $first: Int!) {
  collection(handle: $handle) {
    id
    title
    description
    image {
      url
    }
    products(first: $first) {
      edges {
        node {
          id
          handle
          title
          description
          featuredImage {
            url
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          availableForSale
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

## Frontend Implementation

### New Routes
Add to `src/App.tsx`:
```tsx
<Route path="/shop" element={<Shop />} />
<Route path="/shop/:collection" element={<CollectionPage />} />
<Route path="/shop/product/:handle" element={<ProductPage />} />
```

### Component Structure

#### 1. Shop Page (`src/pages/Shop.tsx`)
- **Purpose**: Main shop landing page showing all collections
- **Features**:
  - Grid layout of collection cards
  - Search/filter by collection
  - Links to individual collection pages

#### 2. Collection Page (`src/pages/CollectionPage.tsx`)
- **Purpose**: Display products within a specific collection
- **Features**:
  - Collection header with description
  - Product grid with filtering/sorting
  - Pagination for large collections
  - Breadcrumb navigation

#### 3. Product Page (`src/pages/ProductPage.tsx`)
- **Purpose**: Individual product details
- **Features**:
  - Product images carousel
  - Variant selection (size, color, etc.)
  - Add to cart functionality
  - Related products

#### 4. Shop Components

**CollectionCard** (`src/components/shop/CollectionCard.tsx`):
```tsx
interface CollectionCardProps {
  id: string;
  handle: string;
  title: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
}
```

**ProductGrid** (`src/components/shop/ProductGrid.tsx`):
```tsx
interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}
```

**ProductCard** (enhance existing `src/components/ProductCard.tsx`):
- Add variant support
- Add collection context
- Improve responsive design

### Navigation Integration

Update `src/components/Navbar.tsx`:
```tsx
const baseNavStructure = [
  { key: "home", label: "Home", path: "/" },
  { key: "shop", label: "Shop", path: "/shop" }, // Add this
  { key: "schedule", label: "Schedule", path: "/schedule" },
  { key: "leaderboard", label: "Leaderboard", path: "/leaderboard" },
  { key: "profile", label: "Profile", path: "/profile" },
  { key: "support", label: "Support", path: "/support" },
];
```

Add to `menu_items` table:
```sql
INSERT INTO menu_items (item_key, is_enabled, sort_order) 
VALUES ('shop', true, 1);
```

## Service Layer

### Shopify Service (`src/services/shopify/shopifyStorefrontService.ts`)

**Key Functions**:
```typescript
// Collection operations
export async function getCollections(): Promise<Collection[]>
export async function getCollection(handle: string): Promise<CollectionDetail | null>

// Product operations  
export async function getProduct(handle: string): Promise<Product | null>
export async function getCollectionProducts(handle: string, cursor?: string): Promise<ProductsResponse>

// Search operations
export async function searchProducts(query: string): Promise<Product[]>

// Admin sync operations
export async function syncCollectionsFromShopify(): Promise<SyncResult>
```

### Types (`src/services/types/shopify-types.ts`)

```typescript
export interface Collection {
  id: string;
  handle: string;
  title: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor?: string;
  productType?: string;
  featuredImageUrl?: string;
  priceRange: {
    min: number;
    max: number;
    currencyCode: string;
  };
  available: boolean;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  available: boolean;
  selectedOptions: {
    name: string;
    value: string;
  }[];
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Shopify Storefront API access
- [ ] Create database schema and migrations
- [ ] Build basic edge function for collections
- [ ] Create basic Shop page with collection listing

### Phase 2: Collection Browse (Week 2)
- [ ] Implement CollectionPage with product grid
- [ ] Add search and filtering capabilities
- [ ] Implement pagination
- [ ] Style components to match LolCow theme

### Phase 3: Product Details (Week 3)
- [ ] Create ProductPage with full details
- [ ] Add variant selection functionality
- [ ] Implement "Add to Cart" (redirect to Shopify)
- [ ] Add breadcrumb navigation

### Phase 4: Enhanced Features (Week 4)
- [ ] Add search across all products
- [ ] Implement product recommendations
- [ ] Add loading states and error handling
- [ ] Performance optimization and caching

### Phase 5: Admin Integration (Week 5)
- [ ] Admin sync functionality for collections
- [ ] Analytics integration
- [ ] SEO optimization
- [ ] Testing and launch

## Performance Considerations

### Caching Strategy
- **Collections**: Cache in database, refresh every 6 hours
- **Products**: Cache product lists, refresh on-demand
- **Images**: Use Shopify CDN with optimized parameters
- **API Calls**: Implement request debouncing and batching

### Optimization
- Lazy load product images
- Implement virtual scrolling for large collections
- Use React Query for client-side caching
- Optimize GraphQL queries to fetch minimal data

## SEO & Marketing

### URL Structure
- `/shop` - Main shop page
- `/shop/collection-handle` - Collection pages
- `/shop/product/product-handle` - Product pages

### Meta Tags
- Dynamic page titles and descriptions
- Open Graph tags for social sharing
- Structured data for products and collections

### Analytics
- Track collection views
- Monitor popular products
- Measure conversion rates to Shopify

## Security Considerations

- **API Keys**: Store Shopify tokens in Supabase secrets only
- **Rate Limiting**: Implement client-side request throttling
- **CORS**: Proper CORS configuration for Shopify domains
- **Input Validation**: Sanitize all search queries and parameters

## Testing Strategy

### Unit Tests
- Service functions for API interactions
- Component rendering and user interactions
- Error handling scenarios

### Integration Tests
- End-to-end collection browsing
- Product detail page functionality
- Search and filtering features

### Performance Tests
- API response times
- Image loading optimization
- Large collection rendering

## Deployment Checklist

### Environment Setup
- [ ] Shopify app created and configured
- [ ] Storefront API tokens generated
- [ ] Environment variables set in Supabase
- [ ] Database migrations applied

### Code Deployment
- [ ] Edge functions deployed
- [ ] Frontend components integrated
- [ ] Navigation updated
- [ ] Error boundaries implemented

### Post-Launch
- [ ] Monitor API usage and limits
- [ ] Track user engagement metrics
- [ ] Collect feedback for improvements
- [ ] Plan additional features

## Additional Considerations

### Future Enhancements
- **Wishlist Functionality**: Allow users to save favorite products
- **Product Comparison**: Side-by-side product comparison tool
- **Inventory Notifications**: Email alerts when products are back in stock
- **Mobile App**: React Native implementation
- **Advanced Filtering**: Filter by price, size, color, etc.

### Maintenance
- **Regular Sync**: Automated daily sync of collections and products
- **Monitoring**: Alert on API failures or stale data
- **Updates**: Keep Shopify API version current
- **Backup**: Regular backup of cached product data

This plan provides a comprehensive roadmap for implementing a full-featured Shop section that integrates seamlessly with your existing LolCow Portal architecture while providing an excellent user experience for browsing and discovering products.