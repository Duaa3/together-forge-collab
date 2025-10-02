import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import testCases from "../../../tests/test-cases/extraction-test-cases.json";
import { PdfProcessor } from "@/lib/pdf/PdfProcessor";
import { CandidateExtractor } from "@/lib/extraction/CandidateExtractor";

interface TestResult {
  testCaseId: string;
  passed: boolean;
  fieldResults: {
    name: boolean;
    email: boolean;
    phone: boolean;
    skills: boolean;
  };
  expectedData: any;
  actualData: any;
}

const normalizeSkill = (skill: string): string => {
  return skill.toLowerCase().replace(/[.\-\s]/g, '');
};

const compareSkills = (expected: string[], actual: string[]): boolean => {
  const normalizedExpected = expected.map(normalizeSkill);
  const normalizedActual = actual.map(normalizeSkill);
  
  const matchCount = normalizedExpected.filter(skill => 
    normalizedActual.includes(skill)
  ).length;
  
  return matchCount >= normalizedExpected.length * 0.8; // 80% match threshold
};

export const CVTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const testRunId = crypto.randomUUID();
      
      // Get all uploaded test files
      const { data: uploadedFiles, error: filesError } = await supabase
        .from('test_cv_files')
        .select('*');

      if (filesError) throw filesError;

      const testResults: TestResult[] = [];
      const totalTests = uploadedFiles.length;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const testCase = testCases.testCases.find(tc => tc.id === file.test_case_id);
        
        if (!testCase) continue;

        setProgress(((i + 1) / totalTests) * 100);

        try {
          // Download the file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('test-cvs')
            .download(file.storage_path);

          if (downloadError) throw downloadError;

          // Use client-side PDF processor (same as TestCVUploader)
          const processor = new PdfProcessor();
          const fileBlob = new File([fileData], file.filename);
          const text = await processor.extractText(fileBlob);
          
          // Use client-side candidate extractor
          const extracted = CandidateExtractor.extract(text, file.filename);
          
          const parseResult = {
            name: extracted.name || 'Unknown Candidate',
            email: extracted.email || '',
            phone: extracted.phone || '',
            extractedSkills: extracted.skills || []
          };

          // Compare results
          const fieldResults = {
            name: parseResult.name.toLowerCase().includes(testCase.expectedData.name.toLowerCase()) ||
                  testCase.expectedData.name.toLowerCase().includes(parseResult.name.toLowerCase()),
            email: parseResult.email === testCase.expectedData.email,
            phone: parseResult.phone.replace(/\D/g, '').includes(testCase.expectedData.phone.replace(/\D/g, '')),
            skills: compareSkills(testCase.expectedData.skills, parseResult.extractedSkills || [])
          };

          const passed = Object.values(fieldResults).every(v => v);

          const result: TestResult = {
            testCaseId: testCase.id,
            passed,
            fieldResults,
            expectedData: testCase.expectedData,
            actualData: {
              name: parseResult.name,
              email: parseResult.email,
              phone: parseResult.phone,
              skills: parseResult.extractedSkills || []
            }
          };

          testResults.push(result);

          // Save to database
          await supabase.from('test_results').insert({
            test_run_id: testRunId,
            test_case_id: testCase.id,
            passed,
            expected_data: testCase.expectedData,
            actual_data: result.actualData,
            field_results: fieldResults,
            run_by: user.id
          });

        } catch (error: any) {
          console.error(`Test ${file.test_case_id} failed:`, error);
          toast({
            title: `Test ${file.test_case_id} failed`,
            description: error.message,
            variant: "destructive",
          });
        }
      }

      setResults(testResults);
      
      const accuracy = testResults.length > 0
        ? (testResults.filter(r => r.passed).length / testResults.length) * 100
        : 0;

      toast({
        title: "Tests completed",
        description: `Overall accuracy: ${accuracy.toFixed(1)}%`,
        variant: accuracy >= 95 ? "default" : "destructive",
      });

    } catch (error: any) {
      toast({
        title: "Test execution failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      accuracy: results.length > 0 ? (results.filter(r => r.passed).length / results.length) * 100 : 0,
      results: results
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${new Date().toISOString()}.json`;
    a.click();
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
        <div className="flex gap-2">
          <Button onClick={runTests} disabled={isRunning} className="flex-1">
            {isRunning ? "Running Tests..." : "Run Extraction Tests"}
          </Button>
          {results.length > 0 && (
            <Button onClick={exportResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
        
        {isRunning && <Progress value={progress} />}
        
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Overall Accuracy:</span>
              <Badge variant={accuracy >= 95 ? "default" : "destructive"}>
                {accuracy.toFixed(1)}%
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({results.filter(r => r.passed).length}/{results.length} passed)
              </span>
            </div>
            
            <div className="space-y-2">
              {results.map((result) => (
                <Collapsible key={result.testCaseId}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg">
                      {result.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{result.testCaseId}</span>
                      <Badge variant="outline" className="ml-auto">
                        {Object.values(result.fieldResults).filter(v => v).length}/4 fields
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Expected</TableHead>
                            <TableHead>Actual</TableHead>
                            <TableHead>Match</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Name</TableCell>
                            <TableCell>{result.expectedData.name}</TableCell>
                            <TableCell>{result.actualData.name}</TableCell>
                            <TableCell>
                              {result.fieldResults.name ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Email</TableCell>
                            <TableCell>{result.expectedData.email}</TableCell>
                            <TableCell>{result.actualData.email}</TableCell>
                            <TableCell>
                              {result.fieldResults.email ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Phone</TableCell>
                            <TableCell>{result.expectedData.phone}</TableCell>
                            <TableCell>{result.actualData.phone}</TableCell>
                            <TableCell>
                              {result.fieldResults.phone ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Skills</TableCell>
                            <TableCell>{result.expectedData.skills.join(', ')}</TableCell>
                            <TableCell>{result.actualData.skills.join(', ')}</TableCell>
                            <TableCell>
                              {result.fieldResults.skills ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
