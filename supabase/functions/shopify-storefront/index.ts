import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// --- Shopify Storefront API Configuration ---
// Expected Environment Variables:
// - SHOPIFY_SHOP_DOMAIN: Your Shopify store domain (e.g., your-shop-name.myshopify.com)
// - SHOPIFY_STOREFRONT_ACCESS_TOKEN: Your Shopify Storefront API Access Token
// - SHOPIFY_STOREFRONT_API_VERSION: (Optional) Shopify API version, e.g., "2024-04"

const DEFAULT_API_VERSION = "2024-04";

// --- GraphQL Queries ---
const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
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
            totalCount
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_COLLECTION_PRODUCTS_QUERY = `
  query GetCollectionProducts($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      title
      description
      image {
        url
      }
      products(first: $first, after: $after) {
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
            vendor
            productType
            tags
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const GET_PRODUCT_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      vendor
      productType
      tags
      featuredImage {
        url
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
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
      variants(first: 100) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      availableForSale
    }
  }
`;

const GET_FEATURED_PRODUCTS_QUERY = `
  query GetFeaturedProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
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
          vendor
          productType
          tags
        }
      }
    }
  }
`;

const GET_NEW_PRODUCTS_QUERY = `
  query GetNewProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
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
          vendor
          productType
          tags
          createdAt
        }
      }
    }
  }
`;

// --- Cart Mutations ---
const CREATE_CART_MUTATION = `
  mutation CreateCart {
    cartCreate {
      cart {
        id
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                    }
                  }
                }
              }
              attributes {
                key
                value
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ADD_TO_CART_MUTATION = `
  mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                    }
                  }
                }
              }
              attributes {
                key
                value
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_CART_LINE_MUTATION = `
  mutation UpdateCartLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                    }
                  }
                }
              }
              attributes {
                key
                value
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const REMOVE_FROM_CART_MUTATION = `
  mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                    }
                  }
                }
              }
              attributes {
                key
                value
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_CART_QUERY = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      id
      totalQuantity
      checkoutUrl
      cost {
        totalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price {
                  amount
                  currencyCode
                }
                product {
                  id
                  handle
                  title
                  featuredImage {
                    url
                  }
                }
              }
            }
            attributes {
              key
              value
            }
          }
        }
      }
    }
  }
`;

// --- Interfaces ---
interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

interface Collection {
  id: string;
  handle: string;
  title: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
}

interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor?: string;
  productType?: string;
  tags: string[];
  featuredImageUrl?: string;
  priceRange: {
    min: number;
    max: number;
    currencyCode: string;
  };
  available: boolean;
}

interface ProductDetail extends Product {
  descriptionHtml?: string;
  images: Array<{
    url: string;
    altText?: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    price: number;
    available: boolean;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

// --- Helper Functions ---
async function makeShopifyRequest<T>(
  query: string,
  variables: Record<string, any> = {}
): Promise<ShopifyGraphQLResponse<T>> {
  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  const accessToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const apiVersion = Deno.env.get("SHOPIFY_STOREFRONT_API_VERSION") || DEFAULT_API_VERSION;

  if (!shopDomain || !accessToken) {
    throw new Error("Missing Shopify configuration");
  }

  const url = `https://${shopDomain}/api/${apiVersion}/graphql.json`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Collections to exclude from the public shop
const EXCLUDED_COLLECTIONS = new Set([
  'frontpage',
  'shop-all', 
  'featured-products',
  'lolcow-gaming'
]);

function transformCollection(shopifyCollection: any): Collection {
  return {
    id: shopifyCollection.id.replace("gid://shopify/Collection/", ""),
    handle: shopifyCollection.handle,
    title: shopifyCollection.title,
    description: shopifyCollection.description || undefined,
    imageUrl: shopifyCollection.image?.url || undefined,
    productCount: shopifyCollection.products?.totalCount || 0,
  };
}

function transformProduct(shopifyProduct: any): Product {
  return {
    id: shopifyProduct.id.replace("gid://shopify/Product/", ""),
    handle: shopifyProduct.handle,
    title: shopifyProduct.title,
    description: shopifyProduct.description || "",
    vendor: shopifyProduct.vendor || undefined,
    productType: shopifyProduct.productType || undefined,
    tags: shopifyProduct.tags || [],
    featuredImageUrl: shopifyProduct.featuredImage?.url || undefined,
    priceRange: {
      min: parseFloat(shopifyProduct.priceRange.minVariantPrice.amount),
      max: parseFloat(shopifyProduct.priceRange.maxVariantPrice.amount),
      currencyCode: shopifyProduct.priceRange.minVariantPrice.currencyCode,
    },
    available: shopifyProduct.availableForSale,
  };
}

function transformProductDetail(shopifyProduct: any): ProductDetail {
  const baseProduct = transformProduct(shopifyProduct);
  
  return {
    ...baseProduct,
    descriptionHtml: shopifyProduct.descriptionHtml || undefined,
    images: shopifyProduct.images?.edges?.map((edge: any) => ({
      url: edge.node.url,
      altText: edge.node.altText || undefined,
    })) || [],
    variants: shopifyProduct.variants?.edges?.map((edge: any) => ({
      id: edge.node.id.replace("gid://shopify/ProductVariant/", ""),
      title: edge.node.title,
      price: parseFloat(edge.node.price.amount),
      available: edge.node.availableForSale,
      selectedOptions: edge.node.selectedOptions || [],
    })) || [],
  };
}

// Cart transformation functions
function transformCart(shopifyCart: any) {
  if (!shopifyCart) return null;
  
  return {
    id: shopifyCart.id,
    totalQuantity: shopifyCart.totalQuantity || 0,
    totalAmount: parseFloat(shopifyCart.cost?.totalAmount?.amount || "0"),
    currencyCode: shopifyCart.cost?.totalAmount?.currencyCode || "USD",
    checkoutUrl: shopifyCart.checkoutUrl || undefined,
    items: shopifyCart.lines?.edges?.map((edge: any) => ({
      id: edge.node.id,
      variantId: edge.node.merchandise.id.replace("gid://shopify/ProductVariant/", ""),
      productId: edge.node.merchandise.product.id.replace("gid://shopify/Product/", ""),
      title: edge.node.merchandise.product.title,
      variantTitle: edge.node.merchandise.title,
      price: parseFloat(edge.node.merchandise.price.amount),
      quantity: edge.node.quantity,
      imageUrl: edge.node.merchandise.product.featuredImage?.url,
      handle: edge.node.merchandise.product.handle,
      properties: edge.node.attributes?.map((attr: any) => ({
        key: attr.key,
        value: attr.value,
      })) || [],
    })) || [],
  };
}

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fullPath = url.pathname.split("/").filter(Boolean);
    
    // Remove the function name: ["shopify-storefront"]
    // to get just the API path: ["collections"] or ["collections", "handle"] etc.
    const path = fullPath.slice(1);
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Route handling
    switch (true) {
      // GET /collections
      case req.method === "GET" && path.length === 1 && path[0] === "collections": {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const cursor = url.searchParams.get("cursor");
        
        const response = await makeShopifyRequest(GET_COLLECTIONS_QUERY, {
          first: Math.min(limit, 50), // Shopify limit
          after: cursor,
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const collections = response.data?.collections?.edges
          ?.map((edge: any) => transformCollection(edge.node))
          ?.filter((collection: Collection) => !EXCLUDED_COLLECTIONS.has(collection.handle)) || [];

        return new Response(JSON.stringify({
          data: collections,
          pageInfo: {
            hasNextPage: response.data?.collections?.pageInfo?.hasNextPage || false,
            endCursor: response.data?.collections?.pageInfo?.endCursor,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // GET /collections/{handle}
      case req.method === "GET" && path.length === 2 && path[0] === "collections": {
        const handle = path[1];
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const cursor = url.searchParams.get("cursor");
        
        const response = await makeShopifyRequest(GET_COLLECTION_PRODUCTS_QUERY, {
          handle,
          first: Math.min(limit, 50),
          after: cursor,
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const collection = response.data?.collection;
        if (!collection) {
          return new Response(JSON.stringify({ error: "Collection not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        const products = collection.products?.edges?.map((edge: any) =>
          transformProduct(edge.node)
        ) || [];

        return new Response(JSON.stringify({
          collection: {
            id: collection.id.replace("gid://shopify/Collection/", ""),
            title: collection.title,
            description: collection.description,
            imageUrl: collection.image?.url,
          },
          products,
          pageInfo: {
            hasNextPage: collection.products?.pageInfo?.hasNextPage || false,
            endCursor: collection.products?.pageInfo?.endCursor,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // GET /products/{handle}
      case req.method === "GET" && path.length === 2 && path[0] === "products": {
        const handle = path[1];
        
        const response = await makeShopifyRequest(GET_PRODUCT_QUERY, {
          handle,
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const product = response.data?.product;
        if (!product) {
          return new Response(JSON.stringify({ error: "Product not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        const productDetail = transformProductDetail(product);

        return new Response(JSON.stringify({ product: productDetail }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // GET /featured-products
      case req.method === "GET" && path.length === 1 && path[0] === "featured-products": {
        const limit = parseInt(url.searchParams.get("limit") || "6");
        const includeUnavailable = url.searchParams.get("includeUnavailable") === "true";
        
        // Fetch more products to ensure we have enough after filtering
        const fetchLimit = includeUnavailable ? limit : Math.min(limit * 3, 50);
        
        const response = await makeShopifyRequest(GET_FEATURED_PRODUCTS_QUERY, {
          first: fetchLimit,
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        let products = response.data?.products?.edges
          ?.map((edge: any) => transformProduct(edge.node))
          ?.filter((product: Product) => 
            !product.title.toLowerCase().includes('product customization') &&
            !product.productType?.toLowerCase().includes('customization')
          ) || [];
        
        // Filter out unavailable products unless explicitly requested
        if (!includeUnavailable) {
          products = products.filter((product: Product) => product.available);
        }
        
        // Slice to requested limit
        const finalProducts = products.slice(0, limit);

        return new Response(JSON.stringify({
          data: finalProducts,
          pageInfo: {
            hasNextPage: products.length > limit,
            endCursor: response.data?.products?.pageInfo?.endCursor,
            totalAvailable: products.length,
            totalFetched: response.data?.products?.edges?.length || 0,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // GET /new-products
      case req.method === "GET" && path.length === 1 && path[0] === "new-products": {
        const limit = parseInt(url.searchParams.get("limit") || "6");
        const includeUnavailable = url.searchParams.get("includeUnavailable") === "true";
        
        // Fetch more products to ensure we have enough after filtering
        const fetchLimit = includeUnavailable ? limit : Math.min(limit * 3, 50);
        
        const response = await makeShopifyRequest(GET_NEW_PRODUCTS_QUERY, {
          first: fetchLimit,
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        let products = response.data?.products?.edges
          ?.map((edge: any) => ({
            ...transformProduct(edge.node),
            createdAt: edge.node.createdAt,
          }))
          ?.filter((product: Product) => 
            !product.title.toLowerCase().includes('product customization') &&
            !product.productType?.toLowerCase().includes('customization')
          ) || [];
        
        // Filter out unavailable products unless explicitly requested
        if (!includeUnavailable) {
          products = products.filter((product: Product) => product.available);
        }
        
        // Slice to requested limit
        const finalProducts = products.slice(0, limit);

        return new Response(JSON.stringify({
          data: finalProducts,
          pageInfo: {
            hasNextPage: products.length > limit,
            endCursor: response.data?.products?.pageInfo?.endCursor,
            totalAvailable: products.length,
            totalFetched: response.data?.products?.edges?.length || 0,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // GET /flash-sales
      case req.method === "GET" && path.length === 1 && path[0] === "flash-sales": {
        const { data: flashSales, error } = await supabase
          .from('flash_sales')
          .select('*')
          .eq('is_active', true)
          .lte('start_date', new Date().toISOString())
          .gte('end_date', new Date().toISOString())
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        return new Response(JSON.stringify({
          data: flashSales || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // POST /sync-collections (Admin only)
      case req.method === "POST" && path.length === 1 && path[0] === "sync-collections": {
        // For now, just return success - will implement full sync later
        return new Response(JSON.stringify({ 
          message: "Sync endpoint ready - full implementation coming in later phase",
          status: "pending"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // === CART ENDPOINTS ===
      
      // POST /cart/create
      case req.method === "POST" && path.length === 2 && path[0] === "cart" && path[1] === "create": {
        const response = await makeShopifyRequest(CREATE_CART_MUTATION);

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const cart = transformCart(response.data?.cartCreate?.cart);
        const userErrors = response.data?.cartCreate?.userErrors;

        if (userErrors?.length > 0) {
          return new Response(JSON.stringify({ 
            error: userErrors[0].message,
            userErrors 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({ cart }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // POST /cart/add
      case req.method === "POST" && path.length === 2 && path[0] === "cart" && path[1] === "add": {
        const body = await req.json();
        const { cartId, variantId, quantity = 1, properties = [] } = body;

        if (!cartId || !variantId) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Format properties for Shopify
        const attributes = properties.map((prop: any) => ({
          key: prop.key,
          value: prop.value,
        }));

        // Ensure variantId has the correct format - check if it already has the prefix
        const merchandiseId = variantId.startsWith('gid://shopify/ProductVariant/') 
          ? variantId 
          : `gid://shopify/ProductVariant/${variantId}`;

        const response = await makeShopifyRequest(ADD_TO_CART_MUTATION, {
          cartId,
          lines: [{
            merchandiseId,
            quantity,
            attributes,
          }],
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const cart = transformCart(response.data?.cartLinesAdd?.cart);
        const userErrors = response.data?.cartLinesAdd?.userErrors;

        if (userErrors?.length > 0) {
          return new Response(JSON.stringify({ 
            error: userErrors[0].message,
            userErrors 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({ cart }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // PUT /cart/update
      case req.method === "PUT" && path.length === 2 && path[0] === "cart" && path[1] === "update": {
        const body = await req.json();
        const { cartId, lineId, quantity } = body;

        if (!cartId || !lineId || quantity === undefined) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const response = await makeShopifyRequest(UPDATE_CART_LINE_MUTATION, {
          cartId,
          lines: [{ id: lineId, quantity }],
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const cart = transformCart(response.data?.cartLinesUpdate?.cart);
        const userErrors = response.data?.cartLinesUpdate?.userErrors;

        if (userErrors?.length > 0) {
          return new Response(JSON.stringify({ 
            error: userErrors[0].message,
            userErrors 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({ cart }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // DELETE /cart/remove
      case req.method === "DELETE" && path.length === 2 && path[0] === "cart" && path[1] === "remove": {
        const body = await req.json();
        const { cartId, lineId } = body;

        if (!cartId || !lineId) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const response = await makeShopifyRequest(REMOVE_FROM_CART_MUTATION, {
          cartId,
          lineIds: [lineId],
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const cart = transformCart(response.data?.cartLinesRemove?.cart);
        const userErrors = response.data?.cartLinesRemove?.userErrors;

        if (userErrors?.length > 0) {
          return new Response(JSON.stringify({ 
            error: userErrors[0].message,
            userErrors 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({ cart }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // GET /cart/{cartId}
      case req.method === "GET" && path.length === 2 && path[0] === "cart": {
        const cartId = decodeURIComponent(path[1]);
        
        const response = await makeShopifyRequest(GET_CART_QUERY, {
          cartId,
        });

        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(", ")}`);
        }

        const cart = transformCart(response.data?.cart);

        if (!cart) {
          return new Response(JSON.stringify({ error: "Cart not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        return new Response(JSON.stringify({ cart }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default: {
        return new Response(JSON.stringify({ error: "Endpoint not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }
    }

  } catch (error) {
    console.error("Shopify Storefront API error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        details: error instanceof Error ? error.stack : undefined 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});