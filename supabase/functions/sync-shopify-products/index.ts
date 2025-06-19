import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";
import { ensureAdmin } from "../_shared/auth.ts";

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  tags: string[];
  status: string;
  variants: {
    id: string;
    title: string;
    price: string;
    sku: string | null;
    inventory_quantity: number;
  }[];
  images: {
    id: string;
    src: string;
    alt: string | null;
  }[];
  collections?: string[];
}

interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  image: {
    src: string;
  } | null;
  sort_order: string;
  products?: string[];
}

async function fetchAllProducts(shopDomain: string, accessToken: string, apiVersion: string): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let nextPageInfo: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/products.json`);
    url.searchParams.append('limit', '250');
    if (nextPageInfo) {
      url.searchParams.append('page_info', nextPageInfo);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    products.push(...data.products);

    // Check for pagination
    const linkHeader = response.headers.get('Link');
    hasNextPage = false;
    
    if (linkHeader) {
      const links = linkHeader.split(',').map(link => link.trim());
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          const nextUrl = new URL(match[1]);
          nextPageInfo = nextUrl.searchParams.get('page_info');
          hasNextPage = true;
          break;
        }
      }
    }
  }

  return products;
}

async function fetchAllCollections(shopDomain: string, accessToken: string, apiVersion: string): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let nextPageInfo: string | null = null;
  let hasNextPage = true;

  // First, fetch smart collections
  while (hasNextPage) {
    const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/smart_collections.json`);
    url.searchParams.append('limit', '250');
    if (nextPageInfo) {
      url.searchParams.append('page_info', nextPageInfo);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    collections.push(...data.smart_collections.map((c: any) => ({
      id: c.id.toString(),
      handle: c.handle,
      title: c.title,
      description: c.body_html,
      image: c.image,
      sort_order: c.sort_order || 'best-selling',
    })));

    // Check for pagination
    const linkHeader = response.headers.get('Link');
    hasNextPage = false;
    
    if (linkHeader) {
      const links = linkHeader.split(',').map(link => link.trim());
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          const nextUrl = new URL(match[1]);
          nextPageInfo = nextUrl.searchParams.get('page_info');
          hasNextPage = true;
          break;
        }
      }
    }
  }

  // Then, fetch custom collections
  nextPageInfo = null;
  hasNextPage = true;

  while (hasNextPage) {
    const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/custom_collections.json`);
    url.searchParams.append('limit', '250');
    if (nextPageInfo) {
      url.searchParams.append('page_info', nextPageInfo);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    collections.push(...data.custom_collections.map((c: any) => ({
      id: c.id.toString(),
      handle: c.handle,
      title: c.title,
      description: c.body_html,
      image: c.image,
      sort_order: c.sort_order || 'manual',
    })));

    // Check for pagination
    const linkHeader = response.headers.get('Link');
    hasNextPage = false;
    
    if (linkHeader) {
      const links = linkHeader.split(',').map(link => link.trim());
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          const nextUrl = new URL(match[1]);
          nextPageInfo = nextUrl.searchParams.get('page_info');
          hasNextPage = true;
          break;
        }
      }
    }
  }

  return collections;
}

async function fetchCollectionProducts(
  shopDomain: string, 
  accessToken: string, 
  apiVersion: string, 
  collectionId: string
): Promise<string[]> {
  const productIds: string[] = [];
  let nextPageInfo: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/collections/${collectionId}/products.json`);
    url.searchParams.append('limit', '250');
    url.searchParams.append('fields', 'id');
    if (nextPageInfo) {
      url.searchParams.append('page_info', nextPageInfo);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Error fetching products for collection ${collectionId}: ${response.status}`);
      break;
    }

    const data = await response.json();
    productIds.push(...data.products.map((p: any) => p.id.toString()));

    // Check for pagination
    const linkHeader = response.headers.get('Link');
    hasNextPage = false;
    
    if (linkHeader) {
      const links = linkHeader.split(',').map(link => link.trim());
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          const nextUrl = new URL(match[1]);
          nextPageInfo = nextUrl.searchParams.get('page_info');
          hasNextPage = true;
          break;
        }
      }
    }
  }

  return productIds;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check admin access
    const adminClient = await ensureAdmin(req);

    // Get Shopify configuration
    const shopDomain = Deno.env.get('SHOPIFY_SHOP_DOMAIN');
    const accessToken = Deno.env.get('SHOPIFY_ADMIN_API_ACCESS_TOKEN');
    const apiVersion = Deno.env.get('SHOPIFY_API_VERSION') || '2024-01';

    if (!shopDomain || !accessToken) {
      throw new Error('Missing Shopify configuration');
    }

    console.log('Starting Shopify product sync...');

    // Fetch all products
    const products = await fetchAllProducts(shopDomain, accessToken, apiVersion);
    console.log(`Fetched ${products.length} products from Shopify`);

    // Fetch all collections
    const collections = await fetchAllCollections(shopDomain, accessToken, apiVersion);
    console.log(`Fetched ${collections.length} collections from Shopify`);

    // Fetch products for each collection
    const collectionProductMap: Record<string, string[]> = {};
    for (const collection of collections) {
      const productIds = await fetchCollectionProducts(shopDomain, accessToken, apiVersion, collection.id);
      collectionProductMap[collection.id] = productIds;
      console.log(`Collection ${collection.handle} has ${productIds.length} products`);
    }

    // Begin database transaction
    const { error: deleteProductsError } = await adminClient
      .from('shopify_products')
      .delete()
      .neq('id', '0'); // Delete all products

    if (deleteProductsError) {
      console.error('Error deleting existing products:', deleteProductsError);
    }

    const { error: deleteCollectionsError } = await adminClient
      .from('shopify_collections')
      .delete()
      .neq('id', '0'); // Delete all collections

    if (deleteCollectionsError) {
      console.error('Error deleting existing collections:', deleteCollectionsError);
    }

    // Insert products
    for (const product of products) {
      const primaryImage = product.images?.[0]?.src || null;
      const price = product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0;

      const { error: insertError } = await adminClient
        .from('shopify_products')
        .insert({
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.description,
          vendor: product.vendor || '',
          product_type: product.product_type || '',
          price: price,
          image_url: primaryImage,
          tags: product.tags || [],
          status: product.status || 'active',
          published_at: product.published_at,
          created_at: product.created_at,
          updated_at: product.updated_at,
        });

      if (insertError) {
        console.error(`Error inserting product ${product.handle}:`, insertError);
      }
    }

    // Insert collections
    for (const collection of collections) {
      const { error: insertError } = await adminClient
        .from('shopify_collections')
        .insert({
          id: collection.id,
          handle: collection.handle,
          title: collection.title,
          description: collection.description,
          image_url: collection.image?.src || null,
          sort_order: collection.sort_order,
        });

      if (insertError) {
        console.error(`Error inserting collection ${collection.handle}:`, insertError);
      }
    }

    // Insert collection-product relationships
    const collectionProducts: Array<{ collection_id: string; product_id: string; position: number }> = [];
    
    for (const [collectionId, productIds] of Object.entries(collectionProductMap)) {
      productIds.forEach((productId, index) => {
        collectionProducts.push({
          collection_id: collectionId,
          product_id: productId,
          position: index,
        });
      });
    }

    if (collectionProducts.length > 0) {
      // Insert in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < collectionProducts.length; i += batchSize) {
        const batch = collectionProducts.slice(i, i + batchSize);
        const { error: insertError } = await adminClient
          .from('collection_products')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting collection products batch:`, insertError);
        }
      }
    }

    const syncSummary = {
      products_synced: products.length,
      collections_synced: collections.length,
      collection_products_synced: collectionProducts.length,
      timestamp: new Date().toISOString(),
    };

    console.log('Sync completed:', syncSummary);

    return new Response(
      JSON.stringify({
        success: true,
        ...syncSummary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});