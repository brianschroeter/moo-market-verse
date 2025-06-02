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
  return name.substring(0, 1).toUpperCase();
}

/**
 * Generate avatar placeholder styles
 */
export function getAvatarPlaceholderStyle(name: string) {
  const backgroundColor = getAvatarColor(name);
  const initials = getInitials(name);
  
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