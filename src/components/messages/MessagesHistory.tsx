import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  aiInsight: string;
}


export function MessagesHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          last_message_at,
          messages (
            content,
            created_at
          )
        `)
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const formattedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const otherUserId = conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
          
          // Get other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, interests')
            .eq('user_id', otherUserId)
            .single();

          // Get AI connection insight
          const { data: connection } = await supabase
            .from('connections')
            .select('ai_reasoning')
            .or(`and(user_id.eq.${user?.id},connected_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},connected_user_id.eq.${user?.id})`)
            .single();

          const lastMessage = conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1] 
            : null;

          return {
            id: conv.id,
            name: profile?.display_name || 'Unknown User',
            avatar: profile?.avatar_url || '',
            lastMessage: lastMessage?.content || 'No messages yet',
            timestamp: lastMessage ? formatTimestamp(lastMessage.created_at) : formatTimestamp(conv.last_message_at),
            unread: false, // You could implement unread logic here
            aiInsight: connection?.ai_reasoning || `Connected through shared interests in ${profile?.interests?.slice(0, 2).join(' and ') || 'various topics'}`
          };
        })
      );

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">Your conversation history with meaningful connections</p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Messages</h1>
        <p className="text-muted-foreground">Your conversation history with meaningful connections</p>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No conversations yet</p>
          <p className="text-sm text-muted-foreground">Start connecting with people through AI recommendations to begin chatting!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer border border-border/50 bg-card/50 backdrop-blur-sm"
              onClick={() => handleConversationClick(conversation.id)}
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-border/20">
                  <AvatarImage src={conversation.avatar} alt={conversation.name} />
                  <AvatarFallback className="bg-muted">
                    {conversation.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground">{conversation.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                      {conversation.unread && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm truncate mb-2 ${conversation.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {conversation.lastMessage}
                  </p>
                  
                  <p className="text-xs text-muted-foreground/80 truncate">
                    🤖 {conversation.aiInsight}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-sm">
          All conversations are private and secure. Connect with more people through AI recommendations.
        </p>
      </div>
    </div>
  );
}