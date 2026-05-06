export interface CategoryConfig {
  key: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'All', label: 'Tout', emoji: '🔥' },
  { key: 'Fashion', label: 'Mode', emoji: '👗' },
  { key: 'Mode', label: 'Mode', emoji: '👗' },
  { key: 'Points', label: 'Points', emoji: '🌟' },
  { key: 'Food', label: 'Food', emoji: '🍔' },
  { key: 'Alimentation', label: 'Alimentation', emoji: '🛍️' },
  { key: 'Travel', label: 'Vols', emoji: '✈️' },
  { key: 'Sports', label: 'Sport', emoji: '⚽' },
  { key: 'Sport', label: 'Sport', emoji: '⚽' },
  { key: 'Beauty', label: 'Beauté', emoji: '💄' },
  { key: 'Beaute', label: 'Beauté', emoji: '💄' },
  { key: 'Beauté', label: 'Beauté', emoji: '💄' },
  { key: 'Electronics', label: 'Électronique', emoji: '📱' },
  { key: 'High-Tech', label: 'High-Tech', emoji: '💻' },
  { key: 'Maison', label: 'Maison', emoji: '🏠' },
  { key: 'Other', label: 'Autre', emoji: '📦' },
];

export const CATEGORY_KEYS = CATEGORIES.map(c => c.key);

/** Normalize a key for tolerant matching (case + Unicode + accents). */
function normKey(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function findCategory(key: string): CategoryConfig | undefined {
  const exact = CATEGORIES.find(c => c.key === key);
  if (exact) return exact;
  const n = normKey(key);
  return CATEGORIES.find(c => normKey(c.key) === n || normKey(c.label) === n);
}

/** Get display label with emoji for a category key */
export function getCategoryLabel(key: string): string {
  const cat = findCategory(key);
  if (!cat) return key;
  return `${cat.emoji} ${cat.label}`;
}

/** Get just the label (no emoji) for a category key */
export function getCategoryName(key: string): string {
  const cat = findCategory(key);
  return cat ? cat.label : key;
}

/** Map any category key (FR/EN/variants) to a canonical id used in i18n keys. */
export function getCategoryCanonicalId(key: string): string {
  const n = normKey(key);
  const map: Record<string, string> = {
    'all': 'all', 'tout': 'all', 'tous': 'all', 'alles': 'all',
    'fashion': 'fashion', 'mode': 'fashion',
    'points': 'points', 'punten': 'points',
    'food': 'food', 'alimentation': 'food', 'voeding': 'food',
    'travel': 'travel', 'vols': 'travel', 'voyage': 'travel', 'vluchten': 'travel',
    'sports': 'sports', 'sport': 'sports',
    'beauty': 'beauty', 'beaute': 'beauty', 'schoonheid': 'beauty',
    'electronics': 'electronics', 'electronique': 'electronics', 'elektronica': 'electronics',
    'high-tech': 'hightech', 'hightech': 'hightech',
    'maison': 'home', 'home': 'home', 'wonen': 'home',
    'other': 'other', 'autre': 'other', 'overig': 'other',
  };
  return map[n] || '';
}

/** Translate a category key using the i18n `t` function; falls back to original label. */
export function getLocalizedCategoryName(
  key: string,
  t: (k: string, fallback?: any) => any
): string {
  const id = getCategoryCanonicalId(key);
  if (id) return String(t(`categories.${id}`, getCategoryName(key)));
  return getCategoryName(key);
}/** Categories for forms (excludes 'All', deduplicated by label — prefers French keys) */
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
