import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
}

export function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI companion here to help you connect with like-minded people. Let's start by understanding how you're feeling today and what you're looking for. How are you doing right now?",
      isAI: true,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isAI: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(inputValue),
        isAI: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    const responses = [
      "I understand you're feeling that way. It sounds like you might benefit from connecting with someone who shares similar experiences. Can you tell me more about what's on your mind?",
      "That's really insightful. Based on what you're sharing, I'm sensing you might enjoy creative collaboration or deep conversations. What kind of connection are you hoping for today?",
      "Thank you for being so open. I'm getting a sense of your emotional landscape. Would you be interested in connecting with someone who has complementary goals or similar challenges?",
      "I appreciate your honesty. It seems like you're in a reflective mood. I might have some perfect matches for meaningful conversations. What draws you to connect with others?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 bg-gradient-warm border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Companion</h2>
            <p className="text-sm text-muted-foreground">Connect with the right person to solve the right problem faster than any tool on Earth</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
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
        ))}
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
            disabled={!inputValue.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}