import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  mood: string;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b3e2?w=150&h=150&fit=crop&crop=face",
    lastMessage: "Thanks for the creative collaboration ideas! Looking forward to our project.",
    timestamp: "2 hours ago",
    unread: true,
    mood: "Inspired"
  },
  {
    id: "2", 
    name: "Marcus Johnson",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    lastMessage: "The mindfulness session you recommended really helped. Thank you!",
    timestamp: "1 day ago",
    unread: false,
    mood: "Peaceful"
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    lastMessage: "Your perspective on career transitions was exactly what I needed to hear.",
    timestamp: "3 days ago",
    unread: false,
    mood: "Hopeful"
  },
  {
    id: "4",
    name: "David Kim",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    lastMessage: "Great brainstorming session! Let's schedule a follow-up next week.",
    timestamp: "1 week ago",
    unread: false,
    mood: "Energized"
  },
  {
    id: "5",
    name: "Aisha Patel",
    avatar: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=150&h=150&fit=crop&crop=face",
    lastMessage: "The book recommendation was perfect. Changed my whole perspective.",
    timestamp: "2 weeks ago",
    unread: false,
    mood: "Reflective"
  }
];

export function MessagesHistory() {
  const navigate = useNavigate();

  const handleConversationClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Messages</h1>
        <p className="text-muted-foreground">Your conversation history with meaningful connections</p>
      </div>

      <div className="space-y-4">
        {mockConversations.map((conversation) => (
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