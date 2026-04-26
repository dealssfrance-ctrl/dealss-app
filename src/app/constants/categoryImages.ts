// Category images - one per category for consistent branding
export const CATEGORY_IMAGES: Record<string, string> = {
  'Fashion': 'https://images.unsplash.com/photo-1595705686969-51ce3ee3f0ca?w=500&h=500&fit=crop',
  'Beauty': 'https://images.unsplash.com/photo-1596462502278-af242a95ab2d?w=500&h=500&fit=crop',
  'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'Food': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=500&fit=crop',
  'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop',
  'Vols': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop',
  'Other': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=500&fit=crop',
  // Legacy variants
  'Mode': 'https://images.unsplash.com/photo-1595705686969-51ce3ee3f0ca?w=500&h=500&fit=crop',
  'Beaute': 'https://images.unsplash.com/photo-1596462502278-af242a95ab2d?w=500&h=500&fit=crop',
  'High-tech': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'Beauté': 'https://images.unsplash.com/photo-1596462502278-af242a95ab2d?w=500&h=500&fit=crop',
  'Alimentation': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=500&fit=crop',
  'Sport': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop',
  'Voyage': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop',
  'Maison': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=500&fit=crop',
};

export function getCategoryImage(category?: string): string {
  if (!category) return CATEGORY_IMAGES['Other'];
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Other'];
}
