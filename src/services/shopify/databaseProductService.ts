import { supabase } from "@/integrations/supabase/client";
import { Product, Collection, ProductDetail, ProductImage, ProductVariant } from "@/services/types/shopify-types";

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
    featuredImageUrl: dbProduct.image_url || undefined,
    priceRange: {
      min: dbProduct.price,
      max: dbProduct.price,
      currencyCode: 'USD'
    },
    available: dbProduct.status === 'active'
  };
}

// Convert database product to ProductDetail type with full information
function convertToProductDetail(dbProduct: DatabaseProduct): ProductDetail {
  const images: ProductImage[] = dbProduct.image_url ? [{
    url: dbProduct.image_url,
    altText: dbProduct.title
  }] : [];
  
  const variants: ProductVariant[] = [{
    id: `variant-${dbProduct.id}`,
    title: 'Default Title',
    price: dbProduct.price,
    available: dbProduct.status === 'active',
    selectedOptions: [{
      name: 'Title',
      value: 'Default Title'
    }]
  }];
  
  return {
    id: dbProduct.id,
    handle: dbProduct.handle,
    title: dbProduct.title,
    description: dbProduct.description || '',
    descriptionHtml: dbProduct.description || '',
    vendor: dbProduct.vendor,
    productType: dbProduct.product_type,
    tags: dbProduct.tags,
    featuredImageUrl: dbProduct.image_url || undefined,
    priceRange: {
      min: dbProduct.price,
      max: dbProduct.price,
      currencyCode: 'USD'
    },
    available: dbProduct.status === 'active',
    images,
    variants
  };
}

// Convert database collection to frontend Collection type
function convertToCollection(dbCollection: DatabaseCollection & { product_count?: number }): Collection {
  return {
    id: dbCollection.id,
    handle: dbCollection.handle,
    title: dbCollection.title,
    description: dbCollection.description || undefined,
    imageUrl: dbCollection.image_url || undefined,
    productCount: dbCollection.product_count || 0
  };
}

export async function getCollectionsFromDB() {
  try {
    const { data, error } = await supabase
      .from('shopify_collections')
      .select(`
        *,
        collection_products (count)
      `)
      .order('title');

    if (error) throw error;

    // Transform the data to include product count
    const collectionsWithCount = (data || []).map(collection => ({
      ...collection,
      product_count: collection.collection_products?.[0]?.count || 0
    }));

    return {
      data: collectionsWithCount.map(convertToCollection),
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

export async function getProductDetailFromDB(handle: string) {
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
      .eq('handle', handle)
      .single();

    if (error) throw error;

    if (!data) {
      return {
        product: null,
        error: null
      };
    }

    return {
      product: convertToProductDetail(data),
      error: null
    };
  } catch (error) {
    console.error('Error fetching product detail from database:', error);
    return {
      product: null,
      error: error instanceof Error ? error.message : 'Failed to fetch product detail'
    };
  }
}