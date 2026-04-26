import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rylxeslhdpyewtfexzll.supabase.co';
// Set this secret via: supabase secrets set SERVICE_ROLE_KEY=<your-key>
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify the caller's JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userToken = authHeader.replace('Bearer ', '');

  // Use the user's token to verify identity (anon client + JWT)
  const userClient = createClient(SUPABASE_URL, userToken, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  // Admin client to perform privileged operations
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Delete user's messages (via their conversations)
    const { data: convs } = await adminClient
      .from('conversations')
      .select('id')
      .contains('participants', [userId]);

    if (convs && convs.length > 0) {
      const convIds = convs.map((c: { id: string }) => c.id);
      await adminClient.from('messages').delete().in('conversation_id', convIds);
      await adminClient.from('conversations').delete().in('id', convIds);
    }

    // 2. Delete user's reviews
    await adminClient.from('reviews').delete().eq('user_id', userId);

    // 3. Delete user's offers (and their associated reviews)
    const { data: offers } = await adminClient
      .from('offers')
      .select('id')
      .eq('user_id', userId);

    if (offers && offers.length > 0) {
      const offerIds = offers.map((o: { id: string }) => o.id);
      await adminClient.from('reviews').delete().in('offer_id', offerIds);
      await adminClient.from('offers').delete().in('id', offerIds);
    }

    // 4. Delete user profile row
    await adminClient.from('users').delete().eq('id', userId);

    // 5. Delete the auth user (permanent)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Auth delete error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Account deleted' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Delete account error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
