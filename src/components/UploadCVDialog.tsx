import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];

interface UploadCVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  job: Job;
  onCandidatesAdded: () => void;
}

const UploadCVDialog = ({ open, onOpenChange, jobId, job, onCandidatesAdded }: UploadCVDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const extractCandidateInfo = (text: string) => {
    // Simple extraction logic (in real app, would use AI/NLP)
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const githubRegex = /github\.com\/[\w-]+/;
    const linkedinRegex = /linkedin\.com\/in\/[\w-]+/;

    const email = text.match(emailRegex)?.[0] || null;
    const phone = text.match(phoneRegex)?.[0] || null;
    const github = text.match(githubRegex)?.[0] ? `https://${text.match(githubRegex)?.[0]}` : null;
    const linkedin = text.match(linkedinRegex)?.[0] ? `https://${text.match(linkedinRegex)?.[0]}` : null;

    // Extract name (first line that looks like a name)
    const lines = text.split("\n").filter(line => line.trim().length > 0);
    const name = lines[0]?.substring(0, 100) || "Unknown Candidate";

    // Extract skills (simple keyword matching)
    const commonSkills = [
      "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++", 
      "SQL", "MongoDB", "AWS", "Docker", "Kubernetes", "Git", "HTML", "CSS",
      "Vue", "Angular", "Express", "Django", "Flask", "Spring", "GraphQL",
      "PostgreSQL", "MySQL", "Redis", "REST API", "CI/CD", "Agile", "Scrum"
    ];

    const extractedSkills = commonSkills.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );

    return { name, email, phone, github, linkedin, extractedSkills };
  };

  const calculateScore = (candidateSkills: string[], mandatorySkills: any, preferredSkills: any) => {
    const mandatory = Array.isArray(mandatorySkills) ? mandatorySkills : [];
    const preferred = Array.isArray(preferredSkills) ? preferredSkills : [];

    let score = 0;
    let mandatoryMatches = 0;
    let preferredMatches = 0;

    // Check mandatory skills (70% weight)
    mandatory.forEach(skill => {
      if (candidateSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))) {
        mandatoryMatches++;
      }
    });

    // Check preferred skills (30% weight)
    preferred.forEach(skill => {
      if (candidateSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))) {
        preferredMatches++;
      }
    });

    if (mandatory.length > 0) {
      score += (mandatoryMatches / mandatory.length) * 70;
    } else {
      score += 70; // If no mandatory skills, give full weight
    }

    if (preferred.length > 0) {
      score += (preferredMatches / preferred.length) * 30;
    } else {
      score += 30; // If no preferred skills, give full weight
    }

    // Decision logic: Accept if score >= 60 and has all mandatory skills
    const hasAllMandatory = mandatory.length === 0 || mandatoryMatches === mandatory.length;
    const decision = score >= 60 && hasAllMandatory ? "accept" : "reject";

    return { score: Math.round(score * 100) / 100, decision };
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one PDF file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of files) {
        // Read file content
        const text = await file.text();
        
        // Extract candidate information
        const { name, email, phone, github, linkedin, extractedSkills } = extractCandidateInfo(text);
        
        // Calculate match score
        const { score, decision } = calculateScore(
          extractedSkills,
          job.mandatory_skills,
          job.preferred_skills
        );

        // Insert candidate into database
        const { error } = await supabase.from("candidates").insert({
          job_id: jobId,
          user_id: user.id,
          name,
          email,
          phone,
          github,
          linkedin,
          extracted_skills: extractedSkills,
          match_score: score,
          decision,
        });

        if (error) throw error;
      }

      toast({
        title: "CVs processed!",
        description: `Successfully processed ${files.length} candidate(s)`,
      });

      setFiles([]);
      onOpenChange(false);
      onCandidatesAdded();
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Candidate CVs</DialogTitle>
          <DialogDescription>
            Select one or more PDF files containing candidate resumes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop PDF files or click to browse
            </p>
            <input
              type="file"
              accept=".pdf,.txt"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="cv-upload"
            />
            <label htmlFor="cv-upload">
              <Button type="button" variant="outline" asChild>
                <span>Select Files</span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Selected Files ({files.length})</h4>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={loading || files.length === 0}>
              {loading ? "Processing..." : `Process ${files.length} CV(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadCVDialog;
