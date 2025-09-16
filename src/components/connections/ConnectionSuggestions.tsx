import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MessageCircle, Heart, Sparkles, Users } from "lucide-react";

interface Connection {
  id: string;
  name: string;
  avatar?: string;
  mood: string;
  interests: string[];
  aiReasoning: string;
  compatibilityScore: number;
  lastActive: string;
}

const mockConnections: Connection[] = [
  {
    id: "1",
    name: "Alex Chen",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    mood: "Creative & Reflective",
    interests: ["Art", "Philosophy", "Music"],
    aiReasoning: "You both value deep emotional expression and creative collaboration. Alex is currently exploring artistic projects and seeking meaningful conversations.",
    compatibilityScore: 94,
    lastActive: "2 hours ago"
  },
  {
    id: "2", 
    name: "Maja Rodriguez",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    mood: "Energetic & Goal-focused",
    interests: ["Travel", "Yoga", "Photography"],
    aiReasoning: "Maja shares your drive for personal growth and has a vibrant energy that matches your adventurous spirit. She's passionate about wellness and exploring new cultures.",
    compatibilityScore: 87,
    lastActive: "1 hour ago"
  },
  {
    id: "3",
    name: "Janek Kluczek",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face",
    mood: "Calm & Supportive", 
    interests: ["Psychology", "Books", "Meditation"],
    aiReasoning: "Janek has a gentle, empathetic nature and could provide the emotional support and understanding you're seeking right now. His thoughtful approach to life resonates with your values.",
    compatibilityScore: 91,
    lastActive: "30 minutes ago"
  },
  {
    id: "4",
    name: "Elena Vasquez",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    mood: "Adventurous & Curious",
    interests: ["Photography", "Culture", "Cooking"],
    aiReasoning: "Elena has a vibrant energy and shares your curiosity about the world. She's looking for genuine connections through shared experiences.",
    compatibilityScore: 89,
    lastActive: "15 minutes ago"
  },
  {  
    id: "5",
    name: "Marcus Thompson",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    mood: "Focused & Inspiring",
    interests: ["Technology", "Innovation", "Mentoring"],
    aiReasoning: "Marcus combines technical expertise with emotional intelligence, making him perfect for both professional and personal growth discussions.",
    compatibilityScore: 92,
    lastActive: "1 hour ago"
  }
];

export function ConnectionSuggestions() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary-soft text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          AI Recommendations
        </div>
        <h2 className="text-2xl font-bold text-foreground">Perfect Matches for You</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Based on your recent conversations, here are people who might resonate with your current emotional state and goals.
        </p>
      </div>

      {/* Suggestions - Tinder-style Carousel */}
      <div className="relative">
        <Carousel className="w-full max-w-2xl mx-auto">
          <CarouselContent>
            {mockConnections.map((connection) => (
              <CarouselItem key={connection.id} className="pl-4">
                <Card className="p-6 shadow-card border-0 bg-card/80 backdrop-blur-sm hover:shadow-floating transition-all duration-300 hover:scale-105 cursor-pointer">
                  <div className="flex gap-6">
                    {/* Avatar and basic info */}
                    <div className="flex-shrink-0 space-y-3">
                      <Avatar className="w-20 h-20 ring-4 ring-border/20">
                        <AvatarImage src={connection.avatar} />
                        <AvatarFallback className="bg-gradient-primary text-white text-xl font-medium">
                          {connection.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Compatibility</div>
                        <div className="text-xl font-bold text-primary">{connection.compatibilityScore}%</div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">{connection.name}</h3>
                          <Badge variant="outline" className="rounded-full text-xs bg-emotion-calm border-0">
                            {connection.mood}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">Active {connection.lastActive}</span>
                        
                        {/* Interests */}
                        <div className="flex gap-2 mt-3">
                          {connection.interests.map((interest) => (
                            <Badge key={interest} variant="secondary" className="rounded-full text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      <div className="p-4 rounded-2xl bg-gradient-warm">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-primary mb-1">AI Insight</div>
                            <p className="text-sm text-foreground leading-relaxed">{connection.aiReasoning}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button className="rounded-xl flex-1" size="sm" onClick={() => window.location.href = `/chat/${connection.id}`}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Start Conversation
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl">
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl">
                          <Users className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>
      </div>

      {/* Browse More */}
      <div className="text-center pt-6">
        <Button variant="outline" className="rounded-2xl px-6">
          Browse More Connections
        </Button>
      </div>
    </div>
  );
}