import { useState, useCallback, useMemo, lazy, Suspense, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

// Lazy load heavy section components
const AIChatInterface = lazy(() => import("@/components/chat/AIChatInterface").then(m => ({ default: m.AIChatInterface })));
const ConnectionSuggestions = lazy(() => import("@/components/connections/ConnectionSuggestions").then(m => ({ default: m.ConnectionSuggestions })));
const ProfileOverview = lazy(() => import("@/components/profile/ProfileOverview").then(m => ({ default: m.ProfileOverview })));
const MessagesHistory = lazy(() => import("@/components/messages/MessagesHistory").then(m => ({ default: m.MessagesHistory })));

// Section loading component
const SectionLoader = memo(() => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
));
SectionLoader.displayName = "SectionLoader";

// Loading state component
const AuthLoadingState = memo(() => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
));
AuthLoadingState.displayName = "AuthLoadingState";

const Index = () => {
  const [currentSection, setCurrentSection] = useState<string>("welcome");
  const [hasStarted, setHasStarted] = useState(false);
  const { user, loading, signOut } = useAuth();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleGetStarted = useCallback(() => {
    setHasStarted(true);
    setCurrentSection("chat");
  }, []);

  const handleSectionChange = useCallback((section: string) => {
    setCurrentSection(section);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Memoize section rendering for better performance
  const sectionContent = useMemo(() => {
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
  }, [currentSection]);

  // Early returns for auth states
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return <AuthLoadingState />;
  }

  if (!hasStarted) {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

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
        <Suspense fallback={<SectionLoader />}>
          {sectionContent}
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
