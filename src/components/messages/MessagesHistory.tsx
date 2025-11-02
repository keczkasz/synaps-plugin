import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  mood: string;
}

export function MessagesHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false });

        if (conversationsError) throw conversationsError;

        const conversationsList = await Promise.all(
          (conversationsData || []).map(async (conv) => {
            const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name, avatar_url, mood')
              .eq('user_id', otherUserId)
              .single();

            const { data: lastMessageData } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              id: conv.id,
              name: profileData?.display_name || 'Unknown User',
              avatar: profileData?.avatar_url || '',
              lastMessage: lastMessageData?.content || 'No messages yet',
              timestamp: lastMessageData?.created_at 
                ? formatDistanceToNow(new Date(lastMessageData.created_at), { addSuffix: true })
                : 'Just now',
              unread: false,
              mood: profileData?.mood || 'Connected'
            };
          })
        );

        setConversations(conversationsList);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  const handleConversationClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">You don't have any conversations yet. Start connecting with people!</p>
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{conversation.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {conversation.mood}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                    {conversation.unread && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
                
                <p className={`text-sm truncate ${conversation.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {conversation.lastMessage}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-sm">
          All conversations are private and secure. Connect with more people through AI recommendations.
        </p>
      </div>
    </div>
  );
}