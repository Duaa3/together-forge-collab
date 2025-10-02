import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, Users, Target, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

export default function HRAnalyticsDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch candidates with ML scores
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select(`
          *,
          ml_scores (
            technical_fit_score,
            experience_match_score,
            growth_potential_score,
            cultural_fit_score,
            overall_score
          )
        `);

      if (candidatesError) throw candidatesError;

      // Fetch market intelligence
      const { data: marketData, error: marketError } = await supabase
        .from('market_intelligence')
        .select('*')
        .order('demand_score', { ascending: false })
        .limit(10);

      if (marketError) throw marketError;

      // Process analytics
      const processedAnalytics = processAnalyticsData(candidates || [], marketData || []);
      setAnalytics(processedAnalytics);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const processAnalyticsData = (candidates: any[], marketData: any[]) => {
    // Skill distribution
    const skillCounts: Record<string, number> = {};
    candidates.forEach(c => {
      c.extracted_skills?.forEach((skill: string) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // Decision distribution
    const decisionCounts = {
      accepted: candidates.filter(c => c.decision === 'accepted').length,
      rejected: candidates.filter(c => c.decision === 'rejected').length,
      pending: candidates.filter(c => c.decision === 'pending').length,
    };

    // Average scores
    const candidatesWithScores = candidates.filter(c => c.ml_scores && c.ml_scores.length > 0);
    const avgScores = {
      technical: candidatesWithScores.reduce((sum, c) => sum + (c.ml_scores[0]?.technical_fit_score || 0), 0) / candidatesWithScores.length || 0,
      experience: candidatesWithScores.reduce((sum, c) => sum + (c.ml_scores[0]?.experience_match_score || 0), 0) / candidatesWithScores.length || 0,
      growth: candidatesWithScores.reduce((sum, c) => sum + (c.ml_scores[0]?.growth_potential_score || 0), 0) / candidatesWithScores.length || 0,
      cultural: candidatesWithScores.reduce((sum, c) => sum + (c.ml_scores[0]?.cultural_fit_score || 0), 0) / candidatesWithScores.length || 0,
    };

    return {
      totalCandidates: candidates.length,
      topSkills,
      decisionCounts,
      avgScores,
      marketTrends: marketData,
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="text-center mt-8">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  const decisionData = [
    { name: 'Accepted', value: analytics.decisionCounts.accepted },
    { name: 'Rejected', value: analytics.decisionCounts.rejected },
    { name: 'Pending', value: analytics.decisionCounts.pending },
  ];

  const scoreData = [
    { dimension: 'Technical Fit', score: analytics.avgScores.technical },
    { dimension: 'Experience Match', score: analytics.avgScores.experience },
    { dimension: 'Growth Potential', score: analytics.avgScores.growth },
    { dimension: 'Cultural Fit', score: analytics.avgScores.cultural },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
          <p className="text-muted-foreground">Intelligent insights and market analytics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Total Candidates</span>
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.totalCandidates}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Accepted</span>
            </div>
            <p className="text-3xl font-bold mt-2 text-green-600">{analytics.decisionCounts.accepted}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-3xl font-bold mt-2 text-yellow-600">{analytics.decisionCounts.pending}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <p className="text-3xl font-bold mt-2 text-red-600">{analytics.decisionCounts.rejected}</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Skills */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Skills in Candidate Pool</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topSkills}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Decision Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Application Decisions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={decisionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {decisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
