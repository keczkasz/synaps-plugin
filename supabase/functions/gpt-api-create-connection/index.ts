import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOAuthToken, logApiCall } from '../_shared/oauth-middleware.ts';
import { validateUUID, validateString, sanitizeString, ValidationError } from '../_shared/validation.ts';
import { auditConnectionCreated, auditValidationFailed, auditAccessDenied } from '../_shared/audit.ts';
// ChatGPT GPT API - Create Connection

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
    const authResult = await verifyOAuthToken(req.headers.get('Authorization'), req, '/gpt-api-create-connection');
    
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

    // Validate inputs
    const errors: ValidationError[] = [];

    const targetUserIdError = validateUUID(targetUserId, 'targetUserId', { required: true });
    if (targetUserIdError) errors.push(targetUserIdError);

    const introMessageError = validateString(introMessage, 'introMessage', { maxLength: 1000 });
    if (introMessageError) errors.push(introMessageError);

    if (errors.length > 0) {
      await auditValidationFailed(userId, '/gpt-api-create-connection', errors.map(e => e.message), req);
      await logApiCall(userId, '/gpt-api-create-connection', req.method, 400, null, null, 
        `Validation errors: ${errors.map(e => e.message).join(', ')}`);
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent self-connection
    if (targetUserId === userId) {
      await auditAccessDenied(userId, '/gpt-api-create-connection', 'Attempted self-connection', req);
      await logApiCall(userId, '/gpt-api-create-connection', req.method, 400, null, null, 'Cannot connect to yourself');
      return new Response(JSON.stringify({ error: 'Cannot connect to yourself' }), {
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
      const sanitizedIntroMessage = introMessage ? sanitizeString(introMessage) : null;
      const defaultMessage = sanitizedIntroMessage || 
        `🤖 Hi! Your ChatGPT assistant connected you with ${targetProfile.display_name} based on your conversation interests. Hope you have a great chat!`;

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: defaultMessage
        });
    }

    // Construct the app URL from the request origin or use a fallback
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://synaps.lovable.app';
    const conversationUrl = `${origin}/chat?conversation=${conversationId}`;

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

    // Audit successful connection creation
    if (!existingConversation) {
      await auditConnectionCreated(userId, conversationId, targetUserId, req);
    }

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
