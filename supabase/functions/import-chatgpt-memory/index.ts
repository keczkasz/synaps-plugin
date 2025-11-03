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

    if (!memoryContent || !memoryContent.trim()) {
      throw new Error('Memory content is required');
    }

    // Parse the pasted ChatGPT memory content
    const text = memoryContent.toLowerCase();
    const interests: string[] = [];
    const frequent_topics: string[] = [];
    
    // Split into sentences and extract interests/topics
    const sentences = memoryContent.split(/[.!?\n]+/).map((s: string) => s.trim()).filter(Boolean);
    
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      
      // Extract interests using common patterns
      if (lower.includes('interested in') || 
          lower.includes('likes') || 
          lower.includes('enjoys') ||
          lower.includes('passionate about') ||
          lower.includes('loves')) {
        
        // Extract the part after these keywords
        const parts = sentence.split(/interested in|likes|enjoys|passionate about|loves/i);
        if (parts.length > 1) {
          const topic = parts[1].trim().split(/[,;.]/)[0].trim();
          if (topic && topic.length > 2 && topic.length < 50) {
            interests.push(topic);
          }
        }
      }
      
      // Extract topics/subjects mentioned
      if (sentence.length > 10 && sentence.length < 100) {
        const commonWords = ['the', 'is', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an'];
        const words = sentence.split(' ');
        if (words.length > 2 && words.length < 15) {
          const hasCommonWord = words.some(w => commonWords.includes(w.toLowerCase()));
          if (!hasCommonWord && !lower.includes('http')) {
            frequent_topics.push(sentence);
          }
        }
      }
    }

    // Remove duplicates and limit array sizes
    const parsedMemory = {
      interests: [...new Set(interests)].slice(0, 10),
      communication_style: 'conversational',
      frequent_topics: [...new Set(frequent_topics)].slice(0, 10)
    };

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
