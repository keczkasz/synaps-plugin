import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOAuthToken, logApiCall } from '../_shared/oauth-middleware.ts';
import { createAuditLog } from '../_shared/audit.ts';
// ChatGPT GPT API - Get User Profile

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify OAuth token
    const authResult = await verifyOAuthToken(req.headers.get('Authorization'), req, '/gpt-api-get-profile');
    
    if (authResult.error) {
      await logApiCall('unknown', '/gpt-api-get-profile', req.method, authResult.status, null, null, authResult.error);
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.userId!;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      await logApiCall(userId, '/gpt-api-get-profile', req.method, 404, null, null, 'Profile not found');
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = {
      userId: profile.id,
      displayName: profile.display_name,
      interests: profile.interests || [],
      currentMood: profile.mood,
      currentIntentions: profile.current_intentions,
      conversationTopics: profile.last_conversation_topics || [],
      bio: profile.bio,
      createdAt: profile.created_at
    };

    // Audit profile view
    await createAuditLog({
      userId,
      action: 'profile_view',
      resourceType: 'profile',
      resourceId: profile.id,
      status: 'success',
      request: req
    });

    await logApiCall(userId, '/gpt-api-get-profile', req.method, 200, null, response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt-api-get-profile:', error);
    await logApiCall('unknown', '/gpt-api-get-profile', req.method, 500, null, null, error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
