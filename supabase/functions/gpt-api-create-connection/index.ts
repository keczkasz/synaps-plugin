import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOAuthToken, logApiCall } from '../_shared/oauth-middleware.ts';

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
      await logApiCall('unknown', '/gpt-api-create-connection', req.method, authResult.status, null, null, authResult.error);
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.userId!;
    const requestBody = await req.json();
    const { targetUserId, introMessage } = requestBody;

    if (!targetUserId) {
      await logApiCall(userId, '/gpt-api-create-connection', req.method, 400, requestBody, null, 'targetUserId is required');
      return new Response(JSON.stringify({ error: 'targetUserId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify target user exists
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      await logApiCall(userId, '/gpt-api-create-connection', req.method, 404, requestBody, null, 'Target user not found');
      return new Response(JSON.stringify({ error: 'Target user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`)
      .maybeSingle();

    let conversationId;

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user1_id: userId,
          user2_id: targetUserId,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        await logApiCall(userId, '/gpt-api-create-connection', req.method, 500, requestBody, null, 'Failed to create conversation');
        return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      conversationId = newConversation.id;

      // Create intro message from GPT
      const defaultMessage = introMessage || 
        `🤖 Hi! Your ChatGPT assistant connected you with ${targetProfile.display_name} based on your conversation interests. Hope you have a great chat!`;

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: 'gpt-assistant',
          content: defaultMessage
        });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const conversationUrl = `${supabaseUrl.replace('.supabase.co', '')}/chat?conversation=${conversationId}`;

    const response = {
      success: true,
      conversationId,
      conversationUrl,
      targetUser: {
        userId: targetUserId,
        displayName: targetProfile.display_name
      },
      isNewConversation: !existingConversation
    };

    await logApiCall(userId, '/gpt-api-create-connection', req.method, 200, requestBody, response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt-api-create-connection:', error);
    await logApiCall('unknown', '/gpt-api-create-connection', req.method, 500, null, null, error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
