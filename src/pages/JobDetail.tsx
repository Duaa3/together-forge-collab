import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Mail, Phone, Github, Linkedin, Globe } from "lucide-react";
import UploadCVDialog from "@/components/UploadCVDialog";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchJobAndCandidates();
  }, [jobId]);

  const fetchJobAndCandidates = async () => {
    if (!jobId) return;

    try {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("job_id", jobId)
        .order("submitted_at", { ascending: false });

      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);
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

  const getDecisionBadge = (decision: string | null, score: number | null) => {
    if (decision === "accept") {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    } else if (decision === "reject") {
      return (
        <Badge className="bg-destructive text-destructive-foreground">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job not found</h2>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                  <CardDescription className="text-base">{job.job_description}</CardDescription>
                </div>
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CVs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-destructive">Mandatory Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(job.mandatory_skills) && job.mandatory_skills.length > 0 ? (
                      (job.mandatory_skills as string[]).map((skill, idx) => (
                        <Badge key={idx} variant="destructive">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None specified</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-primary">Preferred Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(job.preferred_skills) && job.preferred_skills.length > 0 ? (
                      (job.preferred_skills as string[]).map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-bold">
            Candidates ({candidates.length})
          </h3>
          <p className="text-muted-foreground">Review and filter candidate applications</p>
        </div>

        {candidates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No candidates yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload CVs to start screening candidates for this position
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload First CV
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold mb-1">{candidate.name}</h4>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {candidate.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {candidate.email}
                          </span>
                        )}
                        {candidate.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {candidate.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getDecisionBadge(candidate.decision, candidate.match_score)}
                      {candidate.match_score !== null && (
                        <div className={`text-3xl font-bold mt-2 ${getScoreColor(candidate.match_score)}`}>
                          {candidate.match_score}%
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-semibold mb-2 text-sm">Extracted Skills</h5>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(candidate.extracted_skills) && candidate.extracted_skills.length > 0 ? (
                        (candidate.extracted_skills as string[]).map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No skills extracted</span>
                      )}
                    </div>
                  </div>

                  {(candidate.github || candidate.linkedin || candidate.portfolio) && (
                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                      {candidate.github && (
                        <a
                          href={candidate.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Github className="w-4 h-4" />
                          GitHub
                        </a>
                      )}
                      {candidate.linkedin && (
                        <a
                          href={candidate.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                        </a>
                      )}
                      {candidate.portfolio && (
                        <a
                          href={candidate.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Globe className="w-4 h-4" />
                          Portfolio
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <UploadCVDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        jobId={jobId || ""}
        job={job}
        onCandidatesAdded={fetchJobAndCandidates}
      />
    </div>
  );
};

export default JobDetail;
