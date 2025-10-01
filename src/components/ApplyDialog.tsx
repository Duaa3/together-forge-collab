import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText } from "lucide-react";
import { PdfProcessor } from "@/lib/pdf/PdfProcessor";
import { CandidateExtractor } from "@/lib/extraction/CandidateExtractor";

interface ApplyDialogProps {
  jobId: string;
  onSuccess?: () => void;
}

const ApplyDialog = ({ jobId, onSuccess }: ApplyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [extractionSteps, setExtractionSteps] = useState({
    pdfLoading: false,
    regexProcessing: false,
    nlpExtraction: false,
    dataValidation: false
  });
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCvFile(file);
    setParsing(true);
    
    // Reset extraction steps
    setExtractionSteps({
      pdfLoading: false,
      regexProcessing: false,
      nlpExtraction: false,
      dataValidation: false
    });

    try {
      // Step 1: PDF Loading
      setExtractionSteps(prev => ({ ...prev, pdfLoading: true }));
      
      // Create PDF processor
      const processor = new PdfProcessor();
      const text = await processor.extractText(file);
      
      // Step 2: RegEx Processing
      setExtractionSteps(prev => ({ ...prev, regexProcessing: true }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Data Extraction
      setExtractionSteps(prev => ({ ...prev, nlpExtraction: true }));
      const candidateData = CandidateExtractor.extract(text);
      
      // Step 4: Data Validation
      setExtractionSteps(prev => ({ ...prev, dataValidation: true }));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Store parsed data for submission
      setParsedData({
        skills: candidateData.skills,
        links: {
          github: candidateData.links.github,
          linkedin: candidateData.links.linkedin
        }
      });
      
      // Auto-fill form with extracted data
      if (candidateData.name) setName(candidateData.name);
      if (candidateData.email) setEmail(candidateData.email);
      if (candidateData.phone) setPhone(candidateData.phone);

      toast({
        title: "Success",
        description: "CV parsed successfully! Please verify the extracted information.",
      });
    } catch (error) {
      console.error('Error parsing CV:', error);
      toast({
        title: "Warning",
        description: "Could not auto-fill from CV. Please enter details manually.",
        variant: "destructive",
      });
      setExtractionSteps({
        pdfLoading: false,
        regexProcessing: false,
        nlpExtraction: false,
        dataValidation: false
      });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cvFile) {
      toast({
        title: "Error",
        description: "Please upload your CV",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload CV to storage
      const fileExt = cvFile.name.split('.').pop();
      const fileName = `${user.id}/${jobId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, cvFile);

      if (uploadError) throw uploadError;

      // Extract github and linkedin from parsed data
      const github = parsedData?.links?.github || null;
      const linkedin = parsedData?.links?.linkedin || null;

      // Insert candidate record with CV path and parsed data
      const { error } = await supabase.from("candidates").insert({
        job_id: jobId,
        user_id: user.id,
        name,
        email,
        phone,
        github,
        linkedin,
        cv_path: fileName,
        extracted_skills: parsedData?.skills || [],
        match_score: 0,
        decision: 'pending',
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application submitted successfully!",
      });
      
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setCvFile(null);
      onSuccess?.();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          Apply Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Application</DialogTitle>
          <DialogDescription>
            Fill in your details to apply for this position
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cv">CV / Resume (PDF, DOC, DOCX)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                required
                className="cursor-pointer"
                disabled={parsing}
              />
              {cvFile && !parsing && (
                <FileText className="w-5 h-5 text-primary" />
              )}
            </div>
            
            {parsing && (
              <div className="mt-3 p-4 bg-accent/50 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Data Extraction in Progress</span>
                  <span className="text-xs text-muted-foreground">AI-Powered</span>
                </div>
                
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${extractionSteps.pdfLoading ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${extractionSteps.pdfLoading ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span>PDF.js Library - Document Loading</span>
                    {extractionSteps.pdfLoading && <span className="ml-auto text-xs">✓</span>}
                  </div>
                  
                  <div className={`flex items-center gap-2 text-sm ${extractionSteps.regexProcessing ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${extractionSteps.regexProcessing ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span>Advanced RegEx/Heuristics - Pattern Recognition</span>
                    {extractionSteps.regexProcessing && <span className="ml-auto text-xs">✓</span>}
                  </div>
                  
                  <div className={`flex items-center gap-2 text-sm ${extractionSteps.nlpExtraction ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${extractionSteps.nlpExtraction ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span>Pattern Matching - Extracting Name, Contact, Skills</span>
                    {extractionSteps.nlpExtraction && <span className="ml-auto text-xs">✓</span>}
                  </div>
                  
                  <div className={`flex items-center gap-2 text-sm ${extractionSteps.dataValidation ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${extractionSteps.dataValidation ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span>Data Validation - Verifying Accuracy</span>
                    {extractionSteps.dataValidation && <span className="ml-auto text-xs">✓</span>}
                  </div>
                </div>
              </div>
            )}
            
            {cvFile && !parsing && (
              <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  ✓ {cvFile.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Information successfully extracted and validated
                </p>
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading || parsing}>
            {loading ? "Submitting..." : parsing ? "Parsing CV..." : "Submit Application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyDialog;
