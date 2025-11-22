import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MessageCircle, Heart, Sparkles, Users, Loader2 } from "lucide-react";
import { useConnectionMatching, type Connection } from "@/hooks/useConnectionMatching";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function ConnectionSuggestions() {
  const { connections, userIntentions, loading } = useConnectionMatching();
  const navigate = useNavigate();
  const [creatingConversation, setCreatingConversation] = useState<string | null>(null);

  // Check for search topic from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const urlTopic = searchParams.get('topic');
  
  // Filter connections by topic if provided
  const filteredConnections = urlTopic
    ? connections.filter(conn => 
        conn.interests.some(interest => 
          interest.toLowerCase().includes(urlTopic.toLowerCase()) ||
          urlTopic.toLowerCase().includes(interest.toLowerCase())
        ) ||
        conn.aiReasoning.toLowerCase().includes(urlTopic.toLowerCase())
      )
    : connections;

  const handleStartConversation = async (connection: Connection) => {
    try {
      setCreatingConversation(connection.id);
      
      // Check if this is a mock user (for testing purposes)
      if (connection.user_id && connection.user_id.startsWith('mock-user-')) {
        // Show a message for demo users
        alert('This is a demo profile for testing. To start real conversations, create another account or invite friends to join!');
        setCreatingConversation(null);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-conversation', {
        body: {
          connectedUserId: connection.user_id,
          aiReasoning: connection.aiReasoning,
          connectionName: connection.name
        }
      });

      if (error) throw error;

      // Navigate to the conversation
      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreatingConversation(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Finding your perfect matches...</span>
        </div>
      </div>
    );
  }
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
          {urlTopic 
            ? `People interested in ${urlTopic}:`
            : userIntentions?.current_intentions 
              ? `Based on your interest in "${userIntentions.current_intentions}", here are your perfect matches:`
              : "Here are people who might be perfect for meaningful conversations."
          }
        </p>
      </div>

      {/* Suggestions - Tinder-style Carousel */}
      {filteredConnections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {urlTopic 
              ? `No matches found for "${urlTopic}" yet. Try different interests!`
              : "No connections available at the moment."}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Carousel className="w-full max-w-2xl mx-auto">
            <CarouselContent>
              {filteredConnections.map((connection) => (
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
                        <Button 
                          className="rounded-xl flex-1" 
                          size="sm" 
                          onClick={() => handleStartConversation(connection)}
                          disabled={creatingConversation === connection.id}
                        >
                          {creatingConversation === connection.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <MessageCircle className="w-4 h-4 mr-2" />
                          )}
                          {creatingConversation === connection.id ? 'Tworzenie...' : 'Start Conversation'}
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
      )}

      {/* Browse More */}
      <div className="text-center pt-6">
        <Button variant="outline" className="rounded-2xl px-6">
          Browse More Connections
        </Button>
      </div>
    </div>
  );
}