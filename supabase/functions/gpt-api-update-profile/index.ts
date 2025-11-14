import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOAuthToken, logApiCall } from '../_shared/oauth-middleware.ts';
// ChatGPT GPT API - Update User Profile

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
    const authResult = await verifyOAuthToken(req.headers.get('Authorization'));
    
    if (authResult.error) {
      await logApiCall('unknown', '/gpt-api-update-profile', req.method, authResult.status, null, null, authResult.error);
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.userId!;
    const requestBody = await req.json();
    const { interests, currentMood, currentIntentions, conversationTopics } = requestBody;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Build update object with only provided fields
    const updateData: any = {};
    if (interests !== undefined) updateData.interests = interests;
    if (currentMood !== undefined) updateData.current_mood = currentMood;
    if (currentIntentions !== undefined) updateData.current_intentions = currentIntentions;
    if (conversationTopics !== undefined) updateData.conversation_topics = conversationTopics;

    if (Object.keys(updateData).length === 0) {
      await logApiCall(userId, '/gpt-api-update-profile', req.method, 400, requestBody, null, 'No fields to update');
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      await logApiCall(userId, '/gpt-api-update-profile', req.method, 500, requestBody, null, 'Failed to update profile');
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = {
      success: true,
      profile: {
        userId: profile.id,
        displayName: profile.display_name,
        interests: profile.interests || [],
        currentMood: profile.current_mood,
        currentIntentions: profile.current_intentions,
        conversationTopics: profile.conversation_topics || []
      }
    };

    await logApiCall(userId, '/gpt-api-update-profile', req.method, 200, requestBody, response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt-api-update-profile:', error);
    await logApiCall('unknown', '/gpt-api-update-profile', req.method, 500, null, null, error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
