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
import { Textarea } from "@/components/ui/textarea";

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
  const [memoryContent, setMemoryContent] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleConnect = (platformId: string) => {
    if (platformId === "chatgpt-memory") {
      setShowMemoryDialog(true);
    } else {
      toast.success(`Connecting to ${platformId}...`);
    }
  };

  const handleImportMemory = async () => {
    if (!memoryContent.trim()) {
      toast.error("Proszę wkleić treść pamięci z ChatGPT");
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-chatgpt-memory', {
        body: { memoryContent }
      });

      if (error) throw error;

      toast.success("Pamięć ChatGPT została zaimportowana! Twój profil został wzbogacony.");
      setShowMemoryDialog(false);
      setMemoryContent("");
    } catch (error) {
      console.error("Error importing ChatGPT memory:", error);
      toast.error("Nie udało się zaimportować pamięci. Sprawdź czy wkleiłeś prawidłową treść.");
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
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Importuj pamięć z ChatGPT</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Importując swoją pamięć z ChatGPT, wyrażasz zgodę na udostępnienie swoich tematów rozmów i preferencji, aby wzbogacić swój profil Synaps.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Jak to zrobić?</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Otwórz <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ChatGPT</a></li>
                  <li>Kliknij na swoje menu profilu (prawy górny róg)</li>
                  <li>Wybierz "Settings" → "Personalization" → "Memory"</li>
                  <li>Skopiuj całą treść swojej pamięci</li>
                  <li>Wklej ją poniżej</li>
                </ol>
              </div>
              <div className="space-y-2 pt-4">
                <Label htmlFor="memory">Pamięć ChatGPT</Label>
                <Textarea
                  id="memory"
                  placeholder="Wklej tutaj treść swojej pamięci z ChatGPT...&#10;&#10;Przykład:&#10;- Interesujesz się filozofią i literaturą&#10;- Lubisz czytać Camus i Dostojewskiego&#10;- Pracujesz nad projektem związanym z AI"
                  value={memoryContent}
                  onChange={(e) => setMemoryContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Twoja pamięć zostanie użyta wyłącznie do wzbogacenia twojego profilu i nie będzie udostępniana innym użytkownikom.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportMemory} disabled={isImporting}>
              {isImporting ? "Importuję..." : "Importuj pamięć"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
