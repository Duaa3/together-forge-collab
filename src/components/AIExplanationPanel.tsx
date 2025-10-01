import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, TrendingUp, Users, Target } from 'lucide-react';

interface MLScore {
  technical_fit_score: number;
  experience_match_score: number;
  growth_potential_score: number;
  cultural_fit_score: number;
  overall_score: number;
  confidence_interval?: {
    lower: number;
    upper: number;
  };
  feature_importance?: Record<string, number>;
}

interface AIExplanationPanelProps {
  candidateName: string;
  mlScore: MLScore | null;
  reasoning?: string;
}

export const AIExplanationPanel = ({ candidateName, mlScore, reasoning }: AIExplanationPanelProps) => {
  if (!mlScore) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>No AI analysis available for this candidate yet.</p>
        </div>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const dimensions = [
    {
      name: 'Technical Fit',
      score: mlScore.technical_fit_score,
      weight: '35%',
      icon: Target,
      description: 'Match between candidate skills and job requirements'
    },
    {
      name: 'Experience Match',
      score: mlScore.experience_match_score,
      weight: '25%',
      icon: Users,
      description: 'Seniority level and years of experience alignment'
    },
    {
      name: 'Growth Potential',
      score: mlScore.growth_potential_score,
      weight: '20%',
      icon: TrendingUp,
      description: 'Learning velocity and adaptability indicators'
    },
    {
      name: 'Cultural Fit',
      score: mlScore.cultural_fit_score,
      weight: '20%',
      icon: Lightbulb,
      description: 'Communication style and soft skills alignment'
    }
  ];

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">AI Decision Reasoning</h3>
        <p className="text-sm text-muted-foreground">
          Explainable AI analysis for {candidateName}
        </p>
      </div>

      {/* Overall Score */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Overall AI Score</p>
          <p className={`text-3xl font-bold ${getScoreColor(mlScore.overall_score)}`}>
            {mlScore.overall_score.toFixed(1)}
          </p>
          {mlScore.confidence_interval && (
            <p className="text-xs text-muted-foreground mt-1">
              Confidence: {mlScore.confidence_interval.lower.toFixed(1)} - {mlScore.confidence_interval.upper.toFixed(1)}
            </p>
          )}
        </div>
        <Badge variant="outline" className={getScoreBgColor(mlScore.overall_score)}>
          {mlScore.overall_score >= 80 ? 'Strong Match' : mlScore.overall_score >= 60 ? 'Good Match' : 'Weak Match'}
        </Badge>
      </div>

      {/* Dimension Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium">Scoring Dimensions</h4>
        {dimensions.map((dim) => {
          const Icon = dim.icon;
          return (
            <div key={dim.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{dim.name}</span>
                  <Badge variant="secondary" className="text-xs">{dim.weight}</Badge>
                </div>
                <span className={`text-sm font-semibold ${getScoreColor(dim.score)}`}>
                  {dim.score.toFixed(1)}
                </span>
              </div>
              <Progress value={dim.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{dim.description}</p>
            </div>
          );
        })}
      </div>

      {/* Feature Importance */}
      {mlScore.feature_importance && Object.keys(mlScore.feature_importance).length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Key Decision Factors</h4>
          <div className="space-y-2">
            {Object.entries(mlScore.feature_importance)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([feature, importance]) => (
                <div key={feature} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{feature}</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={importance} className="w-24 h-2" />
                    <span className="text-xs font-medium w-12 text-right">{importance.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Reasoning */}
      {reasoning && (
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm">AI Analysis</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{reasoning}</p>
        </div>
      )}

      {/* Improvement Suggestions */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-sm mb-2">To Improve Match Score</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          {mlScore.technical_fit_score < 70 && (
            <li>Acquire more of the required technical skills</li>
          )}
          {mlScore.experience_match_score < 70 && (
            <li>Gain more relevant industry experience</li>
          )}
          {mlScore.growth_potential_score < 70 && (
            <li>Demonstrate continuous learning and adaptability</li>
          )}
          {mlScore.cultural_fit_score < 70 && (
            <li>Highlight soft skills and communication abilities</li>
          )}
        </ul>
      </div>
    </Card>
  );
};
