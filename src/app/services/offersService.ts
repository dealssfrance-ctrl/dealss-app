import { supabase } from './supabaseClient';

/** Parse image_url field: could be a JSON array string or a single URL */
function parseImages(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch { /* not JSON, treat as single URL */ }
  return [raw];
}

function toOffer(row: any): Offer {
  const images = parseImages(row.image_url);
  return {
    id: row.id,
    storeName: row.store_name,
    discount: row.discount,
    description: row.description,
    category: row.category,
    imageUrl: images[0] || '',
    images,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    userName: row.user_name,
  };
}

export interface Offer {
  id: string;
  storeName: string;
  discount: string;
  description: string;
  category: string;
  imageUrl: string;
  images: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName?: string;
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

class OffersService {
  /** Supported types the browser can natively decode via <img> / Canvas */
  private static NATIVE_IMAGE_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
  ]);

  /**
   * Convert any image file to a browser-friendly JPEG via Canvas.
   * Handles HEIC, HEIF, AVIF, TIFF, and other exotic formats by
   * reading the file as an object URL and drawing it on a canvas.
   * If the browser cannot decode the format natively, we use a
   * FileReader → createImageBitmap fallback.
   */
  private async convertToJpeg(file: File): Promise<File> {
    // Already a format we can use — skip conversion
    if (OffersService.NATIVE_IMAGE_TYPES.has(file.type)) {
      return file;
    }

    // Try createImageBitmap first — works for some formats (AVIF, WebP)
    // on newer browsers, and avoids the Image() load path entirely.
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85));
        if (blob) {
          return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
        }
      }
    } catch { /* createImageBitmap failed, try Image() fallback */ }

    // Fallback: try loading via Image element
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Last resort: return original file and let the server reject it
        // (better than crashing the upload entirely)
        resolve(file);
      };

      img.src = url;
    });
  }

  private compressImage(file: File, maxSize = 1200, quality = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      if (file.size <= 200 * 1024) {
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const compressed = new File(
              [blob],
              file.name.replace(/\.\w+$/, '.jpg'),
              { type: 'image/jpeg' }
            );
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for compression'));
      };

      img.src = url;
    });
  }

  async uploadImage(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    // Convert unsupported formats (HEIC, AVIF, TIFF…) to JPEG first
    const converted = await this.convertToJpeg(file);
    const compressed = await this.compressImage(converted);
    const ext = compressed.name.replace(/^.*\./, '') || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;

    if (onProgress) onProgress(10);

    const { error } = await supabase.storage
      .from('offers')
      .upload(fileName, compressed, { contentType: compressed.type, upsert: false });

    if (error) throw new Error(error.message || 'Failed to upload image');

    if (onProgress) onProgress(90);

    const { data: urlData } = supabase.storage.from('offers').getPublicUrl(fileName);

    if (onProgress) onProgress(100);
    return urlData.publicUrl;
  }

  async uploadImages(
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await this.uploadImage(files[i]);
      urls.push(url);
      if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 90));
    }
    if (onProgress) onProgress(100);
    return urls;
  }

  async getOffers(page = 1, limit = 10): Promise<OffersResponse> {
    const from = (page - 1) * limit;
    const { data, count, error } = await supabase
      .from('offers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error('Failed to fetch offers');

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data: (data || []).map(toOffer),
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async searchOffers(params: SearchParams): Promise<OffersResponse> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    let q = supabase.from('offers').select('*', { count: 'exact' }).eq('status', 'active');

    if (params.query) {
      q = q.or(`store_name.ilike.%${params.query}%,description.ilike.%${params.query}%,category.ilike.%${params.query}%`);
    }
    if (params.category && params.category !== 'All') {
      q = q.ilike('category', params.category);
    }

    const sortColumn = sortBy === 'storeName' ? 'store_name' : sortBy === 'discount' ? 'discount' : 'created_at';
    q = q.order(sortColumn, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * limit;
    q = q.range(from, from + limit - 1);

    const { data, count, error } = await q;
    if (error) throw new Error('Failed to search offers');

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data: (data || []).map(toOffer),
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async getOfferById(id: string): Promise<OfferResponse> {
    const { data, error } = await supabase.from('offers').select('*').eq('id', id).single();
    if (error || !data) throw new Error('Failed to fetch offer');
    return { success: true, data: toOffer(data) };
  }

  async getCategories(): Promise<{ success: boolean; data: string[] }> {
    const { data, error } = await supabase.from('offers').select('category');
    if (error) throw new Error('Failed to fetch categories');
    const categories = Array.from(new Set((data || []).map((r: any) => r.category))).sort() as string[];
    return { success: true, data: categories };
  }

  async createOffer(data: CreateOfferData, userId: string): Promise<OfferResponse> {
    const id = `offer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();

    const { data: row, error } = await supabase.from('offers').insert({
      id,
      store_name: data.storeName,
      discount: data.discount,
      description: data.description,
      category: data.category,
      image_url: data.imageUrl || '',
      status: 'active',
      user_id: userId,
      user_name: '',
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) throw new Error(error.message || 'Failed to create offer');
    return { success: true, data: toOffer(row) };
  }

  async updateOffer(id: string, data: Partial<CreateOfferData>): Promise<OfferResponse> {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (data.storeName) dbUpdates.store_name = data.storeName;
    if (data.discount) dbUpdates.discount = data.discount;
    if (data.description) dbUpdates.description = data.description;
    if (data.category) dbUpdates.category = data.category;
    if (data.imageUrl !== undefined) dbUpdates.image_url = data.imageUrl;

    const { data: row, error } = await supabase.from('offers').update(dbUpdates).eq('id', id).select().single();
    if (error || !row) throw new Error('Failed to update offer');
    return { success: true, data: toOffer(row) };
  }

  async deleteOffer(id: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) throw new Error('Failed to delete offer');
    return { success: true, message: 'Offer deleted successfully' };
  }

  async getMyOffers(userId: string): Promise<{ success: boolean; data: Offer[] }> {
    const { data, error } = await supabase.from('offers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch user offers');
    return { success: true, data: (data || []).map(toOffer) };
  }
}

export const offersService = new OffersService();
