export interface CategoryConfig {
  key: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'All', label: 'Tout', emoji: '🔥' },
  { key: 'Fashion', label: 'Mode', emoji: '👗' },
  { key: 'Mode', label: 'Mode', emoji: '👗' },
  { key: 'Travel', label: 'Vols', emoji: '✈️' },
  { key: 'Sports', label: 'Sport', emoji: '⚽' },
  { key: 'Sport', label: 'Sport', emoji: '⚽' },
  { key: 'Beauty', label: 'Beauté', emoji: '💄' },
  { key: 'Beaute', label: 'Beauté', emoji: '💄' },
  { key: 'Beauté', label: 'Beauté', emoji: '💄' },
  { key: 'Food', label: 'Food', emoji: '🍔' },
  { key: 'Alimentation', label: 'Alimentation', emoji: '🛒' },
  { key: 'Electronics', label: 'Électronique', emoji: '📱' },
  { key: 'High-Tech', label: 'High-Tech', emoji: '💻' },
  { key: 'Maison', label: 'Maison', emoji: '🏠' },
  { key: 'Other', label: 'Autre', emoji: '📦' },
];

export const CATEGORY_KEYS = CATEGORIES.map(c => c.key);

/** Get display label with emoji for a category key */
export function getCategoryLabel(key: string): string {
  const cat = CATEGORIES.find(c => c.key === key);
  if (!cat) return key;
  return `${cat.emoji} ${cat.label}`;
}

/** Get just the label (no emoji) for a category key */
export function getCategoryName(key: string): string {
  const cat = CATEGORIES.find(c => c.key === key);
  return cat ? cat.label : key;
}

/** Categories for forms (excludes 'All', deduplicated by label — prefers French keys) */
export const FORM_CATEGORIES = (() => {
  const seen = new Set<string>();
  return CATEGORIES.filter(c => {
    if (c.key === 'All') return false;
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });
})();

/** Order categories: put known ones first in defined order, then any extras from DB */
export function orderCategories(dbCategories: string[]): string[] {
  const ordered: string[] = [];
  for (const cat of CATEGORIES) {
    if (cat.key === 'All' || dbCategories.includes(cat.key)) {
      ordered.push(cat.key);
    }
  }
  // Add any DB categories not in our config
  for (const cat of dbCategories) {
    if (!ordered.includes(cat)) {
      ordered.push(cat);
    }
  }
  return ordered;
}
