import { supabase } from './supabaseClient';

const CATEGORY_CANONICAL_LABELS: Record<string, string> = {
  mode: 'Mode',
  fashion: 'Fashion',
  beauty: 'Beauté',
  vols: 'Voyage',
  sports: 'Sport',
  // retained for backward-compatibility with any existing data
  food: 'Food',
  electronics: 'Electronics',
  other: 'Other',
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  mode: ['mode'],
  fashion: ['fashion'],
  beauty: ['beauty', 'beaute', 'beauté'],
  vols: ['vols', 'voyage', 'travel'],
  sports: ['sports', 'sport'],
  food: ['food', 'alimentation'],
  electronics: ['electronics', 'electronic', 'tech'],
  other: ['other', 'autre'],
};

// Primary categories first in the order the user defined them.
const CATEGORY_ORDER = ['mode', 'fashion', 'sports', 'food', 'electronics', 'beauty', 'vols', 'other'];

function normalizeCategoryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]|_/g, '')
    .replace(/[\u0300-\u036f]/g, '');
}

function toCanonicalCategory(value: string): string {
  const normalized = normalizeCategoryKey(value);
  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return normalized;
}

/**
 * Returns all raw alias strings for a category.
 * Uppercase variants are intentionally omitted: ilike is already case-insensitive,
 * so adding 'Fashion' when 'fashion' is present would be redundant noise.
 */
function getCategoryFilterVariants(category: string): string[] {
  const canonical = toCanonicalCategory(category);
  return CATEGORY_ALIASES[canonical] ?? [canonical];
}

export interface Offer {
  id: string;
  storeName: string;
  discount: string;
  description: string;
  category: string;
  imageUrl: string;
  imageUrls: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName?: string;
  averageRating?: number;
  reviewCount?: number;
  /** Aggregated rating across ALL offers from this seller (not just this one). */
  sellerAverageRating?: number;
  sellerReviewCount?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface OffersResponse {
  success: boolean;
  data: Offer[];
  pagination: PaginationInfo;
}

export interface OfferResponse {
  success: boolean;
  data: Offer;
  message?: string;
}

export interface CreateOfferData {
  storeName: string;
  discount: string;
  description: string;
  category: string;
  imageUrl?: string;
}

export interface SearchParams {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'discount' | 'storeName';
  sortOrder?: 'asc' | 'desc';
}

// ── helpers ─────────────────────────────────────────────────────────────────

function sanitizeImageUrl(value: unknown): string {
  let raw = String(value ?? '').trim();
  if (!raw) return '';

  // If it's a JSON array, return it as-is (for multi-image support)
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Validate each URL in the array
        const validUrls = parsed
          .filter((item) => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .filter((item) => /^https?:\/\//i.test(item));
        
        if (validUrls.length > 0) {
          return JSON.stringify(validUrls);
        }
        // If array was provided but no valid URLs, fall through to single-image parsing
        const first = parsed.find((item) => typeof item === 'string' && item.trim().length > 0);
        raw = String(first ?? '').trim();
      }
    } catch {
      // Keep fallback parsing below when malformed JSON is encountered.
    }
  }

  raw = raw.replace(/^['"]+|['"]+$/g, '').trim();

  if (raw.startsWith('%22http')) {
    try {
      raw = decodeURIComponent(raw).replace(/^['"]+|['"]+$/g, '').trim();
    } catch {
      return '';
    }
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

/**
 * Parse a stored image_url field into an array of URLs.
 * Accepts: JSON array string, comma-separated string, or single URL.
 */
function parseImageList(value: unknown): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  // JSON array
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => sanitizeImageUrl(item))
          .filter((u) => u.length > 0 && !u.startsWith('['));
      }
    } catch {
      // fall through
    }
  }

  // Comma-separated
  if (raw.includes(',') && !raw.startsWith('http')) {
    return raw
      .split(',')
      .map((p) => sanitizeImageUrl(p))
      .filter((u) => u.length > 0 && !u.startsWith('['));
  }

  const single = sanitizeImageUrl(raw);
  return single ? [single] : [];
}

function toOffer(r: any): Offer {
  const list = parseImageList(r.image_url);
  return {
    id: r.id,
    storeName: r.store_name,
    discount: r.discount,
    description: r.description,
    category: r.category,
    imageUrl: list[0] || '',
    imageUrls: list,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    userId: r.user_id,
    userName: r.user_name,
  };
}

async function enrichWithRatings(offers: Offer[]): Promise<Offer[]> {
  if (!offers.length) return offers;
  const ids = offers.map((o) => o.id);
  const sellerIds = Array.from(new Set(offers.map((o) => o.userId).filter(Boolean)));

  // 1) Per-offer reviews (existing behaviour).
  const { data: offerReviews } = await supabase
    .from('reviews')
    .select('offer_id, rating')
    .in('offer_id', ids);
  const byOffer = new Map<string, { sum: number; count: number }>();
  for (const r of offerReviews || []) {
    const e = byOffer.get(r.offer_id) || { sum: 0, count: 0 };
    byOffer.set(r.offer_id, { sum: e.sum + r.rating, count: e.count + 1 });
  }

  // 2) Per-seller aggregate: every review on every offer they posted.
  const bySeller = new Map<string, { sum: number; count: number }>();
  if (sellerIds.length) {
    const { data: sellerOffers } = await supabase
      .from('offers')
      .select('id, user_id')
      .in('user_id', sellerIds);
    const offerToSeller = new Map<string, string>();
    for (const so of sellerOffers || []) offerToSeller.set(so.id, so.user_id);
    const allOfferIds = (sellerOffers || []).map((o) => o.id);
    if (allOfferIds.length) {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('offer_id, rating')
        .in('offer_id', allOfferIds);
      for (const r of allReviews || []) {
        const sid = offerToSeller.get(r.offer_id);
        if (!sid) continue;
        const e = bySeller.get(sid) || { sum: 0, count: 0 };
        bySeller.set(sid, { sum: e.sum + r.rating, count: e.count + 1 });
      }
    }
  }

  return offers.map((o) => {
    const rd = byOffer.get(o.id);
    const sd = bySeller.get(o.userId);
    return {
      ...o,
      averageRating: rd ? Math.round((rd.sum / rd.count) * 10) / 10 : 0,
      reviewCount: rd ? rd.count : 0,
      sellerAverageRating: sd ? Math.round((sd.sum / sd.count) * 10) / 10 : 0,
      sellerReviewCount: sd ? sd.count : 0,
    };
  });
}

// ── service ──────────────────────────────────────────────────────────────────

class OffersService {
  private compressImage(file: File, maxSize = 1200, quality = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      if (file.size <= 200 * 1024) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }

  async uploadImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
    const compressed = await this.compressImage(file);
    onProgress?.(10);
    const ext = compressed.name.includes('.') ? compressed.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}.${ext}`;
    const buffer = await compressed.arrayBuffer();
    onProgress?.(50);
    const { data, error } = await supabase.storage.from('offers').upload(fileName, buffer, {
      contentType: compressed.type,
      upsert: false,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    onProgress?.(100);
    const { data: pub } = supabase.storage.from('offers').getPublicUrl(data.path);
    return pub.publicUrl;
  }

  // Upload multiple images and return array of URLs
  async uploadMultipleImages(
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<string[]> {
    if (files.length === 0) return [];

    const urls: string[] = [];
    const totalSteps = files.length * 2; // Compress + upload per file

    for (let i = 0; i < files.length; i++) {
      const progress = Math.round(((i * 2) / totalSteps) * 100);
      onProgress?.(progress);

      const compressed = await this.compressImage(files[i]);
      const ext = compressed.name.includes('.') ? compressed.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}_${i}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}.${ext}`;
      const buffer = await compressed.arrayBuffer();

      const uploadProgress = Math.round((((i * 2) + 1) / totalSteps) * 100);
      onProgress?.(uploadProgress);

      const { data, error } = await supabase.storage.from('offers').upload(fileName, buffer, {
        contentType: compressed.type,
        upsert: false,
      });

      if (error) throw new Error(`Upload failed for ${files[i].name}: ${error.message}`);

      const { data: pub } = supabase.storage.from('offers').getPublicUrl(data.path);
      urls.push(pub.publicUrl);

      onProgress?.(Math.round((((i + 1) * 2) / totalSteps) * 100));
    }

    return urls;
  }

  async getOffers(page = 1, limit = 10): Promise<OffersResponse> {
    const { data, count, error } = await supabase
      .from('offers')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const enriched = await enrichWithRatings((data || []).map(toOffer));
    return {
      success: true,
      data: enriched,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async searchOffers(params: SearchParams): Promise<OffersResponse> {
    const { query, category, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    let q = supabase.from('offers').select('*', { count: 'exact' }).eq('status', 'active');
    if (query) q = q.or(`store_name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
    if (category && category.toLowerCase() !== 'all') {
      const variants = getCategoryFilterVariants(category);
      const clauses = variants.map((v) => `category.ilike.${v}`).join(',');
      q = q.or(clauses);
    }

    const col = sortBy === 'storeName' ? 'store_name' : sortBy === 'discount' ? 'discount' : 'created_at';
    // Secondary sort by id ensures deterministic ordering when primary values collide,
    // preventing items from swapping positions between page loads.
    q = q.order(col, { ascending: sortOrder === 'asc' }).order('id', { ascending: false });
    q = q.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const enriched = await enrichWithRatings((data || []).map(toOffer));
    return {
      success: true,
      data: enriched,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async getOfferById(id: string): Promise<OfferResponse> {
    const { data, error } = await supabase.from('offers').select('*').eq('id', id).single();
    if (error || !data) throw new Error('Offer not found');
    const offer = toOffer(data);
    const { data: revData } = await supabase.from('reviews').select('rating').eq('offer_id', id);
    const revs = revData || [];
    const avg = revs.length ? Math.round((revs.reduce((s: number, r: any) => s + r.rating, 0) / revs.length) * 10) / 10 : 0;
    return { success: true, data: { ...offer, averageRating: avg, reviewCount: revs.length } };
  }

  async getCategories(): Promise<{ success: boolean; data: string[] }> {
    const { data, error } = await supabase
      .from('offers')
      .select('category, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const rawCanonical: string[] = [];

    for (const row of data || []) {
      const raw = String((row as any).category || '').trim();
      if (!raw) continue;
      const canonical = toCanonicalCategory(raw);
      if (canonical === 'all' || seen.has(canonical)) continue;
      seen.add(canonical);
      rawCanonical.push(canonical);
    }

    const sorted = rawCanonical.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b, 'fr', { sensitivity: 'base' });
    });

    const labels = sorted.map((c) => CATEGORY_CANONICAL_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1));
    return { success: true, data: ['All', ...labels] };
  }

  async createOffer(offerData: CreateOfferData, userId: string): Promise<OfferResponse> {
    const { data: user } = await supabase.from('users').select('id, name').eq('id', userId).single();
    if (!user) throw new Error('Invalid user ID');

    const row = {
      id: `offer_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      store_name: offerData.storeName,
      discount: offerData.discount,
      description: offerData.description,
      category: offerData.category,
      image_url: sanitizeImageUrl(offerData.imageUrl),
      status: 'active',
      user_id: userId,
      user_name: user.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('offers').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to create offer');
    return { success: true, data: toOffer(data), message: 'Offer created successfully' };
  }

  async updateOffer(id: string, updates: Partial<CreateOfferData>): Promise<OfferResponse> {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.storeName) dbUpdates.store_name = updates.storeName;
    if (updates.discount) dbUpdates.discount = updates.discount;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = sanitizeImageUrl(updates.imageUrl);

    const { data, error } = await supabase.from('offers').update(dbUpdates).eq('id', id).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to update offer');
    return { success: true, data: toOffer(data), message: 'Offer updated successfully' };
  }

  async deleteOffer(id: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, message: 'Offer deleted successfully' };
  }

  async getMyOffers(userId: string): Promise<{ success: boolean; data: Offer[] }> {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const enriched = await enrichWithRatings((data || []).map(toOffer));
    return { success: true, data: enriched };
  }
}

export const offersService = new OffersService();
