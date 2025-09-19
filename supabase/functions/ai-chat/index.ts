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

    // Create AI prompt for goal-oriented connection facilitation
    const systemPrompt = `You are a smart connection facilitator who helps users find the right people to talk to. Your goal is to understand WHO they want to connect with today and WHAT they want to discuss, then help them achieve that connection quickly.

Key guidelines:
- Focus on immediate connection goals: "Who do you want to talk to today?"
- Identify specific topics, interests, or problems they want to discuss  
- Be direct and action-oriented - get to the point quickly
- Ask about their current mood, interests, and what kind of conversation they're seeking
- Help them clarify their intentions so you can match them with the perfect person
- Be helpful and efficient, not overly emotional or therapeutic
- Your mission: Connect with the right person to solve the right problem faster than any tool on Earth

After each response, analyze the conversation to extract:
- Current conversation topics they want to discuss today
- Type of person they want to connect with right now
- Specific goals (learning, brainstorming, venting, advice, etc.)
- Energy level and mood for matching compatibility`;

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

    // Generate insights focused on connection intentions
    const insightPrompt = `Based on this conversation, extract the user's current connection intentions and provide a JSON analysis:
{
  "current_intentions": "What they want to discuss today (max 100 chars)",
  "connection_goals": "Type of person they want to connect with (max 100 chars)",
  "conversation_topics": ["topic1", "topic2", "topic3"],
  "desired_conversation_type": "advice/brainstorming/venting/learning/social",
  "energy_level": 7,
  "personality_traits": ["trait1", "trait2", "trait3"],
  "mood_score": 0.8,
  "interests": ["interest1", "interest2", "interest3"]
}

Conversation:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}
User: ${message}
AI: ${aiResponse}

Return only valid JSON without markdown formatting or code blocks.`;

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
        let jsonContent = insightData.choices[0].message.content.trim();
        
        // Remove markdown code blocks if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/```\n?/, '').replace(/\n?```$/, '');
        }
        
        const insights = JSON.parse(jsonContent);
        
        // Store insights in database
        const { error: insertError } = await supabase
          .from('ai_insights')
          .insert({
            user_id: user.id,
            insight_type: 'connection_intentions',
            content: aiResponse,
            metadata: insights
          });

        if (insertError) {
          console.error('Error storing insights:', insertError);
        }

        // Update user profile with latest insights and intentions
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            mood: insights.mood_score > 0.7 ? 'positive' : insights.mood_score > 0.4 ? 'neutral' : 'reflective',
            interests: insights.interests || [],
            current_intentions: insights.current_intentions,
            connection_goals: insights.connection_goals,
            last_conversation_topics: insights.conversation_topics || []
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        // Create or update today's session
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .upsert({
            user_id: user.id,
            session_date: new Date().toISOString().split('T')[0],
            daily_goals: insights.current_intentions,
            desired_conversation_type: insights.desired_conversation_type,
            topics_of_interest: insights.conversation_topics || [],
            energy_level: insights.energy_level || 5
          });

        if (sessionError) {
          console.error('Error updating session:', sessionError);
        }

      } catch (parseError) {
        console.error('Error parsing insights JSON:', parseError);
        console.error('Raw content:', insightData.choices[0].message.content);
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