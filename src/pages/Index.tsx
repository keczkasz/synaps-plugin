import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { AIChatInterface } from "@/components/chat/AIChatInterface";
import { ConnectionSuggestions } from "@/components/connections/ConnectionSuggestions";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { MessagesHistory } from "@/components/messages/MessagesHistory";

const Index = () => {
  const [currentSection, setCurrentSection] = useState<string>("welcome");
  const [hasStarted, setHasStarted] = useState(false);

  const handleGetStarted = () => {
    setHasStarted(true);
    setCurrentSection("chat");
  };

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
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
      <Navigation 
        activeSection={currentSection} 
        onSectionChange={handleSectionChange} 
      />
      <main className="min-h-[calc(100vh-80px)]">
        {renderSection()}
      </main>
    </div>
  );
};

export default Index;
