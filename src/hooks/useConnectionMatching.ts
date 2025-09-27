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

      // Create mock profiles with Polish names and high compatibility
      const mockProfiles = [
        {
          id: 'mock-1',
          user_id: 'mock-user-1',
          display_name: 'Janek Kluczek',
          avatar_url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face',
          bio: 'Technology entrepreneur and startup founder from Krakow',
          mood: 'Energetic',
          interests: ['Technology', 'Asian Literature', 'Startups', 'Innovation'],
          current_intentions: 'Looking for interesting conversations about technology and literature',
          connection_goals: 'Exchanging ideas and creative discussions',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          user_id: 'mock-user-2',
          display_name: 'Katarzyna Nowak',
          avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b3e2?w=150&h=150&fit=crop&crop=face',
          bio: 'Creative writer and book enthusiast from Warsaw',
          mood: 'Inspired',
          interests: ['Writing', 'Asian Literature', 'Books', 'Poetry', 'Philosophy'],
          current_intentions: 'Want to discuss literature and creative writing',
          connection_goals: 'Creative partnerships and deep conversations',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-3',
          user_id: 'mock-user-3',
          display_name: 'Piotr Kowalski',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          bio: 'Mindfulness coach and personal development specialist',
          mood: 'Peaceful',
          interests: ['Mindfulness', 'Meditation', 'Mental Health', 'Philosophy'],
          current_intentions: 'Seeking connections with people on similar growth paths',
          connection_goals: 'Supportive conversations about personal growth',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-4',
          user_id: 'mock-user-4',
          display_name: 'Anna Wiśniewska',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
          bio: 'Career development specialist from Gdansk',
          mood: 'Hopeful',
          interests: ['Career Development', 'Leadership', 'Professional Growth', 'Mentoring'],
          current_intentions: 'Connecting with professionals in transition periods',
          connection_goals: 'Mentoring exchanges and career guidance',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-5',
          user_id: 'mock-user-5',
          display_name: 'Michał Zieliński',
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
          bio: 'Philosopher and psychologist from Wroclaw',
          mood: 'Reflective',
          interests: ['Philosophy', 'Psychology', 'Deep Conversations', 'Asian Literature'],
          current_intentions: 'Exploring life\'s big questions through conversations',
          connection_goals: 'Intellectual exchanges and philosophical discussions',
          updated_at: new Date().toISOString()
        }
      ];

      const profilesData = profiles && profiles.length > 0 ? profiles : mockProfiles;

      if (profilesData) {
        const connectionsWithScoring = profilesData.map(profile => {
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
      const interestText = commonInterests.join(' i ');
      return `Widzę, że oboje jesteście zainteresowani ${interestText}! To doskonała podstawa do rozmowy. ${profile.display_name} może podzielić się swoimi doświadczeniami w tej dziedzinie.`;
    }

    // Fallback with mood and general interests
    const firstInterest = profile.interests?.[0] || 'rozmowy';
    return `${profile.display_name} to osoba z ${profile.mood.toLowerCase()} nastawieniem, która uwielbia ${firstInterest}. Możecie razem eksplorować te tematy i odkrywać nowe perspektywy!`;
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