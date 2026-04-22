// Hyvis API – Supabase Edge Function
// Handles all backend routes: /offers, /reviews, /auth, /users, /chat

import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(message: string, status = 500): Response {
  return json({ success: false, message }, status);
}

function randomHex(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── DB mappers ───────────────────────────────────────────────────────────────
function toOffer(r: any) {
  return {
    id: r.id,
    storeName: r.store_name,
    discount: r.discount,
    description: r.description,
    category: r.category,
    imageUrl: r.image_url,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    userId: r.user_id,
    userName: r.user_name,
  };
}

function toUser(r: any) {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toConversation(r: any) {
  return {
    id: r.id,
    offerId: r.offer_id,
    participants: r.participants,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toMessage(r: any) {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    text: r.text,
    imageUrl: r.image_url,
    createdAt: r.created_at,
  };
}

function toReview(r: any) {
  return {
    id: r.id,
    offerId: r.offer_id,
    userId: r.user_id,
    userName: r.user_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

// ─── Rating enrichment ────────────────────────────────────────────────────────
async function enrichWithRatings(supabase: any, offers: any[]) {
  if (!offers.length) return offers;
  const ids = offers.map((o: any) => o.id);
  const { data } = await supabase.from('reviews').select('offer_id, rating').in('offer_id', ids);
  const map = new Map<string, { sum: number; count: number }>();
  for (const r of (data || [])) {
    const e = map.get(r.offer_id) || { sum: 0, count: 0 };
    map.set(r.offer_id, { sum: e.sum + r.rating, count: e.count + 1 });
  }
  return offers.map((o: any) => {
    const rd = map.get(o.id);
    return {
      ...o,
      averageRating: rd ? Math.round((rd.sum / rd.count) * 10) / 10 : 0,
      reviewCount: rd ? rd.count : 0,
    };
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, anonKey);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const url = new URL(req.url);
  const method = req.method;

  // Strip path prefix: /functions/v1/api/... → /...
  const path = url.pathname.replace(/.*\/api/, '') || '/';
  const segs = path.split('/').filter(Boolean);
  const resource = segs[0]; // offers | reviews | auth | users | chat
  const id = segs[1]; // optional :id
  const sub = segs[2]; // sub-resource (e.g. messages, rating)

  let body: any = {};
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { body = await req.json(); } catch { body = {}; }
    }
    // multipart handled inline in upload route
  }

  try {
    // ═══ OFFERS ════════════════════════════════════════════════════════════════
    if (resource === 'offers') {

      // POST /offers/upload — image upload
      if (method === 'POST' && id === 'upload') {
        const ct = req.headers.get('content-type') || '';
        if (!ct.includes('multipart/form-data')) return err('Multipart required', 400);
        const fd = await req.formData();
        const file = fd.get('image') as File | null;
        if (!file) return err('No image file provided', 400);

        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.type)) return err('Only JPEG, PNG, WebP and GIF allowed', 400);
        if (file.size > 5 * 1024 * 1024) return err('File too large (max 5 MB)', 400);

        const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '.jpg';
        const fileName = `${Date.now()}_${randomHex(8)}${ext}`;
        const buffer = await file.arrayBuffer();

        const { data: uploadData, error: uploadErr } = await admin.storage
          .from('offers')
          .upload(fileName, buffer, { contentType: file.type, upsert: false });
        if (uploadErr) return err(`Upload failed: ${uploadErr.message}`);

        const { data: pubUrl } = admin.storage.from('offers').getPublicUrl(uploadData.path);
        return json({ success: true, url: pubUrl.publicUrl });
      }

      // GET /offers/categories
      if (method === 'GET' && id === 'categories') {
        const { data } = await supabase.from('offers').select('category');
        const cats = Array.from(new Set((data || []).map((r: any) => r.category))).sort();
        return json({ success: true, data: ['All', ...cats] });
      }

      // GET /offers/search
      if (method === 'GET' && id === 'search') {
        const q = url.searchParams.get('q');
        const category = url.searchParams.get('category');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const sortBy = url.searchParams.get('sortBy') || 'createdAt';
        const sortOrder = url.searchParams.get('sortOrder') || 'desc';

        let qb = supabase.from('offers').select('*', { count: 'exact' }).eq('status', 'active');
        if (q) qb = qb.or(`store_name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
        if (category && category.toLowerCase() !== 'all') qb = qb.ilike('category', category);

        const col = sortBy === 'storeName' ? 'store_name' : sortBy === 'discount' ? 'discount' : 'created_at';
        qb = qb.order(col, { ascending: sortOrder === 'asc' });

        const from = (page - 1) * limit;
        qb = qb.range(from, from + limit - 1);

        const { data, count } = await qb;
        const total = count || 0;
        const totalPages = Math.ceil(total / limit);
        const offers = await enrichWithRatings(supabase, (data || []).map(toOffer));

        return json({
          success: true,
          data: offers,
          pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
        });
      }

      // GET /offers/user/:userId
      if (method === 'GET' && id === 'user' && sub) {
        const { data } = await supabase.from('offers').select('*').eq('user_id', sub).order('created_at', { ascending: false });
        const offers = await enrichWithRatings(supabase, (data || []).map(toOffer));
        return json({ success: true, data: offers });
      }

      // GET /offers/:id
      if (method === 'GET' && id && id !== 'search' && id !== 'categories' && id !== 'user' && id !== 'upload') {
        const { data } = await supabase.from('offers').select('*').eq('id', id).single();
        if (!data) return err('Offer not found', 404);
        const offer = toOffer(data);
        const { data: revData } = await supabase.from('reviews').select('rating').eq('offer_id', id);
        const revs = revData || [];
        const avg = revs.length ? Math.round((revs.reduce((s: number, r: any) => s + r.rating, 0) / revs.length) * 10) / 10 : 0;
        return json({ success: true, data: { ...offer, averageRating: avg, reviewCount: revs.length } });
      }

      // GET /offers (list)
      if (method === 'GET' && !id) {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const { data } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
        const all = (data || []).map(toOffer);
        const total = all.length;
        const totalPages = Math.ceil(total / limit);
        const slice = await enrichWithRatings(supabase, all.slice((page - 1) * limit, page * limit));
        return json({
          success: true,
          data: slice,
          pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
        });
      }

      // POST /offers (create)
      if (method === 'POST' && !id) {
        const { storeName, discount, description, category, imageUrl, userId } = body;
        if (!storeName || !discount || !description || !category || !userId) {
          return err('storeName, discount, description, category, userId required', 400);
        }
        const { data: user } = await supabase.from('users').select('id,name').eq('id', userId).single();
        if (!user) return err('Invalid user ID', 400);

        const offer = {
          id: `offer_${randomHex(8)}`,
          store_name: storeName,
          discount,
          description,
          category,
          image_url: imageUrl || '',
          status: 'active',
          user_id: userId,
          user_name: user.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data: created, error: createErr } = await supabase.from('offers').insert(offer).select().single();
        if (createErr) return err(createErr.message);
        return json({ success: true, message: 'Offer created successfully', data: toOffer(created) }, 201);
      }

      // PUT /offers/:id (update)
      if (method === 'PUT' && id) {
        const { storeName, discount, description, category, imageUrl, status } = body;
        const { data: existing } = await supabase.from('offers').select('id').eq('id', id).single();
        if (!existing) return err('Offer not found', 404);

        const updates: any = { updated_at: new Date().toISOString() };
        if (storeName) updates.store_name = storeName;
        if (discount) updates.discount = discount;
        if (description) updates.description = description;
        if (category) updates.category = category;
        if (imageUrl) updates.image_url = imageUrl;
        if (status) updates.status = status;

        const { data: updated, error: upErr } = await supabase.from('offers').update(updates).eq('id', id).select().single();
        if (upErr || !updated) return err('Failed to update offer');
        return json({ success: true, message: 'Offer updated successfully', data: toOffer(updated) });
      }

      // DELETE /offers/:id
      if (method === 'DELETE' && id) {
        const { error: delErr } = await supabase.from('offers').delete().eq('id', id);
        if (delErr) return err('Offer not found', 404);
        return json({ success: true, message: 'Offer deleted successfully' });
      }
    }

    // ═══ REVIEWS ════════════════════════════════════════════════════════════════
    if (resource === 'reviews') {

      // GET /reviews/offer/:offerId/rating
      if (method === 'GET' && id === 'offer' && sub && segs[3] === 'rating') {
        const { data } = await supabase.from('reviews').select('rating').eq('offer_id', sub);
        const revs = data || [];
        const avg = revs.length ? Math.round((revs.reduce((s: number, r: any) => s + r.rating, 0) / revs.length) * 10) / 10 : 0;
        return json({ success: true, data: { average: avg, count: revs.length } });
      }

      // GET /reviews/offer/:offerId
      if (method === 'GET' && id === 'offer' && sub) {
        const { data } = await supabase.from('reviews').select('*').eq('offer_id', sub).order('created_at', { ascending: false });
        const reviews = (data || []).map(toReview);
        const avg = reviews.length ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
        return json({ success: true, data: reviews, rating: { average: avg, count: reviews.length } });
      }

      // POST /reviews (create)
      if (method === 'POST' && !id) {
        const { offerId, userId, userName, rating, comment } = body;
        if (!offerId || !userId || !userName || !rating) return err('offerId, userId, userName, rating required', 400);
        if (rating < 1 || rating > 5) return err('Rating must be between 1 and 5', 400);

        const review = {
          id: `rev-${randomHex(8)}`,
          offer_id: offerId,
          user_id: userId,
          user_name: userName,
          rating: Number(rating),
          comment: comment || null,
          created_at: new Date().toISOString(),
        };
        const { data: created, error: cErr } = await supabase.from('reviews').insert(review).select().single();
        if (cErr) return err(cErr.message);
        return json({ success: true, data: toReview(created) }, 201);
      }

      // DELETE /reviews/:id
      if (method === 'DELETE' && id) {
        const { error: dErr } = await supabase.from('reviews').delete().eq('id', id);
        if (dErr) return err('Review not found', 404);
        return json({ success: true, message: 'Review deleted' });
      }
    }

    // ═══ AUTH ════════════════════════════════════════════════════════════════════
    if (resource === 'auth') {

      // POST /auth/sync-profile
      if (method === 'POST' && id === 'sync-profile') {
        const authHeader = req.headers.get('authorization') || '';
        if (!authHeader.startsWith('Bearer ')) return err('Authorization header missing', 401);
        const token = authHeader.slice(7);

        const authedClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user: supaUser }, error: authErr } = await authedClient.auth.getUser();
        if (authErr || !supaUser) return err('Invalid token', 401);

        const { data: existing } = await supabase.from('users').select('*').eq('id', supaUser.id).single();
        if (existing) return json({ success: true, message: 'Profile already exists', user: toUser(existing) });

        const { name } = body;
        const { data: created, error: cErr } = await supabase.from('users').insert({
          id: supaUser.id,
          email: supaUser.email || '',
          password: '',
          name: name || supaUser.user_metadata?.name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().single();
        if (cErr) return err(cErr.message);
        return json({ success: true, message: 'Profile created', user: toUser(created) }, 201);
      }

      // POST /auth/verify-token
      if (method === 'POST' && id === 'verify-token') {
        const { token } = body;
        if (!token) return err('Token is required', 400);

        const authedClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user: supaUser }, error: authErr } = await authedClient.auth.getUser();
        if (authErr || !supaUser) return err('Invalid or expired token', 401);

        let { data: profile } = await supabase.from('users').select('*').eq('id', supaUser.id).single();
        if (!profile) {
          const { data: created } = await supabase.from('users').insert({
            id: supaUser.id,
            email: supaUser.email || '',
            password: '',
            name: supaUser.user_metadata?.name || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).select().single();
          profile = created;
        }
        if (!profile) return err('Failed to get/create user profile');
        const user = toUser(profile);
        return json({ success: true, user, token });
      }
    }

    // ═══ USERS ════════════════════════════════════════════════════════════════════
    if (resource === 'users') {

      // GET /users
      if (method === 'GET' && !id) {
        const { data } = await supabase.from('users').select('id,email,name,created_at,updated_at');
        return json({ success: true, data: (data || []).map(toUser) });
      }

      // GET /users/:id
      if (method === 'GET' && id) {
        const { data } = await supabase.from('users').select('id,email,name,created_at,updated_at').eq('id', id).single();
        if (!data) return err('User not found', 404);
        return json({ success: true, data: toUser(data) });
      }

      // PUT /users/:id
      if (method === 'PUT' && id) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (body.name) updates.name = body.name;
        if (body.email) updates.email = body.email;
        const { data: updated, error: uErr } = await supabase.from('users').update(updates).eq('id', id).select().single();
        if (uErr || !updated) return err('Failed to update user');
        return json({ success: true, data: toUser(updated) });
      }

      // DELETE /users/:id
      if (method === 'DELETE' && id) {
        const { error: dErr } = await supabase.from('users').delete().eq('id', id);
        if (dErr) return err('User not found', 404);
        return json({ success: true, message: 'User deleted' });
      }
    }

    // ═══ CHAT ════════════════════════════════════════════════════════════════════
    if (resource === 'chat') {

      // GET /chat/conversations/:id/messages
      if (method === 'GET' && id === 'conversations' && sub && segs[3] === 'messages') {
        const convId = sub;
        const after = url.searchParams.get('after');
        const { data: conv } = await supabase.from('conversations').select('id').eq('id', convId).single();
        if (!conv) return err('Conversation not found', 404);

        let qb = supabase.from('messages').select('*').eq('conversation_id', convId);
        if (after) qb = qb.gt('created_at', after);
        qb = qb.order('created_at', { ascending: true });
        const { data } = await qb;
        return json({ success: true, data: (data || []).map(toMessage) });
      }

      // POST /chat/conversations/:id/messages — send message
      if (method === 'POST' && id === 'conversations' && sub && segs[3] === 'messages') {
        const convId = sub;
        const { senderId, text, imageUrl } = body;
        if (!senderId) return err('senderId is required', 400);
        if (!text && !imageUrl) return err('text or imageUrl is required', 400);

        const { data: conv } = await supabase.from('conversations').select('participants').eq('id', convId).single();
        if (!conv) return err('Conversation not found', 404);
        if (!conv.participants.includes(senderId)) return err('Not a participant', 403);

        const message = {
          id: `msg-${randomHex(8)}`,
          conversation_id: convId,
          sender_id: senderId,
          text: text || null,
          image_url: imageUrl || null,
          created_at: new Date().toISOString(),
        };
        const { data: created, error: cErr } = await supabase.from('messages').insert(message).select().single();
        if (cErr) return err(cErr.message);
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
        return json({ success: true, data: toMessage(created) }, 201);
      }

      // GET /chat/conversations/:id
      if (method === 'GET' && id === 'conversations' && sub) {
        const userId = url.searchParams.get('userId') || '';
        const { data: conv } = await supabase.from('conversations').select('*').eq('id', sub).single();
        if (!conv) return err('Conversation not found', 404);

        const otherUserId = conv.participants.find((p: string) => p !== userId) || conv.participants[0];
        const { data: otherUser } = await supabase.from('users').select('name').eq('id', otherUserId).single();
        const { data: offer } = await supabase.from('offers').select('store_name').eq('id', conv.offer_id).single();

        return json({
          success: true,
          data: {
            ...toConversation(conv),
            storeName: offer?.store_name || 'Unknown',
            otherUserId,
            otherUserName: otherUser?.name || 'Unknown',
          },
        });
      }

      // GET /chat/conversations?userId=...
      if (method === 'GET' && id === 'conversations' && !sub) {
        const userId = url.searchParams.get('userId');
        if (!userId) return err('userId is required', 400);

        const { data: convs } = await supabase.from('conversations').select('*').contains('participants', [userId]).order('updated_at', { ascending: false });

        const enriched = await Promise.all((convs || []).map(async (conv: any) => {
          const [lastMsgRes, offerRes] = await Promise.all([
            supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('offers').select('store_name').eq('id', conv.offer_id).single(),
          ]);
          const otherUserId = conv.participants.find((p: string) => p !== userId) || '';
          const { data: otherUser } = await supabase.from('users').select('name').eq('id', otherUserId).single();
          const lastMsg = lastMsgRes.data;

          return {
            id: conv.id,
            offerId: conv.offer_id,
            storeName: offerRes.data?.store_name || 'Unknown',
            otherUserId,
            otherUserName: otherUser?.name || 'Unknown',
            lastMessage: lastMsg?.image_url ? '📷 Photo' : (lastMsg?.text || ''),
            lastMessageTime: lastMsg?.created_at || conv.updated_at,
            updatedAt: conv.updated_at,
            createdAt: conv.created_at,
          };
        }));

        return json({ success: true, data: enriched });
      }

      // POST /chat/conversations — create or get
      if (method === 'POST' && id === 'conversations' && !sub) {
        const { offerId, senderId, receiverId } = body;
        if (!offerId || !senderId || !receiverId) return err('offerId, senderId, receiverId required', 400);

        const { data: convs } = await supabase.from('conversations').select('*').eq('offer_id', offerId).contains('participants', [senderId, receiverId]);

        if (convs && convs.length > 0) {
          return json({ success: true, data: toConversation(convs[0]), existing: true });
        }

        const conv = {
          id: `conv-${randomHex(8)}`,
          offer_id: offerId,
          participants: [senderId, receiverId],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data: created, error: cErr } = await supabase.from('conversations').insert(conv).select().single();
        if (cErr) return err(cErr.message);
        return json({ success: true, data: toConversation(created), existing: false }, 201);
      }
    }

    return err('Not found', 404);
  } catch (e: any) {
    console.error('Edge function error:', e);
    return err(e.message || 'Internal server error');
  }
});
