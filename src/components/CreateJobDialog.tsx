import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, X } from "lucide-react";

const JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "UI/UX Designer",
  "QA Engineer",
  "Mobile Developer",
  "System Administrator",
  "Other"
];

const COMMON_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Vue.js",
  "Angular",
  "Node.js",
  "Python",
  "Java",
  "C#",
  "C++",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "SQL",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Git",
  "CI/CD",
  "REST API",
  "GraphQL",
  "Microservices",
  "Agile",
  "Scrum"
];

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: () => void;
  userId: string;
}

const CreateJobDialog = ({ open, onOpenChange, onJobCreated, userId }: CreateJobDialogProps) => {
  const [title, setTitle] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mandatorySkills, setMandatorySkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [skillType, setSkillType] = useState<"mandatory" | "preferred" | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addSkill = (skill: string, type: "mandatory" | "preferred") => {
    if (!skill.trim()) return;
    
    if (type === "mandatory") {
      if (!mandatorySkills.includes(skill)) {
        setMandatorySkills([...mandatorySkills, skill]);
      }
    } else {
      if (!preferredSkills.includes(skill)) {
        setPreferredSkills([...preferredSkills, skill]);
      }
    }
  };

  const removeSkill = (skill: string, type: "mandatory" | "preferred") => {
    if (type === "mandatory") {
      setMandatorySkills(mandatorySkills.filter(s => s !== skill));
    } else {
      setPreferredSkills(preferredSkills.filter(s => s !== skill));
    }
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && skillType) {
      addSkill(customSkill, skillType);
      setCustomSkill("");
      setSkillType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalTitle = title === "Other" ? customTitle : title;
      
      if (!finalTitle.trim()) {
        throw new Error("Please provide a job title");
      }

      const { error } = await supabase.from("jobs").insert({
        user_id: userId,
        title: finalTitle,
        job_description: description,
        mandatory_skills: mandatorySkills,
        preferred_skills: preferredSkills,
      });

      if (error) throw error;

      toast({
        title: "Job created!",
        description: "Your job posting has been created successfully.",
      });

      // Reset form
      setTitle("");
      setCustomTitle("");
      setDescription("");
      setMandatorySkills([]);
      setPreferredSkills([]);
      setCustomSkill("");
      setSkillType(null);
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
            <Select value={title} onValueChange={setTitle} required>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a job title" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {JOB_TITLES.map((jobTitle) => (
                  <SelectItem key={jobTitle} value={jobTitle}>
                    {jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {title === "Other" && (
              <Input
                placeholder="Enter custom job title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the role, responsibilities, and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Mandatory Skills</Label>
            <div className="flex gap-2">
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setSkillType("mandatory");
                  } else {
                    addSkill(value, "mandatory");
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select mandatory skills" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {COMMON_SKILLS.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Add Custom Skill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {skillType === "mandatory" && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Enter custom skill"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSkill();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddCustomSkill}>
                  Add
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {mandatorySkills.map((skill) => (
                <Badge key={skill} variant="default" className="gap-1">
                  {skill}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeSkill(skill, "mandatory")}
                  />
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These skills are required for the position
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preferred Skills</Label>
            <div className="flex gap-2">
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setSkillType("preferred");
                  } else {
                    addSkill(value, "preferred");
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select preferred skills" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {COMMON_SKILLS.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Add Custom Skill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {skillType === "preferred" && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Enter custom skill"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSkill();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddCustomSkill}>
                  Add
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {preferredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeSkill(skill, "preferred")}
                  />
                </Badge>
              ))}
            </div>
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
