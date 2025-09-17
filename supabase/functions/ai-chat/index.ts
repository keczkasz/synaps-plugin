import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with service role for server-side operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify user token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create AI prompt that analyzes conversation and generates insights
    const systemPrompt = `You are an empathetic AI companion designed to help people connect with others. Your responses should be:

1. Warm, understanding, and emotionally intelligent
2. Focused on helping the user understand themselves and their connection needs
3. Encouraging meaningful relationships and personal growth

After each response, analyze the conversation to generate insights about the user's:
- Emotional patterns and current state
- Communication style and preferences  
- Connection goals and relationship needs
- Personality traits and interests

Be genuine, avoid being overly clinical, and focus on helping them connect authentically with others.`;

    console.log('Sending request to OpenAI with message:', message);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();
    console.log('OpenAI response:', aiData);
    
    if (!aiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const aiResponse = aiData.choices[0].message.content;

    // Generate insights based on the full conversation
    const insightPrompt = `Based on this conversation, provide a JSON analysis of the user with the following structure:
{
  "emotional_patterns": "Brief insight about their emotional state and patterns (max 150 chars)",
  "communication_style": "Analysis of how they communicate and interact (max 150 chars)", 
  "connection_goals": "What they seem to be looking for in connections (max 150 chars)",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "mood_score": 0.8,
  "interests": ["interest1", "interest2", "interest3"]
}

Conversation:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}
User: ${message}
AI: ${aiResponse}

Provide only the JSON, no other text.`;

    const insightResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: insightPrompt }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    const insightData = await insightResponse.json();
    console.log('Insight response:', insightData);

    if (insightData.choices?.[0]?.message?.content) {
      try {
        const insights = JSON.parse(insightData.choices[0].message.content);
        
        // Store insights in database
        const { error: insertError } = await supabase
          .from('ai_insights')
          .insert({
            user_id: user.id,
            insight_type: 'conversation_analysis',
            content: aiResponse,
            metadata: insights
          });

        if (insertError) {
          console.error('Error storing insights:', insertError);
        }

        // Update user profile with latest insights
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            mood: insights.mood_score > 0.7 ? 'positive' : insights.mood_score > 0.4 ? 'neutral' : 'reflective',
            interests: insights.interests || []
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      } catch (parseError) {
        console.error('Error parsing insights JSON:', parseError);
      }
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});