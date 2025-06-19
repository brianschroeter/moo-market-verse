import { supabase } from "@/integrations/supabase/client";
import { Product, Collection } from "@/services/types/shopify-types";

export interface DatabaseProduct {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  vendor: string;
  product_type: string;
  price: number;
  image_url: string | null;
  tags: string[];
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCollection {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: string;
}

export interface CollectionProduct {
  collection_id: string;
  product_id: string;
  position: number;
}

// Convert database product to frontend Product type
function convertToProduct(dbProduct: DatabaseProduct): Product {
  return {
    id: dbProduct.id,
    handle: dbProduct.handle,
    title: dbProduct.title,
    description: dbProduct.description || '',
    vendor: dbProduct.vendor,
    productType: dbProduct.product_type,
    tags: dbProduct.tags,
    images: dbProduct.image_url ? [{
      id: '1',
      src: dbProduct.image_url,
      altText: dbProduct.title
    }] : [],
    variants: [{
      id: '1',
      title: 'Default Title',
      price: {
        amount: dbProduct.price.toString(),
        currencyCode: 'USD'
      },
      availableForSale: dbProduct.status === 'active',
      selectedOptions: []
    }],
    priceRange: {
      minVariantPrice: {
        amount: dbProduct.price.toString(),
        currencyCode: 'USD'
      },
      maxVariantPrice: {
        amount: dbProduct.price.toString(),
        currencyCode: 'USD'
      }
    },
    availableForSale: dbProduct.status === 'active',
    options: [],
    metafields: [],
    compareAtPriceRange: {
      minVariantPrice: {
        amount: dbProduct.price.toString(),
        currencyCode: 'USD'
      },
      maxVariantPrice: {
        amount: dbProduct.price.toString(),
        currencyCode: 'USD'
      }
    }
  };
}

// Convert database collection to frontend Collection type
function convertToCollection(dbCollection: DatabaseCollection): Collection {
  return {
    id: dbCollection.id,
    handle: dbCollection.handle,
    title: dbCollection.title,
    description: dbCollection.description || '',
    image: dbCollection.image_url ? {
      id: '1',
      src: dbCollection.image_url,
      altText: dbCollection.title
    } : null,
    products: {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false
      }
    }
  };
}

export async function getCollectionsFromDB() {
  try {
    const { data, error } = await supabase
      .from('shopify_collections')
      .select('*')
      .order('title');

    if (error) throw error;

    return {
      data: (data || []).map(convertToCollection),
      error: null
    };
  } catch (error) {
    console.error('Error fetching collections from database:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch collections'
    };
  }
}

export async function getCollectionProductsFromDB(handle: string) {
  try {
    // First get the collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('shopify_collections')
      .select('*')
      .eq('handle', handle)
      .single();

    if (collectionError || !collectionData) {
      throw new Error('Collection not found');
    }

    // Then get products for this collection
    const { data: productRelations, error: relationsError } = await supabase
      .from('collection_products')
      .select(`
        product_id,
        position,
        shopify_products (*)
      `)
      .eq('collection_id', collectionData.id)
      .order('position');

    if (relationsError) throw relationsError;

    const products = productRelations
      ?.map(rel => rel.shopify_products)
      .filter(Boolean)
      .map(convertToProduct) || [];

    return {
      collection: convertToCollection(collectionData),
      products,
      error: null
    };
  } catch (error) {
    console.error('Error fetching collection products from database:', error);
    return {
      collection: null,
      products: [],
      error: error instanceof Error ? error.message : 'Failed to fetch collection products'
    };
  }
}

export async function getAllProductsFromDB() {
  try {
    const { data, error } = await supabase
      .from('shopify_products')
      .select(`
        *,
        collection_products (
          collection_id,
          shopify_collections (
            id,
            handle,
            title
          )
        )
      `)
      .eq('status', 'active')
      .order('title');

    if (error) throw error;

    return {
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Error fetching all products from database:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch products'
    };
  }
}

export async function getNewProductsFromDB(limit: number = 4) {
  try {
    const { data, error } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      data: (data || []).map(convertToProduct),
      error: null
    };
  } catch (error) {
    console.error('Error fetching new products from database:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch new products'
    };
  }
}

export async function getFeaturedProductsFromDB(limit: number = 6) {
  try {
    // First try to get products with "bestseller" tag
    const { data, error } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('status', 'active')
      .contains('tags', ['bestseller'])
      .limit(limit);

    if (error) throw error;

    // If we don't have enough bestsellers, get more products ordered by published date
    let products = data || [];
    if (products.length < limit) {
      // Build exclusion list safely
      const excludeIds = products.length > 0 ? products.map(p => p.id) : [];
      
      let query = supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(limit - products.length);
      
      // Only add the exclusion if we have IDs to exclude
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { data: additionalProducts, error: additionalError } = await query;

      if (!additionalError && additionalProducts) {
        products = [...products, ...additionalProducts];
      }
    }

    return {
      data: products.map(convertToProduct),
      error: null
    };
  } catch (error) {
    console.error('Error fetching featured products from database:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch featured products'
    };
  }
}