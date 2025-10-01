import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, LogOut, Calendar } from "lucide-react";
import ApplyDialog from "@/components/ApplyDialog";

interface Job {
  id: string;
  title: string;
  job_description: string;
  created_at: string;
}

interface Application {
  id: string;
  job_id: string;
  decision: string | null;
  match_score: number | null;
  submitted_at: string;
  jobs: {
    title: string;
  };
}

const CandidateDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
      return;
    }

    setJobs(data || []);
  };

  const fetchApplications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("candidates")
      .select("id, job_id, decision, match_score, submitted_at, jobs(title)")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
      return;
    }

    setApplications(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const hasApplied = (jobId: string) => {
    return applications.some(app => app.job_id === jobId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Job Portal</h1>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {applications.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">My Applications</h2>
            <div className="grid gap-4">
              {applications.map((app) => (
                <Card key={app.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{app.jobs.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <Calendar className="w-4 h-4" />
                          Applied {new Date(app.submitted_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 items-center">
                        {app.match_score && (
                          <Badge variant="outline">
                            Match: {app.match_score}%
                          </Badge>
                        )}
                        {app.decision && (
                          <Badge
                            variant={
                              app.decision === "accepted"
                                ? "default"
                                : app.decision === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {app.decision}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-6">Available Jobs</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const applied = hasApplied(job.id);
              return (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      {job.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {job.job_description}
                    </p>
                    {applied ? (
                      <Badge variant="secondary" className="w-full justify-center">
                        Already Applied
                      </Badge>
                    ) : (
                      <ApplyDialog
                        jobId={job.id}
                        onSuccess={() => {
                          fetchApplications();
                          toast({
                            title: "Success",
                            description: "Application submitted successfully!",
                          });
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CandidateDashboard;
