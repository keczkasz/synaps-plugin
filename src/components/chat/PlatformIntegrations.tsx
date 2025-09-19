import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bot, Hash, Camera, Settings } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  status: 'connected' | 'available' | 'coming-soon';
  description: string;
}

const platforms: Platform[] = [
  {
    id: 'gpt',
    name: 'ChatGPT',
    icon: <Bot className="w-5 h-5" />,
    color: 'bg-emerald-500',
    status: 'available',
    description: 'Import conversations from ChatGPT'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'bg-blue-500',
    status: 'available', 
    description: 'Connect with Google Gemini'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Hash className="w-5 h-5" />,
    color: 'bg-blue-600',
    status: 'coming-soon',
    description: 'Sync Facebook conversations'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Camera className="w-5 h-5" />,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    status: 'coming-soon',
    description: 'Connect Instagram messages'
  }
];

export function PlatformIntegrations() {
  const handleConnect = (platformId: string) => {
    console.log(`Connecting to ${platformId}...`);
    // Placeholder for platform connection logic
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Platform Integrations</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <Card key={platform.id} className="p-4 hover:shadow-md transition-shadow border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center text-white`}>
                {platform.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{platform.name}</span>
                  <Badge 
                    variant={platform.status === 'connected' ? 'default' : platform.status === 'available' ? 'secondary' : 'outline'}
                    className="text-xs px-2 py-0"
                  >
                    {platform.status === 'connected' ? 'Connected' : 
                     platform.status === 'available' ? 'Available' : 'Soon'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{platform.description}</p>
              </div>
            </div>
            
            <Button
              size="sm"
              variant={platform.status === 'connected' ? 'outline' : 'default'}
              className="w-full text-xs"
              disabled={platform.status === 'coming-soon'}
              onClick={() => handleConnect(platform.id)}
            >
              {platform.status === 'connected' ? 'Manage' : 
               platform.status === 'available' ? 'Connect' : 'Coming Soon'}
            </Button>
          </Card>
        ))}
      </div>
      
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Import your conversation history to get better match recommendations
        </p>
      </div>
    </div>
  );
}