// Category images - one per category for consistent branding
export const CATEGORY_IMAGES: Record<string, string> = {
  'Fashion': 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80',
  'Points': 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1000&q=80',
  'Beauty': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
  'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'Food': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=500&fit=crop',
  'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop',
  'Vols': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop',
  'Other': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=500&fit=crop',
  // Legacy variants
  'Mode': 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80',
  'Beaute': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
  'High-tech': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'Beauté': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
  'Alimentation': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=500&fit=crop',
  'Sport': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop',
  'Voyage': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop',
  'Maison': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=500&fit=crop',
};

export function getCategoryImage(category?: string): string {
  if (!category) return CATEGORY_IMAGES['Other'];

  const normalized = category
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const normalizedMap: Record<string, string> = {
    fashion: CATEGORY_IMAGES['Fashion'],
    mode: CATEGORY_IMAGES['Fashion'],
    points: CATEGORY_IMAGES['Points'],
    fidelite: CATEGORY_IMAGES['Points'],
    loyalty: CATEGORY_IMAGES['Points'],
    beauty: CATEGORY_IMAGES['Beauty'],
    beaute: CATEGORY_IMAGES['Beauty'],
    electronics: CATEGORY_IMAGES['Electronics'],
    'high-tech': CATEGORY_IMAGES['Electronics'],
    food: CATEGORY_IMAGES['Food'],
    alimentation: CATEGORY_IMAGES['Food'],
    sports: CATEGORY_IMAGES['Sports'],
    sport: CATEGORY_IMAGES['Sports'],
    vols: CATEGORY_IMAGES['Vols'],
    voyage: CATEGORY_IMAGES['Vols'],
    other: CATEGORY_IMAGES['Other'],
    maison: CATEGORY_IMAGES['Other'],
  };

  return CATEGORY_IMAGES[category] || normalizedMap[normalized] || CATEGORY_IMAGES['Other'];
}
