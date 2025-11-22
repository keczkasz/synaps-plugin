import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Sparkles, Heart, Brain, Target, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<'profiles'>;

export function ProfileOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (data) {
      setProfile(data);
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    }
  };


  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      // Ensure profile exists before updating
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          display_name: existingProfile?.display_name || user.email?.split('@')[0] || 'User'
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile photo updated successfully!",
      });
      
      // Refresh profile data
      await fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getDefaultInsight = (type: string) => {
    const defaults = {
      emotional_patterns: "Continue conversations with your AI companion to discover your emotional patterns and preferences.",
      communication_style: "Your unique communication style will be revealed through ongoing AI conversations.", 
      connection_goals: "Chat with your AI companion to help identify your ideal connection goals and relationship preferences."
    };
    return defaults[type as keyof typeof defaults];
  };

  const getPersonalityTraits = () => {
    return profile?.interests?.slice(0, 3) || ["Deep Thinker", "Authentic", "Growth-Minded"];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />
      {/* Profile Header */}
      <Card className="p-8 shadow-card border-0 bg-gradient-warm">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative">
            <Avatar className="w-32 h-32">
              <AvatarImage src={avatarUrl || "/api/placeholder/200/200"} />
              <AvatarFallback className="bg-gradient-primary text-white text-3xl font-medium">
                {profile?.display_name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <Button 
              size="sm" 
              className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 shadow-floating"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome Back{profile?.display_name ? `, ${profile.display_name}` : ''}!
              </h1>
              <p className="text-muted-foreground">
                Your AI companion is learning more about you with every conversation
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {getPersonalityTraits().map((trait, index) => (
                <Badge key={index} className="rounded-full bg-emotion-creative text-foreground border-0">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* AI Insights */}
      <Card className="p-6 shadow-card border-0 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">AI Insights About You</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-foreground">Emotional Patterns</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getDefaultInsight('emotional_patterns')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-foreground">Communication Style</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getDefaultInsight('communication_style')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-foreground">Connection Goals</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getDefaultInsight('connection_goals')}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6 shadow-card border-0 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-soft">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Connected with Alex Chen</p>
              <p className="text-xs text-muted-foreground">Started a conversation about creative projects</p>
            </div>
            <span className="text-xs text-muted-foreground">2 hours ago</span>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-soft">
            <div className="w-2 h-2 rounded-full bg-emotion-calm"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">AI Session Completed</p>
              <p className="text-xs text-muted-foreground">Explored your current emotional state and goals</p>
            </div>
            <span className="text-xs text-muted-foreground">1 day ago</span>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-soft">
            <div className="w-2 h-2 rounded-full bg-emotion-energetic"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Profile Updated</p>
              <p className="text-xs text-muted-foreground">Added interests in philosophy and creative writing</p>
            </div>
            <span className="text-xs text-muted-foreground">3 days ago</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button className="rounded-2xl px-6 shadow-card">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
        <Button variant="outline" className="rounded-2xl px-6">
          Privacy Settings
        </Button>
      </div>
    </div>
  );
}