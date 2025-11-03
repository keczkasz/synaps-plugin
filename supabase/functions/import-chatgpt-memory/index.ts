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

    const { memoryContent } = await req.json();

    if (!memoryContent) {
      throw new Error('Memory content is required');
    }

    console.log('Processing ChatGPT memory content...');

    // Parse the memory content to extract interests and topics
    const lines = memoryContent.split('\n').filter((line: string) => line.trim());
    
    const interests: string[] = [];
    const topics: string[] = [];
    let communicationStyle = 'thoughtful and engaged';
    
    // Extract information from memory lines
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[-•*]\s*/, '');
      
      // Look for interest-related keywords
      if (cleanLine.toLowerCase().includes('interes') || 
          cleanLine.toLowerCase().includes('hobby') ||
          cleanLine.toLowerCase().includes('passion') ||
          cleanLine.toLowerCase().includes('lubisz') ||
          cleanLine.toLowerCase().includes('love')) {
        const words = cleanLine.split(/\s+/);
        words.forEach(word => {
          const clean = word.replace(/[.,!?;:]/g, '');
          if (clean.length > 3 && !['with', 'about', 'interest', 'love', 'hobby', 'lubisz'].includes(clean.toLowerCase())) {
            interests.push(clean);
          }
        });
      }
      
      // Add line as potential topic if it's meaningful
      if (cleanLine.length > 10 && cleanLine.length < 100) {
        topics.push(cleanLine.substring(0, 50));
      }
    }
    
    // Remove duplicates and limit
    const uniqueInterests = [...new Set(interests)].slice(0, 10);
    const uniqueTopics = [...new Set(topics)].slice(0, 10);
    
    const parsedMemory = {
      interests: uniqueInterests.length > 0 ? uniqueInterests : ['AI', 'technology', 'conversations'],
      preferences: [],
      communication_style: communicationStyle,
      frequent_topics: uniqueTopics.length > 0 ? uniqueTopics : ['technology', 'personal growth'],
    };
    
    console.log('Extracted data:', parsedMemory);

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
