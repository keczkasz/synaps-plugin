import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { PlatformIntegrations } from "./PlatformIntegrations";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Message {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
}

export function AIChatInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load conversation history on mount
  useEffect(() => {
    if (user) {
      loadConversationHistory();
    }
  }, [user]);

  const loadConversationHistory = async () => {
    if (!user) return;

    try {
      setIsLoadingHistory(true);
      
      // Get or create AI conversation for this user
      const { data: existingConv } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let convId = existingConv?.id;

      if (!convId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('ai_conversations')
          .insert({ user_id: user.id })
          .select('id')
          .single();

        if (convError) throw convError;
        convId = newConv.id;

        // Add welcome message
        await supabase
          .from('ai_messages')
          .insert({
            conversation_id: convId,
            user_id: user.id,
            content: "Hi! I'm here to help you find the perfect conversation partner. Tell me what's on your mind today, and I'll match you with someone who can truly understand and engage with your thoughts.",
            is_ai: true
          });
      }

      setConversationId(convId);

      // Load message history
      const { data: messagesData, error: messagesError } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (messagesData) {
        const loadedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          content: msg.content,
          isAI: msg.is_ai,
          timestamp: new Date(msg.created_at)
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Show welcome message on error
      setMessages([{
        id: "1",
        content: "Hi! I'm here to help you find the perfect conversation partner. Tell me what's on your mind today, and I'll match you with someone who can truly understand and engage with your thoughts.",
        isAI: true,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isAI: false,
      timestamp: new Date(),
    };

    const currentInput = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: currentInput,
          is_ai: false
        });

      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.isAI ? 'assistant' : 'user',
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: currentInput,
          conversationHistory
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isAI: true,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);

      // Save AI response to database
      await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: data.response,
          is_ai: true
        });

      // Update conversation updated_at timestamp
      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 bg-gradient-warm border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Synaps Connection Assistant</h2>
              <p className="text-sm text-muted-foreground">Connect Your Language Model</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIntegrations(!showIntegrations)}
            className="rounded-xl"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <Collapsible open={showIntegrations} onOpenChange={setShowIntegrations}>
          <CollapsibleContent className="mt-4">
            <PlatformIntegrations />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.isAI ? "justify-start" : "justify-end"}`}
          >
            {message.isAI && (
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary-soft text-primary">
                  <Sparkles className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <Card className={`max-w-md p-4 shadow-soft border-0 ${
              message.isAI 
                ? "bg-card/80 backdrop-blur-sm" 
                : "bg-primary text-primary-foreground shadow-card"
            }`}>
              <p className="text-sm leading-relaxed">{message.content}</p>
              <span className={`text-xs mt-2 block ${
                message.isAI ? "text-muted-foreground" : "text-primary-foreground/70"
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </Card>

            {!message.isAI && (
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  You
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-gradient-soft border-t border-border/50">
        <div className="flex gap-4 max-w-2xl mx-auto">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Share what's on your mind..."
            className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-soft"
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            size="lg"
            className="rounded-2xl px-6 shadow-card"
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}