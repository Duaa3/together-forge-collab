import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface CVQualityMetrics {
  completeness: number;
  writingQuality: number;
  informationDensity: number;
  formatConsistency: number;
  overall: number;
}

interface CVQualityAnalyzerProps {
  text: string;
  onAnalysisComplete?: (metrics: CVQualityMetrics) => void;
}

export const CVQualityAnalyzer = ({ text, onAnalysisComplete }: CVQualityAnalyzerProps) => {
  const [metrics, setMetrics] = useState<CVQualityMetrics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    analyzeCV(text);
  }, [text]);

  const analyzeCV = async (cvText: string) => {
    setIsAnalyzing(true);
    
    try {
      // Analyze completeness - check for essential sections
      const completeness = analyzeCompleteness(cvText);
      
      // Analyze writing quality - check for grammar and coherence
      const writingQuality = analyzeWritingQuality(cvText);
      
      // Analyze information density
      const informationDensity = analyzeInformationDensity(cvText);
      
      // Analyze format consistency
      const formatConsistency = analyzeFormatConsistency(cvText);
      
      // Calculate overall score
      const overall = (completeness + writingQuality + informationDensity + formatConsistency) / 4;
      
      const qualityMetrics: CVQualityMetrics = {
        completeness,
        writingQuality,
        informationDensity,
        formatConsistency,
        overall,
      };
      
      setMetrics(qualityMetrics);
      onAnalysisComplete?.(qualityMetrics);
    } catch (error) {
      console.error('CV analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeCompleteness = (text: string): number => {
    const requiredSections = [
      /contact|email|phone/i,
      /experience|work history|employment/i,
      /education|degree|university/i,
      /skills|technical skills|competencies/i,
    ];
    
    const foundSections = requiredSections.filter(pattern => pattern.test(text));
    return (foundSections.length / requiredSections.length) * 100;
  };

  const analyzeWritingQuality = (text: string): number => {
    let score = 100;
    
    // Check for common issues
    const sentences = text.split(/[.!?]+/);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    
    // Penalize if sentences are too short or too long
    if (avgSentenceLength < 5 || avgSentenceLength > 30) {
      score -= 20;
    }
    
    // Check for excessive repetition
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.4) {
      score -= 20;
    }
    
    // Check for proper capitalization
    const properCapitalization = /^[A-Z]/.test(text) && /[.!?]\s+[A-Z]/.test(text);
    if (!properCapitalization) {
      score -= 10;
    }
    
    return Math.max(0, score);
  };

  const analyzeInformationDensity = (text: string): number => {
    const words = text.split(/\s+/);
    const numbers = (text.match(/\d+/g) || []).length;
    const dates = (text.match(/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/g) || []).length;
    const achievements = (text.match(/achieved|improved|increased|reduced|led|managed|developed/gi) || []).length;
    
    // Calculate density score
    const numbersScore = Math.min((numbers / words.length) * 1000, 30);
    const datesScore = Math.min((dates / words.length) * 2000, 30);
    const achievementsScore = Math.min((achievements / words.length) * 1000, 40);
    
    return numbersScore + datesScore + achievementsScore;
  };

  const analyzeFormatConsistency = (text: string): number => {
    let score = 100;
    
    // Check for consistent date formats
    const dateFormats = [
      (text.match(/\d{4}/g) || []).length,
      (text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || []).length,
      (text.match(/\w+ \d{4}/g) || []).length,
    ];
    
    const maxFormat = Math.max(...dateFormats);
    const inconsistentDates = dateFormats.filter(count => count > 0 && count < maxFormat).length;
    
    if (inconsistentDates > 1) {
      score -= 20;
    }
    
    // Check for consistent bullet points or structure
    const bulletPatterns = [
      (text.match(/^[-•*]/gm) || []).length,
      (text.match(/^\d+\./gm) || []).length,
    ];
    
    const hasBullets = bulletPatterns.some(count => count > 2);
    if (!hasBullets) {
      score -= 15;
    }
    
    return Math.max(0, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getOverallBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-600">Excellent</Badge>;
    if (score >= 60) return <Badge variant="default" className="bg-yellow-600">Good</Badge>;
    if (score >= 40) return <Badge variant="default" className="bg-orange-600">Fair</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  if (isAnalyzing) {
    return (
      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">Analyzing CV quality...</span>
        </div>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">CV Quality Analysis</h3>
        {getOverallBadge(metrics.overall)}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {getScoreIcon(metrics.completeness)}
              <span>Completeness</span>
            </div>
            <span className={getScoreColor(metrics.completeness)}>{metrics.completeness.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.completeness} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {getScoreIcon(metrics.writingQuality)}
              <span>Writing Quality</span>
            </div>
            <span className={getScoreColor(metrics.writingQuality)}>{metrics.writingQuality.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.writingQuality} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {getScoreIcon(metrics.informationDensity)}
              <span>Information Density</span>
            </div>
            <span className={getScoreColor(metrics.informationDensity)}>{metrics.informationDensity.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.informationDensity} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {getScoreIcon(metrics.formatConsistency)}
              <span>Format Consistency</span>
            </div>
            <span className={getScoreColor(metrics.formatConsistency)}>{metrics.formatConsistency.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.formatConsistency} className="h-2" />
        </div>
      </div>

      <div className="pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="font-medium">Overall Score</span>
          <span className={`text-lg font-bold ${getScoreColor(metrics.overall)}`}>
            {metrics.overall.toFixed(0)}%
          </span>
        </div>
      </div>
    </Card>
  );
};
