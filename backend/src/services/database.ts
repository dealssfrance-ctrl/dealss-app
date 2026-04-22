import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, ResetToken, Offer, TrafficData, OfferSearchParams, PaginatedResponse, Conversation, Message, Review } from '../types/index.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper: convert snake_case DB row to camelCase model
function toUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toOffer(row: any): Offer {
  return {
    id: row.id,
    storeName: row.store_name,
    discount: row.discount,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    userId: row.user_id,
    userName: row.user_name,
  };
}

function toTraffic(row: any): TrafficData {
  return {
    id: row.id,
    date: row.date,
    visits: row.visits,
    pageViews: row.page_views,
    uniqueUsers: row.unique_users,
    bounceRate: row.bounce_rate,
    avgSessionDuration: row.avg_session_duration,
  };
}

function toConversation(row: any): Conversation {
  return {
    id: row.id,
    offerId: row.offer_id,
    participants: row.participants,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text,
    imageUrl: row.image_url,
    createdAt: new Date(row.created_at),
  };
}

function toReview(row: any): Review {
  return {
    id: row.id,
    offerId: row.offer_id,
    userId: row.user_id,
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: new Date(row.created_at),
  };
}

class Database {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data ? toUser(data) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
    return data ? toUser(data) : undefined;
  }

  async createUser(user: User): Promise<User> {
    const { data, error } = await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    }).select().single();
    if (error) throw error;
    return toUser(data);
  }

  async userExists(email: string): Promise<boolean> {
    const { data } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
    return !!data;
  }

  async getAllUsers(): Promise<User[]> {
    const { data } = await supabase.from('users').select('*');
    return (data || []).map(toUser);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.email) dbUpdates.email = updates.email;

    const { data, error } = await supabase.from('users').update(dbUpdates).eq('id', userId).select().single();
    if (error || !data) return null;
    return toUser(data);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    return !error;
  }

  // Offer operations
  async getOfferById(id: string): Promise<Offer | undefined> {
    const { data } = await supabase.from('offers').select('*').eq('id', id).single();
    if (!data) return undefined;
    const offer = toOffer(data);
    const rating = await this.getOfferAverageRating(id);
    return { ...offer, averageRating: rating.average, reviewCount: rating.count };
  }

  private async enrichWithRatings(offers: Offer[]): Promise<Offer[]> {
    if (offers.length === 0) return offers;
    const offerIds = offers.map(o => o.id);
    const { data } = await supabase.from('reviews').select('offer_id, rating').in('offer_id', offerIds);
    const ratingMap = new Map<string, { sum: number; count: number }>();
    for (const r of (data || [])) {
      const e = ratingMap.get(r.offer_id) || { sum: 0, count: 0 };
      ratingMap.set(r.offer_id, { sum: e.sum + r.rating, count: e.count + 1 });
    }
    return offers.map(o => {
      const rd = ratingMap.get(o.id);
      return {
        ...o,
        averageRating: rd ? Math.round((rd.sum / rd.count) * 10) / 10 : 0,
        reviewCount: rd ? rd.count : 0,
      };
    });
  }

  async getAllOffers(): Promise<Offer[]> {
    const { data } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
    const offers = (data || []).map(toOffer);
    return this.enrichWithRatings(offers);
  }

  async getOffersByUserId(userId: string): Promise<Offer[]> {
    const { data } = await supabase.from('offers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    const offers = (data || []).map(toOffer);
    return this.enrichWithRatings(offers);
  }

  async searchOffers(params: OfferSearchParams): Promise<PaginatedResponse<Offer>> {
    const { query, category, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    let q = supabase.from('offers').select('*', { count: 'exact' }).eq('status', 'active');

    if (query) {
      q = q.or(`store_name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
    }
    if (category && category !== 'all') {
      q = q.ilike('category', category);
    }

    const sortColumn = sortBy === 'storeName' ? 'store_name' : sortBy === 'discount' ? 'discount' : 'created_at';
    q = q.order(sortColumn, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * limit;
    q = q.range(from, from + limit - 1);

    const { data, count } = await q;
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const offers = (data || []).map(toOffer);
    const enriched = await this.enrichWithRatings(offers);

    return {
      data: enriched,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async getCategories(): Promise<string[]> {
    const { data } = await supabase.from('offers').select('category');
    const categories = new Set<string>((data || []).map((r: any) => r.category));
    return Array.from(categories).sort();
  }

  async createOffer(offer: Offer): Promise<Offer> {
    const { data, error } = await supabase.from('offers').insert({
      id: offer.id,
      store_name: offer.storeName,
      discount: offer.discount,
      description: offer.description,
      category: offer.category,
      image_url: offer.imageUrl,
      status: offer.status,
      user_id: offer.userId,
      user_name: offer.userName,
      created_at: offer.createdAt instanceof Date ? offer.createdAt.toISOString() : offer.createdAt,
      updated_at: offer.updatedAt instanceof Date ? offer.updatedAt.toISOString() : offer.updatedAt,
    }).select().single();
    if (error) throw error;
    return toOffer(data);
  }

  async updateOffer(offerId: string, updates: Partial<Offer>): Promise<Offer | null> {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.storeName) dbUpdates.store_name = updates.storeName;
    if (updates.discount) dbUpdates.discount = updates.discount;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.status) dbUpdates.status = updates.status;

    const { data, error } = await supabase.from('offers').update(dbUpdates).eq('id', offerId).select().single();
    if (error || !data) return null;
    return toOffer(data);
  }

  async deleteOffer(offerId: string): Promise<boolean> {
    const { error } = await supabase.from('offers').delete().eq('id', offerId);
    return !error;
  }

  // Traffic operations
  async getTrafficDataByDate(date: string): Promise<TrafficData | undefined> {
    const { data } = await supabase.from('traffic_data').select('*').eq('date', date).single();
    return data ? toTraffic(data) : undefined;
  }

  async getAllTrafficData(): Promise<TrafficData[]> {
    const { data } = await supabase.from('traffic_data').select('*');
    return (data || []).map(toTraffic);
  }

  async createOrUpdateTrafficData(td: TrafficData): Promise<TrafficData> {
    const { data, error } = await supabase.from('traffic_data').upsert({
      id: td.id,
      date: td.date,
      visits: td.visits,
      page_views: td.pageViews,
      unique_users: td.uniqueUsers,
      bounce_rate: td.bounceRate,
      avg_session_duration: td.avgSessionDuration,
    }, { onConflict: 'date' }).select().single();
    if (error) throw error;
    return toTraffic(data);
  }

  // Dashboard stats
  async getDashboardStats() {
    const [usersRes, offersRes, trafficRes, convsRes, msgsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('offers').select('id', { count: 'exact', head: true }),
      supabase.from('traffic_data').select('visits'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = usersRes.count || 0;
    const totalOffers = offersRes.count || 0;
    const totalTraffic = (trafficRes.data || []).reduce((sum: number, d: any) => sum + d.visits, 0);
    const totalConversations = convsRes.count || 0;
    const totalMessages = msgsRes.count || 0;

    const { data: allTraffic } = await supabase.from('traffic_data').select('date,visits').order('date', { ascending: true });
    let growth = 0;
    if (allTraffic && allTraffic.length >= 14) {
      const recent7 = allTraffic.slice(-7).reduce((s: number, d: any) => s + d.visits, 0);
      const prev7 = allTraffic.slice(-14, -7).reduce((s: number, d: any) => s + d.visits, 0);
      growth = prev7 > 0 ? Math.round(((recent7 - prev7) / prev7) * 1000) / 10 : 0;
    } else if (allTraffic && allTraffic.length >= 2) {
      const half = Math.floor(allTraffic.length / 2);
      const recent = allTraffic.slice(half).reduce((s: number, d: any) => s + d.visits, 0);
      const prev = allTraffic.slice(0, half).reduce((s: number, d: any) => s + d.visits, 0);
      growth = prev > 0 ? Math.round(((recent - prev) / prev) * 1000) / 10 : 0;
    }

    return { totalUsers, totalOffers, totalTraffic, totalConversations, totalMessages, growth };
  }

  async getAllUsersSafe(): Promise<Omit<User, 'password'>[]> {
    const { data } = await supabase.from('users').select('id,email,name,created_at,updated_at');
    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  // Conversation operations
  async getConversationById(id: string): Promise<Conversation | undefined> {
    const { data } = await supabase.from('conversations').select('*').eq('id', id).single();
    return data ? toConversation(data) : undefined;
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    const { data } = await supabase.from('conversations').select('*').contains('participants', [userId]).order('updated_at', { ascending: false });
    return (data || []).map(toConversation);
  }

  async getConversationByOfferAndParticipants(offerId: string, userId1: string, userId2: string): Promise<Conversation | undefined> {
    const { data } = await supabase.from('conversations').select('*').eq('offer_id', offerId).contains('participants', [userId1, userId2]);
    if (data && data.length > 0) return toConversation(data[0]);
    return undefined;
  }

  async createConversation(conversation: Conversation): Promise<Conversation> {
    const { data, error } = await supabase.from('conversations').insert({
      id: conversation.id,
      offer_id: conversation.offerId,
      participants: conversation.participants,
      created_at: conversation.createdAt instanceof Date ? conversation.createdAt.toISOString() : conversation.createdAt,
      updated_at: conversation.updatedAt instanceof Date ? conversation.updatedAt.toISOString() : conversation.updatedAt,
    }).select().single();
    if (error) throw error;
    return toConversation(data);
  }

  async updateConversationTimestamp(conversationId: string): Promise<void> {
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  }

  // Message operations
  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    return (data || []).map(toMessage);
  }

  async getMessagesByConversationIdAfter(conversationId: string, afterDate: Date): Promise<Message[]> {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', conversationId)
      .gt('created_at', afterDate.toISOString())
      .order('created_at', { ascending: true });
    return (data || []).map(toMessage);
  }

  async getLastMessage(conversationId: string): Promise<Message | undefined> {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data ? toMessage(data) : undefined;
  }

  async createMessage(message: Message): Promise<Message> {
    const { data, error } = await supabase.from('messages').insert({
      id: message.id,
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      text: message.text || null,
      image_url: message.imageUrl || null,
      created_at: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    }).select().single();
    if (error) throw error;
    await this.updateConversationTimestamp(message.conversationId);
    return toMessage(data);
  }

  // Review operations
  async getReviewsByOfferId(offerId: string): Promise<Review[]> {
    const { data } = await supabase.from('reviews').select('*').eq('offer_id', offerId).order('created_at', { ascending: false });
    return (data || []).map(toReview);
  }

  async getReviewsByUserId(userId: string): Promise<Review[]> {
    const { data } = await supabase.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(toReview);
  }

  async createReview(review: Review): Promise<Review> {
    const { data, error } = await supabase.from('reviews').insert({
      id: review.id,
      offer_id: review.offerId,
      user_id: review.userId,
      user_name: review.userName,
      rating: review.rating,
      comment: review.comment || null,
      created_at: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
    }).select().single();
    if (error) throw error;
    return toReview(data);
  }

  async getOfferAverageRating(offerId: string): Promise<{ average: number; count: number }> {
    const { data } = await supabase.from('reviews').select('rating').eq('offer_id', offerId);
    const reviews = data || [];
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
    return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
  }

  async deleteReview(reviewId: string): Promise<boolean> {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    return !error;
  }

  // Storage operations
  async ensureStorageBucket(): Promise<void> {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some(b => b.name === 'offers');
    if (exists) {
      console.log('📁 Supabase storage bucket "offers" ready');
    } else {
      // Auto-create the bucket using service role key
      const { error } = await supabaseAdmin.storage.createBucket('offers', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
      if (error) {
        console.warn(`⚠️  Failed to create storage bucket "offers": ${error.message}`);
      } else {
        console.log('📁 Supabase storage bucket "offers" created successfully');
      }
    }
  }

  async uploadOfferImage(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from('offers')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('offers')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteOfferImage(filePath: string): Promise<void> {
    // Extract path from full URL: get everything after /offers/
    const match = filePath.match(/\/offers\/(.+)$/);
    if (!match) return;
    await supabaseAdmin.storage.from('offers').remove([match[1]]);
  }
}

export const db = new Database();
