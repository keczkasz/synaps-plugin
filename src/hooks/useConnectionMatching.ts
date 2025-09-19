import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Connection {
  id: string;
  name: string;
  avatar?: string;
  mood: string;
  interests: string[];
  aiReasoning: string;
  compatibilityScore: number;
  lastActive: string;
  user_id: string;
}

export function useConnectionMatching() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [userIntentions, setUserIntentions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserIntentions();
      fetchConnections();
    }
  }, [user]);

  const fetchUserIntentions = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('current_intentions, connection_goals, last_conversation_topics, interests')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserIntentions(data);
    } catch (error) {
      console.error('Error fetching user intentions:', error);
    }
  };

  const fetchConnections = async () => {
    if (!user) return;

    try {
      // Get all profiles except current user
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .not('display_name', 'is', null);

      if (profiles) {
        const connectionsWithScoring = profiles.map(profile => {
          const compatibilityScore = calculateCompatibility(profile, userIntentions);
          const aiReasoning = generateAIReasoning(profile, userIntentions);
          
          return {
            id: profile.user_id,
            name: profile.display_name || 'Anonymous',
            avatar: profile.avatar_url,
            mood: profile.mood || 'Open to chat',
            interests: profile.interests || [],
            aiReasoning,
            compatibilityScore,
            lastActive: getLastActiveText(profile.updated_at),
            user_id: profile.user_id
          };
        }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

        setConnections(connectionsWithScoring);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompatibility = (profile: any, intentions: any): number => {
    let score = 50; // Base score
    
    if (!intentions) return score;

    // Match interests with conversation topics
    const topicsMatch = intentions.last_conversation_topics?.some((topic: string) =>
      profile.interests?.some((interest: string) => 
        interest.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    if (topicsMatch) score += 30;

    // Match mood compatibility
    if (profile.mood && intentions.connection_goals) {
      const moodCompatibility = getMoodCompatibility(profile.mood, intentions.connection_goals);
      score += moodCompatibility;
    }

    // Interest overlap
    const commonInterests = profile.interests?.filter((interest: string) =>
      intentions.last_conversation_topics?.some((topic: string) =>
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    ).length || 0;
    
    score += Math.min(commonInterests * 10, 20);

    return Math.min(Math.max(score, 10), 99);
  };

  const getMoodCompatibility = (mood: string, connectionGoals: string): number => {
    const moodLower = mood.toLowerCase();
    const goalsLower = connectionGoals.toLowerCase();

    if (goalsLower.includes('support') && moodLower.includes('calm')) return 15;
    if (goalsLower.includes('energy') && moodLower.includes('energetic')) return 15;
    if (goalsLower.includes('creative') && moodLower.includes('creative')) return 15;
    if (goalsLower.includes('learn') && moodLower.includes('focused')) return 15;
    
    return 5;
  };

  const generateAIReasoning = (profile: any, intentions: any): string => {
    if (!intentions?.current_intentions) {
      return `${profile.display_name} shares similar interests and could be a great connection for meaningful conversations.`;
    }

    const commonInterests = profile.interests?.filter((interest: string) =>
      intentions.last_conversation_topics?.some((topic: string) =>
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    ) || [];

    if (commonInterests.length > 0) {
      return `Perfect match! ${profile.display_name} is interested in ${commonInterests.join(', ')} which aligns with your current focus on ${intentions.current_intentions}.`;
    }

    return `${profile.display_name} brings a ${profile.mood} energy and could offer fresh perspectives on ${intentions.current_intentions}.`;
  };

  const getLastActiveText = (updatedAt: string): string => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return 'A while ago';
  };

  return {
    connections,
    userIntentions,
    loading,
    refetch: fetchConnections
  };
}