import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CandidateDashboard from "./CandidateDashboard";
import HRDashboard from "./HRDashboard";

const Dashboard = () => {
  const [userRole, setUserRole] = useState<"hr" | "candidate" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/");
      return;
    }
    
    // Fetch user role
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user role",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!roleData) {
      toast({
        title: "Setup Required",
        description: "Please complete your account setup",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      navigate("/");
      return;
    }

    setUserRole(roleData.role as "hr" | "candidate");
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole === "candidate") {
    return <CandidateDashboard />;
  }

  if (userRole === "hr") {
    return <HRDashboard />;
  }

  return null;
};

export default Dashboard;
