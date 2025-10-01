import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: () => void;
  userId: string;
}

const CreateJobDialog = ({ open, onOpenChange, onJobCreated, userId }: CreateJobDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mandatorySkills, setMandatorySkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const mandatory = mandatorySkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      
      const preferred = preferredSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error } = await supabase.from("jobs").insert({
        user_id: userId,
        title,
        job_description: description,
        mandatory_skills: mandatory,
        preferred_skills: preferred,
      });

      if (error) throw error;

      toast({
        title: "Job created!",
        description: "Your job posting has been created successfully.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setMandatorySkills("");
      setPreferredSkills("");
      onOpenChange(false);
      onJobCreated();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create New Job Posting
          </DialogTitle>
          <DialogDescription>
            Define the job requirements to start screening candidates
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              placeholder="e.g., Senior React Developer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the role, responsibilities, and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mandatory">Mandatory Skills (comma-separated)</Label>
            <Input
              id="mandatory"
              placeholder="e.g., React, TypeScript, Node.js"
              value={mandatorySkills}
              onChange={(e) => setMandatorySkills(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              These skills are required for the position
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred">Preferred Skills (comma-separated)</Label>
            <Input
              id="preferred"
              placeholder="e.g., GraphQL, Docker, AWS"
              value={preferredSkills}
              onChange={(e) => setPreferredSkills(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              These skills are nice to have but not required
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobDialog;
