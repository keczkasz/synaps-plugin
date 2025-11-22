import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOAuthToken, logApiCall } from '../_shared/oauth-middleware.ts';
import { validateString, validateNumber, sanitizeString, ValidationError } from '../_shared/validation.ts';
import { auditValidationFailed } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { topic, mood, conversationType, limit = 5 } = requestBody;
    
    // Verify OAuth token
    const authResult = await verifyOAuthToken(req.headers.get('Authorization'), req, '/gpt-api-find-matches');
    
    if (authResult.error) {
      await logApiCall('unknown', '/gpt-api-find-matches', req.method, authResult.status, requestBody, null, authResult.error);
      
      // Return simple 401 to trigger ChatGPT OAuth flow
      return new Response(JSON.stringify({ 
        error: 'unauthorized',
        error_description: 'Authentication required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.userId!;

    // Validate inputs
    const errors: ValidationError[] = [];

    const topicError = validateString(topic, 'topic', { maxLength: 200 });
    if (topicError) errors.push(topicError);

    const moodError = validateString(mood, 'mood', { maxLength: 100 });
    if (moodError) errors.push(moodError);

    const typeError = validateString(conversationType, 'conversationType', { maxLength: 100 });
    if (typeError) errors.push(typeError);

    const limitError = validateNumber(limit, 'limit', { min: 1, max: 20, integer: true });
    if (limitError) errors.push(limitError);

    if (errors.length > 0) {
      await auditValidationFailed(userId, '/gpt-api-find-matches', errors.map(e => e.message), req);
      await logApiCall(userId, '/gpt-api-find-matches', req.method, 400, null, null, 
        `Validation errors: ${errors.map(e => e.message).join(', ')}`);
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize string inputs
    const sanitizedTopic = topic ? sanitizeString(topic) : undefined;
    const sanitizedMood = mood ? sanitizeString(mood) : undefined;
    const sanitizedType = conversationType ? sanitizeString(conversationType) : undefined;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get current user's profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!userProfile) {
      await logApiCall(userId, '/gpt-api-find-matches', req.method, 404, requestBody, null, 'User profile not found');
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all other users
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      await logApiCall(userId, '/gpt-api-find-matches', req.method, 500, requestBody, null, 'Failed to fetch profiles');
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate compatibility scores
    const matches = allProfiles.map(profile => {
      let score = 0;
      let reasons: string[] = [];

      // Check interests overlap
      const userInterests = userProfile.interests || [];
      const profileInterests = profile.interests || [];
      const sharedInterests = userInterests.filter((interest: string) => 
        profileInterests.includes(interest)
      );

      if (sharedInterests.length > 0) {
        score += sharedInterests.length * 15;
        reasons.push(`Shared interests: ${sharedInterests.join(', ')}`);
      }

      // Check if topic matches interests or conversation topics
      if (sanitizedTopic) {
        const topicLower = sanitizedTopic.toLowerCase();
        const matchesInterests = profileInterests.some((interest: string) => 
          interest.toLowerCase().includes(topicLower) || topicLower.includes(interest.toLowerCase())
        );
        const matchesTopics = (profile.last_conversation_topics || []).some((t: string) => 
          t.toLowerCase().includes(topicLower) || topicLower.includes(t.toLowerCase())
        );

        if (matchesInterests) {
          score += 25;
          reasons.push(`Interested in ${sanitizedTopic}`);
        }
        if (matchesTopics) {
          score += 20;
          reasons.push(`Enjoys discussing ${sanitizedTopic}`);
        }
      }

      // Check mood compatibility
      if (sanitizedMood && profile.mood) {
        if (sanitizedMood.toLowerCase() === profile.mood.toLowerCase()) {
          score += 10;
          reasons.push(`Similar mood: ${sanitizedMood}`);
        }
      }

      // Check current intentions compatibility
      if (userProfile.current_intentions && profile.current_intentions) {
        const userIntentionsLower = userProfile.current_intentions.toLowerCase();
        const profileIntentionsLower = profile.current_intentions.toLowerCase();
        
        if (userIntentionsLower.includes(profileIntentionsLower) || 
            profileIntentionsLower.includes(userIntentionsLower)) {
          score += 15;
          reasons.push('Compatible goals');
        }
      }

      return {
        userId: profile.id,
        displayName: profile.display_name,
        interests: profile.interests || [],
        currentMood: profile.mood,
        bio: profile.bio,
        compatibilityScore: Math.min(score, 100),
        matchReasons: reasons,
        lastActive: profile.updated_at
      };
    });

    // Sort by compatibility score and filter by minimum score
    const sortedMatches = matches
      .filter(m => m.compatibilityScore > 0)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

    const appUrl = 'https://vkcxoxoxrpllcbyhdyam.netlify.app';

    // Handle no matches - provide fallback users
    if (sortedMatches.length === 0 && allProfiles.length > 0) {
      const fallbackUsers = allProfiles
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3)
        .map(profile => ({
          userId: profile.id,
          displayName: profile.display_name,
          interests: profile.interests || [],
          currentMood: profile.mood,
          bio: profile.bio,
          compatibilityScore: 0,
          matchReasons: ['Active user in the Synaps community'],
          lastActive: profile.updated_at
        }));

      const response = {
        matches: fallbackUsers,
        totalFound: fallbackUsers.length,
        message: `No perfect matches found${sanitizedTopic ? ` for "${sanitizedTopic}"` : ''}, but here are some active users. You can also browse more in the Synaps app!`,
        fallbackMode: true,
        appUrl,
        searchCriteria: { topic: sanitizedTopic, mood: sanitizedMood, conversationType: sanitizedType }
      };

      await logApiCall(userId, '/gpt-api-find-matches', req.method, 200, requestBody, { matchCount: fallbackUsers.length, fallbackMode: true });

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle no users at all
    if (sortedMatches.length === 0) {
      const response = {
        matches: [],
        totalFound: 0,
        message: 'Synaps is just starting! Be one of the first users. Create your profile and start chatting.',
        appUrl,
        searchCriteria: { topic: sanitizedTopic, mood: sanitizedMood, conversationType: sanitizedType }
      };

      await logApiCall(userId, '/gpt-api-find-matches', req.method, 200, requestBody, { matchCount: 0, noUsers: true });

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normal response with good matches
    const response = {
      matches: sortedMatches,
      totalFound: sortedMatches.length,
      message: `Found ${sortedMatches.length} compatible user${sortedMatches.length > 1 ? 's' : ''}!`,
      appUrl,
      searchCriteria: {
        topic: sanitizedTopic,
        mood: sanitizedMood,
        conversationType: sanitizedType
      }
    };

    await logApiCall(userId, '/gpt-api-find-matches', req.method, 200, requestBody, { matchCount: sortedMatches.length });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt-api-find-matches:', error);
    await logApiCall('unknown', '/gpt-api-find-matches', req.method, 500, null, null, error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
