import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, LogOut, Plus, BarChart3, Trash2 } from "lucide-react";
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
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    jobId: string;
    jobTitle: string;
  } | null>(null);
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

  const handleDeleteJob = async () => {
    if (!deleteDialog) return;

    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", deleteDialog.jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job and all associated candidates deleted successfully",
      });

      fetchJobs();
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      <header className="glassmorphic border-b sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-accent-vibrant rounded-lg">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">HR Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/analytics')} variant="outline" className="hover-lift">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button onClick={() => setCreateJobOpen(true)} variant="premium">
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="hover-lift">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 animate-slide-up">
          <h2 className="text-3xl font-bold mb-2 gradient-text">Manage Job Postings</h2>
          <p className="text-muted-foreground">Create and review job positions and candidates</p>
        </div>

        {jobs.length === 0 ? (
          <Card className="text-center py-12 hover-lift animate-scale-in">
            <CardContent>
              <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4 animate-float">
                <Briefcase className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job posting to get started</p>
              <Button onClick={() => setCreateJobOpen(true)} variant="premium">
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, index) => (
              <Card 
                key={job.id} 
                className="hover-lift cursor-pointer relative group border-2 hover:border-primary/50 animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialog({
                      open: true,
                      jobId: job.id,
                      jobTitle: job.title,
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 pr-8 group-hover:text-primary transition-colors">
                    <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Briefcase className="w-4 h-4" />
                    </div>
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

      <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog?.jobTitle}</strong>?
              This will permanently delete the job and all associated candidates.
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

export default HRDashboard;
