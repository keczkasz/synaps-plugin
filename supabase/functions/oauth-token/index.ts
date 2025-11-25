import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ChatGPT GPT OAuth Token endpoint

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== OAuth Token Request ===');
    console.log('Method:', req.method);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const formData = await req.formData();
    const grantType = formData.get('grant_type');
    const clientId = formData.get('client_id');
    const clientSecret = formData.get('client_secret');

    console.log('Grant Type:', grantType);
    console.log('Client ID:', clientId);

    // Verify client credentials
    const { data: client, error: clientError } = await supabase
      .from('gpt_oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('client_secret', clientSecret)
      .single();

    if (clientError || !client) {
      console.error('Client verification failed:', clientError);
      return new Response(JSON.stringify({ 
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Client verified:', client.client_name);

    // Handle authorization_code grant
    if (grantType === 'authorization_code') {
      console.log('Processing authorization_code grant');
      const code = formData.get('code');
      const redirectUri = formData.get('redirect_uri');

      console.log('Authorization code:', code?.toString().substring(0, 8) + '...');
      console.log('Redirect URI:', redirectUri);

      // Verify authorization code
      const { data: authCode, error: codeError } = await supabase
        .from('gpt_oauth_codes')
        .select('*')
        .eq('code', code)
        .eq('client_id', clientId)
        .eq('used', false)
        .single();

      if (codeError || !authCode) {
        console.error('Authorization code verification failed:', codeError);
        return new Response(JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Authorization code verified for user:', authCode.user_id);

      // Check if code is expired
      if (new Date(authCode.expires_at) < new Date()) {
        console.error('Authorization code expired:', authCode.expires_at);
        return new Response(JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Authorization code expired'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify redirect URI matches
      if (authCode.redirect_uri !== redirectUri) {
        console.error('Redirect URI mismatch:', {
          stored: authCode.redirect_uri,
          provided: redirectUri
        });
        return new Response(JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Redirect URI mismatch'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark code as used
      console.log('Marking authorization code as used');
      await supabase
        .from('gpt_oauth_codes')
        .update({ used: true })
        .eq('code', code);

      // Generate tokens
      const accessToken = crypto.randomUUID();
      const refreshToken = crypto.randomUUID();
      const expiresIn = 3600; // 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      console.log('Creating access token:', {
        userId: authCode.user_id,
        expiresAt: expiresAt.toISOString()
      });

      const { error: tokenError } = await supabase
        .from('gpt_oauth_tokens')
        .insert({
          access_token: accessToken,
          refresh_token: refreshToken,
          client_id: clientId,
          user_id: authCode.user_id,
          scope: authCode.scope,
          expires_at: expiresAt.toISOString()
        });

      if (tokenError) {
        console.error('Error creating tokens:', tokenError);
        return new Response(JSON.stringify({ 
          error: 'server_error',
          error_description: 'Failed to create tokens'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Tokens created successfully');

      return new Response(JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
        scope: authCode.scope
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle refresh_token grant
    if (grantType === 'refresh_token') {
      console.log('Processing refresh_token grant');
      const refreshToken = formData.get('refresh_token');

      const { data: token, error: tokenError } = await supabase
        .from('gpt_oauth_tokens')
        .select('*')
        .eq('refresh_token', refreshToken)
        .eq('client_id', clientId)
        .eq('revoked', false)
        .single();

      if (tokenError || !token) {
        console.error('Refresh token verification failed:', tokenError);
        return new Response(JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Invalid refresh token'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Refresh token verified for user:', token.user_id);

      // Generate new access token
      const newAccessToken = crypto.randomUUID();
      const expiresIn = 3600; // 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      console.log('Generating new access token');

      await supabase
        .from('gpt_oauth_tokens')
        .update({
          access_token: newAccessToken,
          expires_at: expiresAt.toISOString()
        })
        .eq('refresh_token', refreshToken);

      console.log('Access token refreshed successfully');

      return new Response(JSON.stringify({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
        scope: token.scope
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'unsupported_grant_type',
      error_description: 'Grant type not supported'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in oauth-token:', error);
    return new Response(JSON.stringify({ 
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
