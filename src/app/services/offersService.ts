const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

import { supabase } from './supabaseClient';

async function getSupabaseToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export interface Offer {
  id: string;
  storeName: string;
  discount: string;
  description: string;
  category: string;
  imageUrl: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName?: string;
  averageRating?: number;
  reviewCount?: number;
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
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getSupabaseToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  /**
   * Compress an image file on the client before upload.
   * Resizes to max 1200px on longest side and outputs JPEG at 0.7 quality.
   */
  private compressImage(file: File, maxSize = 1200, quality = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      // If already small enough, skip compression
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
    // Compress before uploading
    const compressed = await this.compressImage(file);

    const token = await getSupabaseToken();
    const formData = new FormData();
    formData.append('image', compressed);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/offers/upload`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(result.url);
          } else {
            reject(new Error(result.message || 'Failed to upload image'));
          }
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('Upload cancelled'));

      xhr.send(formData);
    });
  }

  async getOffers(page = 1, limit = 10): Promise<OffersResponse> {
    const response = await fetch(
      `${API_URL}/offers?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: await this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch offers');
    }

    return response.json();
  }

  async searchOffers(params: SearchParams): Promise<OffersResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.append('q', params.query);
    if (params.category && params.category !== 'All') {
      searchParams.append('category', params.category);
    }
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await fetch(
      `${API_URL}/offers/search?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: await this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search offers');
    }

    return response.json();
  }

  async getOfferById(id: string): Promise<OfferResponse> {
    const response = await fetch(`${API_URL}/offers/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch offer');
    }

    return response.json();
  }

  async getCategories(): Promise<{ success: boolean; data: string[] }> {
    const response = await fetch(`${API_URL}/offers/categories`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  }

  async createOffer(data: CreateOfferData, userId: string): Promise<OfferResponse> {
    const response = await fetch(`${API_URL}/offers`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ ...data, userId })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create offer');
    }

    return result;
  }

  async updateOffer(id: string, data: Partial<CreateOfferData>): Promise<OfferResponse> {
    const response = await fetch(`${API_URL}/offers/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update offer');
    }

    return result;
  }

  async deleteOffer(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/offers/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete offer');
    }

    return result;
  }

  async getMyOffers(userId: string): Promise<{ success: boolean; data: Offer[] }> {
    const response = await fetch(`${API_URL}/offers/user/${userId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user offers');
    }

    return response.json();
  }
}

export const offersService = new OffersService();
