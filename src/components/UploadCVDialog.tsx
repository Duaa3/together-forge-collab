import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { PdfProcessor, PdfProcessingProgress } from "@/lib/pdf/PdfProcessor";
import { CandidateExtractor } from "@/lib/extraction/CandidateExtractor";

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
  const [processingProgress, setProcessingProgress] = useState<PdfProcessingProgress | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const extractCandidateInfo = async (file: File) => {
    try {
      console.log(`Processing CV: ${file.name}`);
      
      // Create PDF processor with progress callback
      const processor = new PdfProcessor((progress) => {
        setProcessingProgress(progress);
      });

      // Extract text from PDF using client-side processing
      const text = await processor.extractText(file);
      console.log(`Extracted ${text.length} characters from ${file.name}`);

      // Extract candidate information from text (pass filename for better name extraction)
      const candidateData = CandidateExtractor.extract(text, file.name);
      console.log(`Successfully extracted data from ${file.name}:`, candidateData);
      
      return {
        name: candidateData.name,
        email: candidateData.email || null,
        phone: candidateData.phone || null,
        github: candidateData.links.github || null,
        linkedin: candidateData.links.linkedin || null,
        extractedSkills: candidateData.skills
      };
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      // Fallback to filename-based data
      return {
        name: file.name.replace(/\.(pdf|doc|docx|txt)$/i, ''),
        email: null,
        phone: null,
        github: null,
        linkedin: null,
        extractedSkills: []
      };
    } finally {
      setProcessingProgress(null);
    }
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
    const decision = score >= 60 && hasAllMandatory ? "accepted" : "rejected";

    return { score: Math.round(score * 100) / 100, decision };
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of files) {
        try {
          console.log(`Processing ${file.name}...`);
          
          // Extract candidate information using AI
          const { name, email, phone, github, linkedin, extractedSkills } = await extractCandidateInfo(file);
          
          // Calculate match score
          const { score, decision } = calculateScore(
            extractedSkills,
            job.mandatory_skills,
            job.preferred_skills
          );

          console.log(`${file.name} - Score: ${score}%, Decision: ${decision}`);

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
          successCount++;
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
          failedCount++;
        }
      }

      toast({
        title: "CVs processed!",
        description: `Successfully processed ${successCount} candidate(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
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
              accept=".pdf,.doc,.docx,.txt"
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

          {processingProgress && (
            <div className="p-4 bg-accent/50 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Processing CV...</span>
                <span className="text-xs text-muted-foreground">
                  {processingProgress.stage === 'complete' ? '✓' : `${processingProgress.pagesCurrent}/${processingProgress.pagesTotal}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{processingProgress.message}</p>
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
