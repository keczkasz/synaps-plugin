import { cn } from "@/lib/utils";
import { Button } from "./button";
import { MessageSquare, Users, User, BookOpen, Sparkles } from "lucide-react";

interface NavigationProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function Navigation({ activeSection = "chat", onSectionChange }: NavigationProps) {
  const navItems = [
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "connections", label: "Connections", icon: Users },
    { id: "profile", label: "Profile", icon: User },
    { id: "messages", label: "Messages", icon: BookOpen },
  ];

  return (
    <nav className="flex items-center justify-center p-6 bg-gradient-soft border-b border-border/50">
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-card shadow-soft">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onSectionChange?.(item.id)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {item.label}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}