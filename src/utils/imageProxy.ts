/**
 * Proxies YouTube images through our edge function to avoid rate limits
 * @param imageUrl - The original image URL
 * @returns The proxied URL or original URL if not a YouTube image
 */
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  
  // Check if it's a YouTube image
  const isYouTubeImage = imageUrl.includes('yt3.ggpht.com') || 
                         imageUrl.includes('ytimg.com') ||
                         imageUrl.includes('img.youtube.com');
  
  // In development mode, just return the original URL
  const isDev = import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true';
  if (isDev) {
    return imageUrl;
  }
  
  // If it's a YouTube image and we have the Supabase URL, proxy it
  if (isYouTubeImage && import.meta.env.VITE_PUBLIC_SUPABASE_URL) {
    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // Otherwise return the original URL
  return imageUrl;
}

/**
 * Get the image URL with fallback handling
 * @param imageUrl - The original image URL
 * @param fallbackUrl - Optional fallback URL if proxy fails
 * @returns Object with src and onError handler
 */
export function getImageWithFallback(imageUrl: string | null | undefined, fallbackUrl?: string) {
  if (!imageUrl) {
    return {
      src: fallbackUrl || '',
      onError: () => {}
    };
  }
  
  // In dev mode or if we're running locally, use original URL directly
  const isDev = import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true';
  if (isDev) {
    return {
      src: imageUrl,
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (fallbackUrl && img.src !== fallbackUrl) {
          img.src = fallbackUrl;
        }
      }
    };
  }
  
  // For production, try proxy first then original
  const proxiedUrl = getProxiedImageUrl(imageUrl);
  const isProxied = proxiedUrl !== imageUrl;
  
  let attemptCount = 0;
  
  return {
    src: proxiedUrl,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      attemptCount++;
      
      // Try original URL if we started with proxy
      if (attemptCount === 1 && isProxied && img.src !== imageUrl) {
        img.src = imageUrl;
      } 
      // Try fallback URL if provided
      else if (attemptCount === 2 && fallbackUrl && img.src !== fallbackUrl) {
        img.src = fallbackUrl;
      }
    }
  };
}