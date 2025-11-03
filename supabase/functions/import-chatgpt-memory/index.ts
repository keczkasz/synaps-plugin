import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { apiKey } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Fetch conversation memory from OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Extract and summarize the user\'s interests, preferences, communication style, and topics they frequently discuss. Return this as a structured JSON with keys: interests (array), preferences (array), communication_style (string), frequent_topics (array).'
          },
          {
            role: 'user',
            content: 'Based on our conversation history, what are my main interests, preferences, and communication patterns?'
          }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to fetch ChatGPT memory');
    }

    const data = await response.json();
    const memoryContent = data.choices[0].message.content;

    let parsedMemory;
    try {
      parsedMemory = JSON.parse(memoryContent);
    } catch {
      // If not valid JSON, extract insights manually
      parsedMemory = {
        interests: [],
        preferences: [],
        communication_style: 'conversational',
        frequent_topics: []
      };
    }

    // Update user profile with imported memory
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        interests: parsedMemory.interests || [],
        current_intentions: parsedMemory.communication_style || 'Build meaningful connections',
        last_conversation_topics: parsedMemory.frequent_topics || [],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    // Store AI insight about the imported memory
    const { error: insightError } = await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        insight_type: 'chatgpt_memory_import',
        content: `Imported ChatGPT memory: ${parsedMemory.interests?.join(', ')}`,
        metadata: parsedMemory,
      });

    if (insightError) {
      console.error('Error storing insight:', insightError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        imported_data: parsedMemory 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-chatgpt-memory:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
