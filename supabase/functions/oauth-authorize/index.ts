import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ChatGPT GPT OAuth Authorization endpoint

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== OAuth Authorize Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    const scope = url.searchParams.get('scope') || 'profile connections';
    const responseType = url.searchParams.get('response_type');

    console.log('OAuth Parameters:', {
      clientId,
      redirectUri,
      state,
      scope,
      responseType
    });

    // Validate required parameters
    if (!clientId || !redirectUri || !responseType || responseType !== 'code') {
      console.error('Missing or invalid parameters');
      return new Response(JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Missing or invalid required parameters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify client exists and redirect URI is valid
    console.log('Verifying OAuth client...');
    const { data: client, error: clientError } = await supabase
      .from('gpt_oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(JSON.stringify({ 
        error: 'invalid_client',
        error_description: 'Client not found'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Client found:', client.client_name);
    console.log('Registered redirect URIs:', client.redirect_uris);

    if (!client.redirect_uris.includes(redirectUri)) {
      console.error('Redirect URI mismatch. Provided:', redirectUri);
      return new Response(JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Invalid redirect URI'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For GET requests, return HTML consent page
    if (req.method === 'GET') {
      const appUrl = Deno.env.get('APP_URL') ?? 'https://synaps-plugin.lovable.app';
      const consentPageUrl = `${appUrl}/oauth-consent?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state || ''}&scope=${encodeURIComponent(scope)}`;
      
      console.log('Redirecting to consent page:', consentPageUrl);
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': consentPageUrl
        },
      });
    }

    // For POST requests (user approved), create authorization code
    if (req.method === 'POST') {
      console.log('Processing POST request (user consent)');
      const { approved, userId } = await req.json();

      console.log('User decision:', { approved, userId });

      if (!approved) {
        const errorUrl = `${redirectUri}?error=access_denied&error_description=User denied access${state ? `&state=${state}` : ''}`;
        console.log('User denied access, redirecting to:', errorUrl);
        return new Response(JSON.stringify({ redirect: errorUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate authorization code
      const code = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log('Creating authorization code:', {
        code: code.substring(0, 8) + '...',
        userId,
        expiresAt: expiresAt.toISOString()
      });

      const { error: codeError } = await supabase
        .from('gpt_oauth_codes')
        .insert({
          code,
          client_id: clientId,
          user_id: userId,
          redirect_uri: redirectUri,
          scope,
          expires_at: expiresAt.toISOString()
        });

      if (codeError) {
        console.error('Error creating authorization code:', codeError);
        return new Response(JSON.stringify({ 
          error: 'server_error',
          error_description: 'Failed to create authorization code'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const successUrl = `${redirectUri}?code=${code}${state ? `&state=${state}` : ''}`;
      console.log('Authorization successful, redirecting to:', successUrl);
      return new Response(JSON.stringify({ redirect: successUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'invalid_request',
      error_description: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in oauth-authorize:', error);
    return new Response(JSON.stringify({ 
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
