import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, Brain, Users } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

// Memoized feature card component
const FeatureCard = memo(({ icon: Icon, title, description, bgColor }: {
  icon: typeof Heart;
  title: string;
  description: string;
  bgColor: string;
}) => (
  <Card className="p-6 shadow-card border-0 bg-card/50 backdrop-blur-sm">
    <div className={`w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center mb-4 mx-auto`}>
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </Card>
));
FeatureCard.displayName = "FeatureCard";

export const WelcomeScreen = memo(function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-primary shadow-floating">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to Synaps
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Connect with others through AI-guided conversations based on your emotions, interests, and goals.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <FeatureCard
            icon={Heart}
            title="Emotional Intelligence"
            description="Our AI understands your current emotional state and needs"
            bgColor="bg-emotion-calm"
          />
          <FeatureCard
            icon={Brain}
            title="Smart Matching"
            description="Find meaningful connections based on compatibility and goals"
            bgColor="bg-emotion-creative"
          />
          <FeatureCard
            icon={Users}
            title="Guided Conversations"
            description="AI helps facilitate meaningful connections and conversations"
            bgColor="bg-emotion-focused"
          />
        </div>

        {/* CTA */}
        <div className="mt-12">
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="px-8 py-4 text-lg font-medium rounded-2xl bg-primary hover:bg-primary/90 shadow-floating transition-all hover:shadow-card"
          >
            Start Your Journey
            <Sparkles className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Begin with a conversation with our AI mediator
          </p>
        </div>
      </div>
    </div>
  );
});