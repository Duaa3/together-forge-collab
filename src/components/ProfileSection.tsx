import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, User, FileText, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        // Create profile if doesn't exist
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
    if (!file || !profile) return;

    if (file.type !== "application/pdf") {
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

      // Delete old CV if exists
      if (profile.cv_url) {
        const oldPath = profile.cv_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("cvs").remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new CV
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("cvs")
        .getPublicUrl(filePath);

      // Update profile with CV URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cv_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, cv_url: publicUrl });

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteCV = async () => {
    if (!profile?.cv_url) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete from storage
      const oldPath = profile.cv_url.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("cvs").remove([`${user.id}/${oldPath}`]);
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ cv_url: null })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, cv_url: null });

      toast({
        title: "Success",
        description: "CV deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
          <CardDescription>Upload your resume (PDF, max 5MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.cv_url ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">CV Uploaded</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.cv_url.split("/").pop()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
                    <Upload className="w-4 h-4 mr-2" />
                    View
                  </a>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteCV}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                No CV uploaded yet
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleCVUpload}
                disabled={uploading}
                className="hidden"
                id="cv-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CV
                  </>
                )}
              </Button>
            </div>
          )}
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
