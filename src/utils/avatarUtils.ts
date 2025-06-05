import { useState, useEffect } from 'react';

// Utility functions for generating avatar placeholders

// Predefined color palette for consistent, accessible colors
const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#82E0AA', // Light Green
  '#F8C471', // Orange
];

/**
 * Generate a consistent color based on a string input
 * Same input will always produce the same color
 */
export function getAvatarColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get the first letter of a name for avatar initials
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  return name.trim().substring(0, 1).toUpperCase();
}

/**
 * Generate avatar placeholder styles
 */
export function getAvatarPlaceholderStyle(name: string) {
  const backgroundColor = getAvatarColor(name || 'default');
  const initials = getInitials(name || 'User');
  
  return {
    backgroundColor,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    initials
  };
}

/**
 * Pre-validate image URL to avoid console 404 errors
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Hook to handle avatar image loading with fallback
 * Pre-validates URLs to prevent console 404 errors
 */
export function useAvatarFallback(imageUrl: string | null | undefined, fallbackName: string) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const validateAndSetImage = async () => {
      if (!imageUrl) {
        setImageSrc(null);
        setImageError(false);
        return;
      }

      // Skip validation for via.placeholder.com as it's unreliable
      if (imageUrl.includes('via.placeholder.com')) {
        setImageSrc(null);
        setImageError(true);
        return;
      }

      setIsValidating(true);
      const isValid = await validateImageUrl(imageUrl);
      
      if (isValid) {
        setImageSrc(imageUrl);
        setImageError(false);
      } else {
        setImageSrc(null);
        setImageError(true);
      }
      setIsValidating(false);
    };

    validateAndSetImage();
  }, [imageUrl]);

  const handleError = () => {
    setImageError(true);
    setImageSrc(null);
  };

  return {
    imageSrc: imageError ? null : imageSrc,
    handleError,
    showFallback: imageError || !imageSrc || isValidating,
    fallbackProps: getAvatarPlaceholderStyle(fallbackName)
  };
}

/**
 * Construct Discord avatar URL with proper format
 * Returns null for invalid inputs to trigger fallback
 */
export function getDiscordAvatarUrl(discordId: string, avatarHash: string | null | undefined): string | null {
  if (!discordId || !avatarHash) {
    return null;
  }
  
  // If it's already a full URL (like default avatars), validate it
  if (avatarHash.startsWith('http')) {
    return avatarHash;
  }
  
  // Validate avatar hash format (should be alphanumeric, possibly with underscore for animated)
  if (!/^[a-zA-Z0-9_]+$/.test(avatarHash)) {
    return null;
  }
  
  // Discord avatar URL format
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}`;
}

/**
 * Get YouTube channel avatar URL
 */
export function getYouTubeAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) {
    return null;
  }
  
  // Ensure HTTPS for YouTube avatars
  if (avatarUrl.startsWith('http://')) {
    return avatarUrl.replace('http://', 'https://');
  }
  
  return avatarUrl;
}