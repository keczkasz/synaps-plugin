import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles, Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Platform {
  id: string;
  name: string;
  icon: any;
  color: string;
  status: "available" | "coming-soon";
  description: string;
}

const platforms: Platform[] = [
  {
    id: "chatgpt-memory",
    name: "ChatGPT Memory",
    icon: MessageSquare,
    color: "text-green-500",
    status: "available",
    description: "Import your ChatGPT conversation memory to enhance your profile and connections",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: MessageSquare,
    color: "text-green-500",
    status: "available",
    description: "Connect with OpenAI's ChatGPT for advanced AI conversations",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: Sparkles,
    color: "text-blue-500",
    status: "available",
    description: "Integrate Google's Gemini AI for intelligent responses",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    status: "coming-soon",
    description: "Connect your Facebook account to sync your social graph",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    status: "coming-soon",
    description: "Link your Instagram to share interests and moments",
  },
];

export function PlatformIntegrations() {
  const [showMemoryDialog, setShowMemoryDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleConnect = (platformId: string) => {
    if (platformId === "chatgpt-memory") {
      setShowMemoryDialog(true);
    } else {
      toast.success(`Connecting to ${platformId}...`);
    }
  };

  const handleImportMemory = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your OpenAI API key");
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-chatgpt-memory', {
        body: { apiKey }
      });

      if (error) throw error;

      toast.success("ChatGPT memory imported successfully! Your profile has been enriched.");
      setShowMemoryDialog(false);
      setApiKey("");
    } catch (error) {
      console.error("Error importing ChatGPT memory:", error);
      toast.error("Failed to import ChatGPT memory. Please check your API key.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-foreground">Platform Integrations</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <Card key={platform.id} className="p-4 hover:shadow-md transition-shadow border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white`}>
                <platform.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{platform.name}</span>
                  <Badge
                    variant={platform.status === "available" ? "secondary" : "outline"}
                    className="text-xs px-2 py-0"
                  >
                    {platform.status === "available" ? "Available" : "Soon"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{platform.description}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="default"
              className="w-full text-xs"
              disabled={platform.status === "coming-soon"}
              onClick={() => handleConnect(platform.id)}
            >
              {platform.status === "available" ? "Connect" : "Coming Soon"}
            </Button>
          </Card>
        ))}
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Import your conversation history to get better match recommendations
        </p>
      </div>

      <AlertDialog open={showMemoryDialog} onOpenChange={setShowMemoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import ChatGPT Memory</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                By importing your ChatGPT conversation memory, you consent to share your past conversation topics and preferences to enhance your Synaps profile.
              </p>
              <p className="text-sm">
                This will help us connect you with more compatible people based on your interests and communication style.
              </p>
              <div className="space-y-2 pt-4">
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is only used once to import memory and is never stored.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportMemory} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import Memory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
