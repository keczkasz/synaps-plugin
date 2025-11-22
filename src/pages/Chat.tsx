import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Phone, Video, MoreHorizontal, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Mock connection data (will be replaced with Supabase)
const mockConnections = {
  "1": { 
    name: "Sarah Chen", 
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b3e2?w=150&h=150&fit=crop&crop=face",
    interests: ["Books", "Writing", "Asian Literature"],
    mood: "Inspired",
    aiReasoning: "You both share a passion for creative writing and literature. Sarah's focus on Asian literature complements your interest in diverse storytelling perspectives."
  },
  "2": { 
    name: "Marcus Johnson", 
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    interests: ["Mindfulness", "Mental Health", "Personal Growth"],
    mood: "Peaceful",
    aiReasoning: "Marcus's expertise in mindfulness aligns with your interest in personal development. You both value meaningful conversations about growth and well-being."
  },
  "3": { 
    name: "Elena Rodriguez", 
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    interests: ["Career Development", "Leadership", "Professional Growth"],
    mood: "Hopeful",
    aiReasoning: "Elena's career transition expertise matches your professional interests. You can exchange valuable insights about leadership and career development."
  },
  "4": { 
    name: "Janek Kluczek", 
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face",
    interests: ["Technology", "Innovation", "Startups"],
    mood: "Energetic", 
    aiReasoning: "Janek's tech background and entrepreneurial spirit align with your innovative thinking. Great for brainstorming and business discussions."
  },
  "5": { 
    name: "Marcus Thompson", 
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    interests: ["Philosophy", "Deep Conversations", "Psychology"],
    mood: "Reflective",
    aiReasoning: "Marcus enjoys deep philosophical discussions and exploring life's big questions, perfect for meaningful intellectual exchanges."
  }
};

const mockMessages = [
  { id: 1, content: "Hey! I saw we matched on interests in philosophy and art. What's been inspiring you lately?", sender: "them", timestamp: "10:30 AM" },
  { id: 2, content: "Hi! I've been really into exploring the intersection of Eastern philosophy and modern art. There's something profound about how mindfulness practices influence creative expression.", sender: "me", timestamp: "10:35 AM" },
  { id: 3, content: "That's fascinating! I've been reading about Japanese aesthetics - the concept of wabi-sabi really resonates with me. Have you encountered it in your explorations?", sender: "them", timestamp: "10:37 AM" },
];

const Chat = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && user) {
      fetchConversationData();
    }
  }, [userId, user]);

  const fetchConversationData = async () => {
    try {
      // First check if userId is a conversation ID or user ID
      let conversationData;
      
      if (userId?.includes('mock-user-')) {
        // Handle mock users - use existing mock data
        const connection = mockConnections[userId.replace('mock-user-', '') as keyof typeof mockConnections];
        if (connection) {
          setOtherUser({
            display_name: connection.name,
            avatar_url: connection.avatar,
            mood: connection.mood,
            interests: connection.interests
          });
          setMessages(mockMessages);
          setLoading(false);
          return;
        }
      }

      // Try to fetch conversation by ID first
      const { data: convById } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (
            id,
            content,
            sender_id,
            created_at
          )
        `)
        .eq('id', userId)
        .single();

      if (convById) {
        conversationData = convById;
      } else {
        // If not found by ID, try to find conversation between current user and the other user
        const { data: convByUsers } = await supabase
          .from('conversations')
          .select(`
            *,
            messages (
              id,
              content,
              sender_id,
              created_at
            )
          `)
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
          .single();

        conversationData = convByUsers;
      }

      if (!conversationData) {
        setLoading(false);
        return;
      }

      setConversation(conversationData);

      // Get the other user's profile
      const otherUserId = conversationData.user1_id === user.id ? conversationData.user2_id : conversationData.user1_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', otherUserId)
        .single();

      setOtherUser(profile);
      setMessages(conversationData.messages || []);

      // Fetch current user's profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setCurrentUserProfile(myProfile);

      // Connection data will be added when connections table is created
      setConnectionData(null);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use mock data if no real conversation found
  const connection = !otherUser && userId ? mockConnections[userId.replace('mock-user-', '') as keyof typeof mockConnections] : null;

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: message.trim()
        });

      if (error) throw error;

      // Add message to local state
      const newMessage = {
        id: `temp-${Date.now()}`,
        content: message.trim(),
        sender_id: user.id,
        created_at: new Date().toISOString()
      };
      
      setMessages([...messages, newMessage]);
      setMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie rozmowy...</p>
        </div>
      </div>
    );
  }

  if (!connection && !otherUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Rozmowa nie została znaleziona</h1>
          <Button onClick={() => navigate("/")}>Powrót do strony głównej</Button>
        </div>
      </div>
    );
  }

  const displayUser = otherUser || connection;
  const displayName = displayUser?.display_name || displayUser?.name;
  const displayAvatar = displayUser?.avatar_url || displayUser?.avatar;
  const displayMood = displayUser?.mood;
  const displayInterests = displayUser?.interests || [];
  const displayReasoning = connectionData?.ai_reasoning || connection?.aiReasoning || `Połączyliśmy was ze względu na wspólne zainteresowania i podobne cele. Mamy nadzieję, że będziecie mieli świetną rozmowę!`;
  
  // Calculate shared interests
  const myInterests = currentUserProfile?.interests || [];
  const theirInterests = displayInterests;
  const sharedInterests = myInterests.filter((interest: string) => 
    theirInterests.some((theirInterest: string) => 
      theirInterest.toLowerCase() === interest.toLowerCase()
    )
  );
  const compatibilityScore = connectionData?.compatibility_score;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback className="bg-gradient-primary text-white">
                  {displayName?.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{displayName}</h1>
                <p className="text-sm text-muted-foreground">Online now</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Matching Context */}
      <Card className="mx-6 mb-4 p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
              AI Connection Insight
              <Badge variant="secondary" className="text-xs">{displayMood}</Badge>
              {compatibilityScore && (
                <Badge variant="default" className="text-xs">
                  {compatibilityScore}% zgodności
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{displayReasoning}</p>
            
            {sharedInterests.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-foreground mb-2">Wspólne zainteresowania:</p>
                <div className="flex flex-wrap gap-1">
                  {sharedInterests.map((interest: string, index: number) => (
                    <Badge key={index} variant="default" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Wszystkie zainteresowania {displayName}:</p>
              <div className="flex flex-wrap gap-1">
                {displayInterests.map((interest: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id || msg.sender === 'me';
            const isAI = msg.sender_id === 'ai-assistant';
            const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.timestamp;
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <Card className={`max-w-md p-4 ${
                  isMe
                    ? 'bg-primary text-primary-foreground' 
                    : isAI
                    ? 'bg-gradient-warm border-primary/20'
                    : 'bg-card border border-border'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-2 ${
                    isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {timestamp}
                  </p>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon" className="rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;