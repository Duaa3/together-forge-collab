import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Mail, Phone, Github, Linkedin, Globe, ChevronDown, ChevronUp, Check, X, Trash2, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import UploadCVDialog from "@/components/UploadCVDialog";
import { AIExplanationPanel } from "@/components/AIExplanationPanel";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type MLScoreRow = Database["public"]["Tables"]["ml_scores"]["Row"];

interface MLScore {
  candidate_id: string;
  job_id: string;
  technical_fit_score: number;
  experience_match_score: number;
  growth_potential_score: number;
  cultural_fit_score: number;
  overall_score: number;
  confidence_interval?: { lower: number; upper: number };
  feature_importance?: Record<string, number>;
}

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [mlScores, setMlScores] = useState<Record<string, MLScore>>({});
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [updatingDecision, setUpdatingDecision] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    candidateId: string;
    candidateName: string;
    decision: "accepted" | "rejected";
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    candidateId: string;
    candidateName: string;
  } | null>(null);
  const [deleteJobDialog, setDeleteJobDialog] = useState(false);
  const [changingStatus, setChangingStatus] = useState<Set<string>>(new Set());

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

      // Fetch ML scores for all candidates
      if (candidatesData && candidatesData.length > 0) {
        const { data: scoresData, error: scoresError } = await supabase
          .from("ml_scores")
          .select("*")
          .eq("job_id", jobId);

        if (!scoresError && scoresData) {
          const scoresMap: Record<string, MLScore> = {};
          scoresData.forEach(score => {
            scoresMap[score.candidate_id] = {
              candidate_id: score.candidate_id,
              job_id: score.job_id,
              technical_fit_score: score.technical_fit_score,
              experience_match_score: score.experience_match_score,
              growth_potential_score: score.growth_potential_score,
              cultural_fit_score: score.cultural_fit_score,
              overall_score: score.overall_score,
              confidence_interval: score.confidence_interval as any,
              feature_importance: score.feature_importance as any,
            };
          });
          setMlScores(scoresMap);
        }
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

  const getDecisionBadge = (decision: string | null, score: number | null) => {
    if (decision === "accepted") {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    } else if (decision === "rejected") {
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

  const toggleCandidateExpansion = (candidateId: string) => {
    setExpandedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const handleDecisionClick = (candidateId: string, candidateName: string, decision: "accepted" | "rejected") => {
    setConfirmDialog({
      open: true,
      candidateId,
      candidateName,
      decision,
    });
  };

  const updateCandidateDecision = async () => {
    if (!confirmDialog) return;

    const { candidateId, decision } = confirmDialog;
    setUpdatingDecision(candidateId);

    try {
      const { error } = await supabase
        .from("candidates")
        .update({ decision })
        .eq("id", candidateId);

      if (error) throw error;

      // Optimistic update
      setCandidates(prev =>
        prev.map(c =>
          c.id === candidateId ? { ...c, decision } : c
        )
      );

      // Remove from changingStatus set
      setChangingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });

      toast({
        title: "Success",
        description: `Candidate ${decision === "accepted" ? "accepted" : "rejected"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingDecision(null);
      setConfirmDialog(null);
    }
  };

  const handleDeleteClick = (candidateId: string, candidateName: string) => {
    setDeleteDialog({
      open: true,
      candidateId,
      candidateName,
    });
  };

  const deleteCandidate = async () => {
    if (!deleteDialog) return;

    const { candidateId } = deleteDialog;

    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", candidateId);

      if (error) throw error;

      // Remove from state
      setCandidates(prev => prev.filter(c => c.id !== candidateId));

      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialog(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobId) return;

    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job and all associated candidates deleted successfully",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteJobDialog(false);
    }
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
                <div className="flex gap-2">
                  <Button onClick={() => setUploadOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CVs
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleteJobDialog(true)}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Job
                  </Button>
                </div>
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
            {candidates.map((candidate) => {
              const isExpanded = expandedCandidates.has(candidate.id);
              const mlScore = mlScores[candidate.id];
              
              return (
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
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                          {getDecisionBadge(candidate.decision, candidate.match_score)}
                          
                          <div className="flex gap-2">
                            {(candidate.decision === "pending" || changingStatus.has(candidate.id)) ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 border-success text-success hover:bg-success hover:text-success-foreground"
                                  onClick={() => handleDecisionClick(candidate.id, candidate.name || "Unknown", "accepted")}
                                  disabled={updatingDecision === candidate.id}
                                >
                                  <Check className="w-3 h-3" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleDecisionClick(candidate.id, candidate.name || "Unknown", "rejected")}
                                  disabled={updatingDecision === candidate.id}
                                >
                                  <X className="w-3 h-3" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1"
                                onClick={() => {
                                  setChangingStatus(prev => new Set(prev).add(candidate.id));
                                }}
                              >
                                Change Status
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleDeleteClick(candidate.id, candidate.name || "Unknown")}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          {mlScore ? (
                            <>
                              <div className={`text-3xl font-bold ${getScoreColor(mlScore.overall_score)}`}>
                                {mlScore.overall_score}%
                              </div>
                              <span className="text-xs text-muted-foreground">AI Score</span>
                            </>
                          ) : candidate.match_score !== null ? (
                            <div className={`text-3xl font-bold ${getScoreColor(candidate.match_score)}`}>
                              {candidate.match_score}%
                            </div>
                          ) : null}
                        </div>
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
                      <div className="flex flex-wrap gap-3 pt-4 border-t mb-4">
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

                    {mlScore && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => toggleCandidateExpansion(candidate.id)}
                        >
                          {isExpanded ? (
                            <>
                              Hide AI Analysis
                              <ChevronUp className="w-4 h-4 ml-2" />
                            </>
                          ) : (
                            <>
                              View AI Analysis
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <div className="mt-4">
                            <AIExplanationPanel
                              candidateName={candidate.name || 'Unknown'}
                              mlScore={mlScore}
                              reasoning={mlScore.feature_importance ? JSON.stringify(mlScore.feature_importance) : undefined}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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

      <AlertDialog open={confirmDialog?.open || false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.decision === "accepted" ? "Accept" : "Reject"} Candidate
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog?.decision === "accepted" ? "accept" : "reject"} <strong>{confirmDialog?.candidateName}</strong>? 
              This will update their application status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={updateCandidateDecision}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog?.candidateName}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCandidate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteJobDialog} onOpenChange={setDeleteJobDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{job?.title}</strong>?
              This will permanently delete the job and all {candidates.length} associated candidate{candidates.length !== 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobDetail;
