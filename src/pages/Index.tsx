import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { AIChatInterface } from "@/components/chat/AIChatInterface";
import { ConnectionSuggestions } from "@/components/connections/ConnectionSuggestions";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { MessagesHistory } from "@/components/messages/MessagesHistory";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const [currentSection, setCurrentSection] = useState<string>("welcome");
  const [hasStarted, setHasStarted] = useState(false);
  const { user, loading, signOut } = useAuth();

  // Check URL parameters for incoming searches from ChatGPT
  useEffect(() => {
    if (!loading && user) {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const topic = params.get('topic');
      
      if (view === 'connections' || topic) {
        setHasStarted(true);
        setCurrentSection('connections');
        // Clear URL parameters after processing
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [loading, user]);

  // Redirect to auth if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGetStarted = () => {
    setHasStarted(true);
    setCurrentSection("chat");
  };

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (!hasStarted) {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  const renderSection = () => {
    switch (currentSection) {
      case "chat":
        return <AIChatInterface />;
      case "connections":
        return <ConnectionSuggestions />;
      case "profile":
        return <ProfileOverview />;
      case "messages":
        return <MessagesHistory />;
      default:
        return <AIChatInterface />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <Navigation 
          activeSection={currentSection} 
          onSectionChange={handleSectionChange} 
        />
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
      <main className="min-h-[calc(100vh-80px)]">
        {renderSection()}
      </main>
    </div>
  );
};

export default Index;
