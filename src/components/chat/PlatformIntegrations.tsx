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
import { Textarea } from "@/components/ui/textarea";
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
  const [showGeminiDialog, setShowGeminiDialog] = useState(false);
  const [memoryContent, setMemoryContent] = useState("");
  const [geminiMemoryContent, setGeminiMemoryContent] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingGemini, setIsImportingGemini] = useState(false);

  const handleConnect = (platformId: string) => {
    if (platformId === "chatgpt-memory") {
      setShowMemoryDialog(true);
    } else if (platformId === "gemini") {
      setShowGeminiDialog(true);
    } else {
      toast.success(`Connecting to ${platformId}...`);
    }
  };

  const handleImportMemory = async () => {
    if (!memoryContent.trim()) {
      toast.error("Please paste your ChatGPT memory");
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-chatgpt-memory', {
        body: { memoryContent }
      });

      if (error) throw error;

      toast.success("ChatGPT memory imported successfully! Your profile has been enriched.");
      setShowMemoryDialog(false);
      setMemoryContent("");
    } catch (error) {
      console.error("Error importing ChatGPT memory:", error);
      toast.error("Failed to import ChatGPT memory. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportGeminiMemory = async () => {
    if (!geminiMemoryContent.trim()) {
      toast.error("Please paste your Gemini memory");
      return;
    }

    setIsImportingGemini(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-chatgpt-memory', {
        body: { memoryContent: geminiMemoryContent }
      });

      if (error) throw error;

      toast.success("Gemini memory imported successfully! Your profile has been enriched.");
      setShowGeminiDialog(false);
      setGeminiMemoryContent("");
    } catch (error) {
      console.error("Error importing Gemini memory:", error);
      toast.error("Failed to import Gemini memory. Please try again.");
    } finally {
      setIsImportingGemini(false);
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
              <div className="space-y-3">
                <p className="text-sm font-medium">How to import:</p>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Open <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">chat.openai.com</a> in a new tab</li>
                  <li>Click your profile → Settings → Personalization → Memory</li>
                  <li>Copy all the text from the "Memory" section</li>
                  <li>Paste it below</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                By importing your ChatGPT memory, you consent to share your conversation topics and preferences to enhance your Synaps profile and connection matching.
              </p>
              <div className="space-y-2 pt-2">
                <Label htmlFor="memoryContent">ChatGPT Memory</Label>
                <Textarea
                  id="memoryContent"
                  placeholder="Paste your ChatGPT memory content here..."
                  value={memoryContent}
                  onChange={(e) => setMemoryContent(e.target.value)}
                  className="min-h-[150px]"
                />
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

      <AlertDialog open={showGeminiDialog} onOpenChange={setShowGeminiDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Google Gemini Memory</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">How to import:</p>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Open <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">gemini.google.com</a> in a new tab</li>
                  <li>Click your profile icon → Settings → Gemini Memory</li>
                  <li>Copy all the text that Gemini remembers about you</li>
                  <li>Paste it below</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                By importing your Gemini memory, you consent to share your conversation topics and preferences to enhance your Synaps profile and connection matching.
              </p>
              <div className="space-y-2 pt-2">
                <Label htmlFor="geminiMemoryContent">Gemini Memory</Label>
                <Textarea
                  id="geminiMemoryContent"
                  placeholder="Paste your Gemini memory content here..."
                  value={geminiMemoryContent}
                  onChange={(e) => setGeminiMemoryContent(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportGeminiMemory} disabled={isImportingGemini}>
              {isImportingGemini ? "Importing..." : "Import Memory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
