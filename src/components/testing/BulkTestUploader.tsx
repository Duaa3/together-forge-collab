import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { PdfProcessor } from "@/lib/pdf/PdfProcessor";
import { CandidateExtractor } from "@/lib/extraction/CandidateExtractor";
import { Upload, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import testCases from "../../../tests/test-cases/extraction-test-cases.json";

interface BulkUploadProgress {
  stage: string;
  current: number;
  total: number;
  currentFile: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  results: {
    successful: number;
    failed: number;
    details: Array<{
      filename: string;
      status: 'success' | 'error';
      message?: string;
      matchedTestCase?: string;
    }>;
  };
}

export const BulkTestUploader = () => {
  const [progress, setProgress] = useState<BulkUploadProgress>({
    stage: 'Idle',
    current: 0,
    total: 0,
    currentFile: '',
    status: 'idle',
    results: {
      successful: 0,
      failed: 0,
      details: []
    }
  });

  const testFiles = [
    'cv_01_anwar_al-shibli.pdf',
    'cv_02_layla_al-saadi.pdf',
    'cv_03_sahar_al-jabri.pdf',
    'cv_04_duaa_al-kalbani.pdf',
    'cv_05_amal_al-busaidi.pdf',
    'cv_06_basma_al-saadi.pdf',
    'cv_07_saeed_al-jabri-2.pdf',
    'cv_08_samira_al-hinai.pdf'
  ];

  const normalizeSkill = (skill: string): string => {
    return skill.toLowerCase()
      .replace(/[^a-z0-9+#]/g, '')
      .trim();
  };

  const calculateSkillMatch = (extractedSkills: string[], expectedSkills: string[]): number => {
    if (!expectedSkills.length) return 100;
    
    const normalizedExtracted = extractedSkills.map(normalizeSkill);
    const normalizedExpected = expectedSkills.map(normalizeSkill);
    
    let matches = 0;
    for (const expected of normalizedExpected) {
      if (normalizedExtracted.some(extracted => 
        extracted.includes(expected) || expected.includes(extracted)
      )) {
        matches++;
      }
    }
    
    return Math.round((matches / normalizedExpected.length) * 100);
  };

  const findBestTestCaseMatch = (filename: string, parsedData: any) => {
    const matches = testCases.testCases
      .filter(tc => tc.filename === filename)
      .map(testCase => {
        let score = 0;
        
        // Exact filename match
        if (testCase.filename === filename) score += 50;
        
        // Name similarity
        if (parsedData.name && testCase.expectedData.name) {
          const nameMatch = parsedData.name.toLowerCase().includes(testCase.expectedData.name.toLowerCase()) ||
                           testCase.expectedData.name.toLowerCase().includes(parsedData.name.toLowerCase());
          if (nameMatch) score += 20;
        }
        
        // Email match
        if (parsedData.email && parsedData.email === testCase.expectedData.email) {
          score += 15;
        }
        
        // Phone match
        if (parsedData.phone && testCase.expectedData.phone) {
          const normalizedParsed = parsedData.phone.replace(/\D/g, '');
          const normalizedExpected = testCase.expectedData.phone.replace(/\D/g, '');
          if (normalizedParsed === normalizedExpected) score += 10;
        }
        
        // Skills overlap
        const skillMatch = calculateSkillMatch(parsedData.skills || [], testCase.expectedData.skills || []);
        score += (skillMatch / 100) * 5;
        
        return { testCase, score };
      });
    
    matches.sort((a, b) => b.score - a.score);
    return matches[0]?.score > 50 ? matches[0].testCase : null;
  };

  const processSingleFile = async (filename: string, index: number, total: number) => {
    setProgress(prev => ({
      ...prev,
      stage: 'Processing',
      current: index + 1,
      total,
      currentFile: filename
    }));

    try {
      // Fetch PDF from public folder
      const response = await fetch(`/test-cvs/${filename}`);
      if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
      
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Parse PDF
      const pdfProcessor = new PdfProcessor();
      const text = await pdfProcessor.extractText(file);
      
      // Extract candidate data
      const extracted = CandidateExtractor.extract(text, filename);
      
      // Find matching test case
      const matchedTestCase = findBestTestCaseMatch(filename, extracted);
      
      if (!matchedTestCase) {
        throw new Error('No matching test case found');
      }

      // Upload to storage
      const storagePath = `${matchedTestCase.id}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('test-cvs')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Insert into database
      const { error: dbError } = await supabase
        .from('test_cv_files')
        .upsert({
          filename: filename,
          test_case_id: matchedTestCase.id,
          storage_path: storagePath,
          extracted_name: extracted.name || null,
          extracted_email: extracted.email || null,
          extracted_phone: extracted.phone || null,
          extracted_skills: extracted.skills || [],
          match_confidence: 95,
          validation_status: 'pending'
        }, {
          onConflict: 'filename'
        });

      if (dbError) throw dbError;

      setProgress(prev => ({
        ...prev,
        results: {
          successful: prev.results.successful + 1,
          failed: prev.results.failed,
          details: [
            ...prev.results.details,
            {
              filename,
              status: 'success',
              matchedTestCase: matchedTestCase.id,
              message: `Matched to ${matchedTestCase.id}`
            }
          ]
        }
      }));

      return { success: true, filename };
    } catch (error) {
      console.error(`Error processing ${filename}:`, error);
      
      setProgress(prev => ({
        ...prev,
        results: {
          successful: prev.results.successful,
          failed: prev.results.failed + 1,
          details: [
            ...prev.results.details,
            {
              filename,
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          ]
        }
      }));

      return { success: false, filename, error };
    }
  };

  const startBulkUpload = async () => {
    setProgress({
      stage: 'Starting',
      current: 0,
      total: testFiles.length,
      currentFile: '',
      status: 'running',
      results: {
        successful: 0,
        failed: 0,
        details: []
      }
    });

    toast.info('Starting bulk upload of test CVs...');

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to upload files');
      setProgress(prev => ({ ...prev, status: 'error', stage: 'Authentication failed' }));
      return;
    }

    // Process files sequentially to avoid overwhelming the system
    for (let i = 0; i < testFiles.length; i++) {
      await processSingleFile(testFiles[i], i, testFiles.length);
    }

    setProgress(prev => ({
      ...prev,
      status: 'complete',
      stage: 'Complete',
      current: testFiles.length,
      total: testFiles.length
    }));

    toast.success(`Upload complete! ${progress.results.successful} successful, ${progress.results.failed} failed`);
  };

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Test Data Setup
        </CardTitle>
        <CardDescription>
          Automatically upload and process all {testFiles.length} test CVs from the test dataset
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={startBulkUpload}
          disabled={progress.status === 'running'}
          className="w-full"
          size="lg"
        >
          {progress.status === 'running' ? 'Processing...' : 'Start Bulk Upload'}
        </Button>

        {progress.status !== 'idle' && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.stage}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={progressPercentage} />
              {progress.currentFile && (
                <p className="text-sm text-muted-foreground">Processing: {progress.currentFile}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Success: {progress.results.successful}
              </Badge>
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Failed: {progress.results.failed}
              </Badge>
            </div>

            {progress.results.details.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {progress.results.details.map((detail, idx) => (
                  <Alert key={idx} variant={detail.status === 'success' ? 'default' : 'destructive'}>
                    <AlertDescription className="text-xs flex items-center gap-2">
                      {detail.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      <span className="font-medium">{detail.filename}</span>
                      <span className="text-muted-foreground">
                        {detail.matchedTestCase || detail.message}
                      </span>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </>
        )}

        {progress.status === 'complete' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bulk upload complete! You can now run the extraction tests to measure accuracy.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
