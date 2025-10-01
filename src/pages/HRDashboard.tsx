import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, LogOut, Plus } from "lucide-react";
import CreateJobDialog from "@/components/CreateJobDialog";

interface Job {
  id: string;
  title: string;
  job_description: string;
  created_at: string;
}

const HRDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAndJobs();
  }, []);

  const fetchUserAndJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      fetchJobs();
    }
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">HR Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateJobOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Manage Job Postings</h2>
          <p className="text-muted-foreground">Create and review job positions and candidates</p>
        </div>

        {jobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job posting to get started</p>
              <Button onClick={() => setCreateJobOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card 
                key={job.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    {job.title}
                  </CardTitle>
                  <CardDescription>
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {job.job_description}
                  </p>
                  <Button variant="outline" className="w-full" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobs/${job.id}`);
                  }}>
                    View Candidates
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateJobDialog
        open={createJobOpen}
        onOpenChange={setCreateJobOpen}
        onJobCreated={fetchJobs}
        userId={userId}
      />
    </div>
  );
};

export default HRDashboard;
