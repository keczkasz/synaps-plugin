import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Validate required parameters
    if (!clientId || !redirectUri || !responseType || responseType !== 'code') {
      return new Response(JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Missing or invalid required parameters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify client exists and redirect URI is valid
    const { data: client, error: clientError } = await supabase
      .from('gpt_oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ 
        error: 'invalid_client',
        error_description: 'Client not found'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!client.redirect_uris.includes(redirectUri)) {
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
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const consentPageUrl = `${supabaseUrl.replace('.supabase.co', '')}/oauth-consent?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state || ''}&scope=${encodeURIComponent(scope)}`;
      
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
      const { approved, userId } = await req.json();

      if (!approved) {
        const errorUrl = `${redirectUri}?error=access_denied&error_description=User denied access${state ? `&state=${state}` : ''}`;
        return new Response(JSON.stringify({ redirect: errorUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate authorization code
      const code = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
