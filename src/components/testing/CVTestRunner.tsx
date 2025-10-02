import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface TestCase {
  id: string;
  filename: string;
  expectedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
  };
  category: string;
  description: string;
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  fieldResults: {
    name: boolean;
    email: boolean;
    phone: boolean;
    skills: boolean;
  };
  actualData: any;
}

export const CVTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);
    // Test execution logic would go here
    setIsRunning(false);
  };

  const accuracy = results.length > 0
    ? (results.filter(r => r.passed).length / results.length) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>CV Test Runner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={isRunning}>
          {isRunning ? "Running Tests..." : "Run Extraction Tests"}
        </Button>
        
        {isRunning && <Progress value={progress} />}
        
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Overall Accuracy:</span>
              <Badge variant={accuracy >= 95 ? "default" : "destructive"}>
                {accuracy.toFixed(1)}%
              </Badge>
            </div>
            
            <div className="space-y-1">
              {results.map((result) => (
                <div key={result.testCaseId} className="flex items-center gap-2">
                  {result.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">{result.testCaseId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
