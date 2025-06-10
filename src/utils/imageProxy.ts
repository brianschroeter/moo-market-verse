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
  
  // If it's a YouTube image and we have the Supabase URL, proxy it
  if (isYouTubeImage && import.meta.env.VITE_SUPABASE_URL) {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // Otherwise return the original URL
  return imageUrl;
}