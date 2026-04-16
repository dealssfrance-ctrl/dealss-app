export interface CategoryConfig {
  key: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'All', label: 'Tout', emoji: '🏷️' },
  { key: 'Fashion', label: 'Mode', emoji: '👗' },
  { key: 'Travel', label: 'Vol', emoji: '✈️' },
  { key: 'Sports', label: 'Sport', emoji: '⚽' },
  { key: 'Beauty', label: 'Beauté', emoji: '💄' },
  { key: 'Food', label: 'Food', emoji: '🍔' },
  { key: 'Electronics', label: 'Électronique', emoji: '📱' },
  { key: 'Other', label: 'Autre', emoji: '📦' },
];

export const CATEGORY_KEYS = CATEGORIES.map(c => c.key);

/** Get display label with emoji for a category key */
export function getCategoryLabel(key: string): string {
  const cat = CATEGORIES.find(c => c.key === key);
  if (!cat) return key;
  if (cat.key === 'All') return cat.label;
  return `${cat.emoji} ${cat.label}`;
}

/** Get just the label (no emoji) for a category key */
export function getCategoryName(key: string): string {
  const cat = CATEGORIES.find(c => c.key === key);
  return cat ? cat.label : key;
}

/** Categories for forms (excludes 'All') */
export const FORM_CATEGORIES = CATEGORIES.filter(c => c.key !== 'All');

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
