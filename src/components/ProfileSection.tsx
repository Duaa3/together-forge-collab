import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  cv_url: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const ProfileSection = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert([{ user_id: user.id, email: user.email }])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignedCVUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('cvs')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  const handleViewCV = async () => {
    if (!profile?.cv_url) return;
    
    const signedUrl = await getSignedCVUrl(profile.cv_url);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Failed to load CV",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          github_url: profile.github_url,
          linkedin_url: profile.linkedin_url,
          portfolio_url: profile.portfolio_url,
          bio: profile.bio,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      if (profile?.cv_url) {
        const oldPath = profile.cv_url.split('/').slice(-2).join('/');
        await supabase.storage.from('cvs').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path instead of URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cv_url: fileName })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile!, cv_url: fileName });

      toast({
        title: "Success",
        description: "CV uploaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.full_name,
      profile.phone,
      profile.github_url,
      profile.linkedin_url,
      profile.portfolio_url,
      profile.bio,
      profile.skills?.length,
      profile.cv_url,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const completion = calculateCompletion();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Profile Completion</CardTitle>
                <CardDescription>Complete your profile to improve your chances</CardDescription>
              </div>
            </div>
            <Badge variant={completion === 100 ? "default" : "secondary"}>
              {completion}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completion} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your contact details and bio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={profile.full_name || ""}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>Add your professional profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github">GitHub URL</Label>
            <Input
              id="github"
              value={profile.github_url || ""}
              onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
              placeholder="https://github.com/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              value={profile.linkedin_url || ""}
              onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio URL</Label>
            <Input
              id="portfolio"
              value={profile.portfolio_url || ""}
              onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
              placeholder="https://yourportfolio.com"
            />
          </div>
        </CardContent>
      </Card>

      {profile.skills && profile.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>From your uploaded CV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CV Document</CardTitle>
          <CardDescription>Upload or update your resume (PDF only, max 5MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {profile.cv_url ? 'Update CV' : 'Upload CV'}
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleCVUpload}
                  disabled={uploading}
                />
              </label>
            </Button>
            {profile.cv_url && (
              <Button variant="secondary" onClick={handleViewCV}>
                View Current CV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSection;
