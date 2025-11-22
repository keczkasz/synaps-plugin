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
      const { data: realProfiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .not('display_name', 'is', null);

      // Create mock profiles with diverse names and high compatibility
      const mockProfiles = [
        {
          id: 'mock-1',
          user_id: 'mock-user-1',
          display_name: 'Janek Kluczek',
          avatar_url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face',
          bio: 'Creative writer and culture enthusiast from Poland',
          mood: 'Creative',
          interests: ['Writing', 'Film', 'Culture', 'Asian Literature'],
          current_intentions: 'Exploring creative collaborations',
          connection_goals: 'Meaningful conversations about art and culture',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          user_id: 'mock-user-2',
          display_name: 'Michael Thompson',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
          bio: 'Tech entrepreneur and innovation enthusiast from San Francisco',
          mood: 'Adventurous',
          interests: ['Technology', 'Innovation', 'Startups', 'AI'],
          current_intentions: 'Building the future of tech',
          connection_goals: 'Networking with fellow entrepreneurs',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-3',
          user_id: 'mock-user-3',
          display_name: 'Camille Dubois',
          avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face',
          bio: 'Artist and philosopher from Paris',
          mood: 'Peaceful',
          interests: ['Art', 'Philosophy', 'Literature', 'Poetry'],
          current_intentions: 'Seeking deep intellectual exchanges',
          connection_goals: 'Philosophical discussions and creative inspiration',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-4',
          user_id: 'mock-user-4',
          display_name: 'Liam Henderson',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
          bio: 'Music producer and business strategist from London',
          mood: 'Focused',
          interests: ['Music', 'Football', 'Business', 'Innovation'],
          current_intentions: 'Connecting music and business',
          connection_goals: 'Creative partnerships and strategic discussions',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-5',
          user_id: 'mock-user-5',
          display_name: 'Anna Wiśniewska',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
          bio: 'Travel blogger and food photographer with a passion for exploration',
          mood: 'Inspired',
          interests: ['Travel', 'Food', 'Photography', 'Culture'],
          current_intentions: 'Sharing travel stories and culinary adventures',
          connection_goals: 'Meeting fellow explorers and food enthusiasts',
          updated_at: new Date().toISOString()
        }
      ];

      // Always merge real profiles with mock profiles to ensure there's always content
      const allProfiles = [...(realProfiles || []), ...mockProfiles];

      if (allProfiles.length > 0) {
        const connectionsWithScoring = allProfiles.map(profile => {
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
    // High compatibility for all test users (85-95%)
    const baseScore = 85 + Math.floor(Math.random() * 10);
    
    if (!intentions) return baseScore;

    // Add small bonus for better matching
    let bonus = 0;

    // Match interests with conversation topics
    const topicsMatch = intentions.last_conversation_topics?.some((topic: string) =>
      profile.interests?.some((interest: string) => 
        interest.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    if (topicsMatch) bonus += 5;

    // Interest overlap bonus
    const commonInterests = profile.interests?.filter((interest: string) =>
      intentions.last_conversation_topics?.some((topic: string) =>
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    ).length || 0;
    
    bonus += Math.min(commonInterests * 2, 5);

    return Math.min(baseScore + bonus, 99);
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
    const userTopics = intentions?.last_conversation_topics || [];
    const userInterests = intentions?.interests || [];
    
    // Find common interests between profile and user
    const commonInterests = profile.interests?.filter((interest: string) =>
      userTopics.some((topic: string) =>
        topic.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(topic.toLowerCase())
      ) || userInterests.some((userInt: string) =>
        userInt.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(userInt.toLowerCase())
      )
    ) || [];

    // Specific reasoning based on common interests
    if (commonInterests.length > 0) {
      const interestText = commonInterests.join(' and ');
      return `I see you're both interested in ${interestText}! This is a perfect foundation for conversation. ${profile.display_name} can share their experiences in this field.`;
    }

    // Fallback with mood and general interests
    const firstInterest = profile.interests?.[0] || 'conversations';
    return `${profile.display_name} is someone with a ${profile.mood.toLowerCase()} mindset who loves ${firstInterest}. You can explore these topics together and discover new perspectives!`;
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