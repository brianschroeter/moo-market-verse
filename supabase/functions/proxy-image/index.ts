import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function "proxy-image" booting up...`);

// Cache headers to reduce repeated requests
const CACHE_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing image URL parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that it's a YouTube image URL
    const validDomains = ['yt3.ggpht.com', 'i.ytimg.com', 'img.youtube.com'];
    const imageUrlObj = new URL(imageUrl);
    
    if (!validDomains.some(domain => imageUrlObj.hostname.includes(domain))) {
      return new Response(JSON.stringify({ error: 'Invalid image domain' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the image with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const imageResponse = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LolCow/1.0)',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        // Return a placeholder image or error response
        return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
          status: imageResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Return the image with cache headers
      return new Response(imageBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': `public, max-age=${CACHE_DURATION}`,
          'X-Proxied-From': imageUrl,
        },
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Error fetching image:', fetchError);
      
      return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});