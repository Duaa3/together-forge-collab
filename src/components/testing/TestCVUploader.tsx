import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import testCases from "../../../tests/test-cases/extraction-test-cases.json";
import { PdfProcessor } from "@/lib/pdf/PdfProcessor";
import { CandidateExtractor } from "@/lib/extraction/CandidateExtractor";

interface UploadedFile {
  id: string;
  test_case_id: string;
  filename: string;
  storage_path: string;
  uploaded_at: string;
}

interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  extractedSkills: string[];
}

interface MatchScore {
  testCaseId: string;
  confidence: number;
  matchDetails: {
    nameMatch: boolean;
    emailMatch: boolean;
    phoneMatch: boolean;
    skillsOverlap: number;
  };
}

interface FilePreview {
  file: File;
  status: 'analyzing' | 'auto-matched' | 'suggested' | 'manual' | 'duplicate' | 'error';
  matchedTestCase?: string;
  confidence?: number;
  matchDetails?: MatchScore['matchDetails'];
  parsedCV?: ParsedCV;
  allMatches?: MatchScore[];
  errorMessage?: string;
}

// Helper functions for matching
const normalizeString = (str: string): string => {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

const calculateNameSimilarity = (name1: string, name2: string): number => {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);
  
  if (n1 === n2) return 40;
  if (n1.includes(n2) || n2.includes(n1)) return 20;
  
  const distance = levenshteinDistance(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity > 0.8 ? 20 : 0;
};

const normalizePhone = (phone: string): string => {
  return phone.replace(/[\s\-\(\)\+]/g, '');
};

const calculateSkillsOverlap = (
  extractedSkills: string[], 
  expectedSkills: string[]
): number => {
  if (expectedSkills.length === 0) return 0;
  
  const normalizedExtracted = extractedSkills.map(s => normalizeString(s));
  const normalizedExpected = expectedSkills.map(s => normalizeString(s));
  
  const matches = normalizedExpected.filter(skill =>
    normalizedExtracted.some(extracted => 
      extracted.includes(skill) || skill.includes(extracted)
    )
  );
  
  return (matches.length / normalizedExpected.length) * 100;
};

export const TestCVUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUploadedFiles();
  }, []);

  const loadUploadedFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_cv_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading files",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseCVContent = async (file: File): Promise<ParsedCV> => {
    try {
      // Use client-side PDF processor (same as UploadCVDialog)
      const processor = new PdfProcessor();
      const text = await processor.extractText(file);
      
      // Use client-side candidate extractor
      const extracted = CandidateExtractor.extract(text, file.name);
      
      return {
        name: extracted.name || 'Unknown Candidate',
        email: extracted.email || '',
        phone: extracted.phone || '',
        extractedSkills: extracted.skills || []
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const findBestMatch = (parsedCV: ParsedCV): MatchScore[] => {
    const scores: MatchScore[] = [];
    
    for (const testCase of testCases.testCases) {
      let confidence = 0;
      
      // Name matching (40 points)
      const nameScore = calculateNameSimilarity(
        parsedCV.name || '',
        testCase.expectedData.name
      );
      confidence += nameScore;
      
      // Email matching (20 points)
      let emailMatch = false;
      if (parsedCV.email && testCase.expectedData.email) {
        emailMatch = normalizeString(parsedCV.email) === 
                     normalizeString(testCase.expectedData.email);
        confidence += emailMatch ? 20 : 0;
      }
      
      // Phone matching (15 points)
      let phoneMatch = false;
      if (parsedCV.phone && testCase.expectedData.phone) {
        const phone1 = normalizePhone(parsedCV.phone);
        const phone2 = normalizePhone(testCase.expectedData.phone);
        
        if (phone1 === phone2) {
          confidence += 15;
          phoneMatch = true;
        } else if (phone1.slice(-7) === phone2.slice(-7)) {
          confidence += 10;
          phoneMatch = true;
        }
      }
      
      // Skills overlap (25 points)
      const skillsScore = calculateSkillsOverlap(
        parsedCV.extractedSkills || [],
        testCase.expectedData.skills
      );
      confidence += (skillsScore / 100) * 25;
      
      scores.push({
        testCaseId: testCase.id,
        confidence: Math.round(confidence),
        matchDetails: {
          nameMatch: nameScore > 0,
          emailMatch,
          phoneMatch,
          skillsOverlap: Math.round(skillsScore)
        }
      });
    }
    
    return scores.sort((a, b) => b.confidence - a.confidence);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const initialPreviews: FilePreview[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type !== 'application/pdf') {
        initialPreviews.push({
          file,
          status: 'error',
          errorMessage: 'Not a PDF file'
        });
        continue;
      }

      initialPreviews.push({
        file,
        status: 'analyzing'
      });
    }

    setFilePreviews(initialPreviews);

    // Process files in parallel
    const processedPreviews = await Promise.all(
      initialPreviews.map(async (preview) => {
        if (preview.status === 'error') return preview;

        try {
          // Parse CV content
          const parsedCV = await parseCVContent(preview.file);
          
          // Find best matches
          const matches = findBestMatch(parsedCV);
          const bestMatch = matches[0];

          // Check for duplicates
          const isDuplicate = uploadedFiles.some(
            uf => uf.test_case_id === bestMatch.testCaseId
          );

          if (isDuplicate) {
            return {
              ...preview,
              status: 'duplicate' as const,
              matchedTestCase: bestMatch.testCaseId,
              confidence: bestMatch.confidence,
              parsedCV,
              allMatches: matches,
              matchDetails: bestMatch.matchDetails
            };
          }

          // Determine status based on confidence
          if (bestMatch.confidence >= 90) {
            return {
              ...preview,
              status: 'auto-matched' as const,
              matchedTestCase: bestMatch.testCaseId,
              confidence: bestMatch.confidence,
              parsedCV,
              allMatches: matches,
              matchDetails: bestMatch.matchDetails
            };
          } else if (bestMatch.confidence >= 70) {
            return {
              ...preview,
              status: 'suggested' as const,
              matchedTestCase: bestMatch.testCaseId,
              confidence: bestMatch.confidence,
              parsedCV,
              allMatches: matches,
              matchDetails: bestMatch.matchDetails
            };
          } else {
            return {
              ...preview,
              status: 'manual' as const,
              confidence: bestMatch.confidence,
              parsedCV,
              allMatches: matches
            };
          }
        } catch (error: any) {
          console.error(`Failed to parse ${preview.file.name}:`, error);
          return {
            ...preview,
            status: 'error' as const,
            errorMessage: error.message || 'Failed to parse CV'
          };
        }
      })
    );

    setFilePreviews(processedPreviews);
  };

  const handleTestCaseChange = (index: number, testCaseId: string) => {
    setFilePreviews(prev => {
      const updated = [...prev];
      const isDuplicate = uploadedFiles.some(uf => uf.test_case_id === testCaseId);
      
      updated[index] = {
        ...updated[index],
        matchedTestCase: testCaseId,
        status: isDuplicate ? 'duplicate' as const : updated[index].status
      };
      
      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleBatchUpload = async () => {
    const validFiles = filePreviews.filter(
      fp => fp.matchedTestCase && 
            (fp.status === 'auto-matched' || fp.status === 'suggested' || fp.status === 'manual')
    );
    
    if (validFiles.length === 0) {
      toast({
        title: "No valid files",
        description: "Please ensure all files have matched test cases",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let skipCount = 0;
    const errors: Array<{ file: string; error: string; step: string }> = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Pre-upload validation and logging
      console.group('📤 Batch Upload Started');
      console.log('Total files to upload:', validFiles.length);
      console.table(validFiles.map(f => ({
        filename: f.file.name,
        testCase: f.matchedTestCase,
        confidence: f.confidence
      })));
      console.groupEnd();

      for (const preview of validFiles) {
        const filename = preview.file.name;
        console.log(`\n🔄 Processing: ${filename}`);
        
        try {
          // Safety check
          if (!preview.matchedTestCase) {
            throw new Error('No test case selected');
          }

          const filePath = `${preview.matchedTestCase}/${preview.file.name}`;
          console.log(`  ├─ Storage path: ${filePath}`);
          
          // Upload to storage
          console.log(`  ├─ Uploading to storage...`);
          const { error: uploadError } = await supabase.storage
            .from('test-cvs')
            .upload(filePath, preview.file, { upsert: true });

          if (uploadError) {
            console.error(`  ├─ ❌ Storage upload failed:`, uploadError);
            throw new Error(`Storage: ${uploadError.message || JSON.stringify(uploadError)}`);
          }
          console.log(`  ├─ ✅ Storage upload successful`);

          // Save metadata to database
          console.log(`  ├─ Saving to database...`);
          const { error: dbError } = await supabase
            .from('test_cv_files')
            .insert({
              test_case_id: preview.matchedTestCase,
              filename: preview.file.name,
              storage_path: filePath,
              uploaded_by: user.id,
            });

          if (dbError) {
            console.error(`  ├─ ❌ Database insert failed:`, dbError);
            throw new Error(`Database: ${dbError.message || dbError.code || JSON.stringify(dbError)}`);
          }
          
          console.log(`  └─ ✅ Complete`);
          successCount++;
        } catch (error: any) {
          const errorMsg = error?.message || error?.error_description || String(error);
          console.error(`  └─ ❌ FAILED: ${errorMsg}`);
          console.error('  Full error object:', error);
          
          errors.push({
            file: filename,
            error: errorMsg,
            step: error.message?.includes('Storage') ? 'storage' : 
                  error.message?.includes('Database') ? 'database' : 'unknown'
          });
        }
      }

      const duplicateCount = filePreviews.filter(fp => fp.status === 'duplicate').length;

      // Display detailed results
      console.group('📊 Upload Results');
      console.log('✅ Successful:', successCount);
      console.log('❌ Failed:', errors.length);
      console.log('⏭️ Duplicates skipped:', duplicateCount);
      if (errors.length > 0) {
        console.table(errors);
      }
      console.groupEnd();

      toast({
        title: errors.length > 0 ? "Upload completed with errors" : "Upload complete",
        description: errors.length > 0 
          ? `${successCount} uploaded, ${errors.length} failed. Check console for details.`
          : `${successCount} uploaded${duplicateCount > 0 ? `, ${duplicateCount} skipped (duplicates)` : ''}`,
        variant: errors.length > 0 ? "destructive" : "default",
      });

      setFilePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadUploadedFiles();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('test-cvs')
        .remove([storagePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('test_cv_files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: "Test CV removed successfully",
      });

      await loadUploadedFiles();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadedTestCases = new Set(uploadedFiles.map(f => f.test_case_id));
  const uploadedCount = uploadedTestCases.size;
  const totalTestCases = testCases.testCases.length;
  const coveragePercentage = (uploadedCount / totalTestCases) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Test CVs
            </CardTitle>
            <CardDescription>
              Drop PDF files or click to browse - Test cases auto-detected from filename
            </CardDescription>
          </div>
          <Button onClick={loadUploadedFiles} variant="outline" disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Test Coverage</span>
            <span className="font-medium">{uploadedCount}/{totalTestCases} test cases</span>
          </div>
          <Progress value={coveragePercentage} className="h-2" />
        </div>

        {/* Auto-Detection Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Smart Upload:</strong> Upload any CV with any filename - the system automatically matches it to test cases by analyzing content
          </AlertDescription>
        </Alert>

        {/* Test Case Reference */}
        <Collapsible open={showTestCases} onOpenChange={setShowTestCases}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>📋 View Available Test Cases</span>
              <span className="text-xs text-muted-foreground">{showTestCases ? '▲' : '▼'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto bg-muted/30">
              {testCases.testCases.map((tc) => {
                const isUploaded = uploadedTestCases.has(tc.id);
                return (
                  <div key={tc.id} className="flex items-center gap-2 text-sm">
                    {isUploaded ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className={isUploaded ? "text-muted-foreground line-through" : ""}>
                      <strong>{tc.id}</strong>: {tc.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Drag & Drop Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-2">
            Drag and drop PDF files here
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
          >
            Browse Files
          </Button>
        </div>

        {/* File Preview Table */}
        {filePreviews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Upload Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilePreviews([])}
                  disabled={uploading}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleBatchUpload}
                  disabled={uploading || !filePreviews.some(fp => 
                    (fp.status === 'auto-matched' || fp.status === 'suggested' || fp.status === 'manual') && 
                    fp.matchedTestCase
                  )}
                >
                  {uploading ? "Uploading..." : `Upload ${filePreviews.filter(fp => 
                    (fp.status === 'auto-matched' || fp.status === 'suggested' || fp.status === 'manual') && 
                    fp.matchedTestCase
                  ).length} Files`}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Match Details</TableHead>
                    <TableHead>Test Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filePreviews.map((preview, index) => {
                    const getTestCaseName = (id: string) => {
                      const tc = testCases.testCases.find(t => t.id === id);
                      return tc ? `${tc.id} - ${tc.expectedData.name}` : id;
                    };

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {preview.status === 'analyzing' && (
                            <Badge variant="secondary">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Analyzing
                            </Badge>
                          )}
                          {preview.status === 'auto-matched' && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Auto-matched
                            </Badge>
                          )}
                          {preview.status === 'suggested' && (
                            <Badge variant="default" className="bg-amber-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Suggested
                            </Badge>
                          )}
                          {preview.status === 'manual' && (
                            <Badge variant="secondary">
                              <Info className="h-3 w-3 mr-1" />
                              Manual
                            </Badge>
                          )}
                          {preview.status === 'duplicate' && (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Duplicate
                            </Badge>
                          )}
                          {preview.status === 'error' && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {preview.file.name}
                        </TableCell>
                        <TableCell>
                          {preview.status === 'analyzing' && (
                            <span className="text-xs text-muted-foreground">
                              Parsing CV content...
                            </span>
                          )}
                          {preview.status === 'error' && (
                            <span className="text-xs text-destructive">
                              {preview.errorMessage}
                            </span>
                          )}
                          {(preview.status === 'auto-matched' || preview.status === 'suggested' || preview.status === 'duplicate') && preview.matchDetails && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">
                                  {preview.confidence}% confidence
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div className="flex items-center gap-1">
                                  {preview.matchDetails.nameMatch ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span>Name: {preview.parsedCV?.name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {preview.matchDetails.emailMatch ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span>Email: {preview.parsedCV?.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {preview.matchDetails.phoneMatch ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span>Phone: {preview.parsedCV?.phone || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>Skills: {preview.matchDetails.skillsOverlap}% match ({preview.parsedCV?.extractedSkills?.length || 0} found)</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {preview.status === 'manual' && (
                            <div className="text-xs text-muted-foreground">
                              <div>Best match: {preview.confidence}% confidence</div>
                              <div className="mt-1">Please select manually below</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {preview.status === 'analyzing' && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {preview.status === 'error' && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {(preview.status === 'auto-matched' || preview.status === 'duplicate') && (
                            <span className="font-medium text-sm">
                              {getTestCaseName(preview.matchedTestCase!)}
                            </span>
                          )}
                          {(preview.status === 'suggested' || preview.status === 'manual') && (
                            <Select
                              value={preview.matchedTestCase || ''}
                              onValueChange={(value) => handleTestCaseChange(index, value)}
                            >
                              <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select test case..." />
                              </SelectTrigger>
                              <SelectContent>
                                {preview.allMatches?.slice(0, 5).map((match) => (
                                  <SelectItem key={match.testCaseId} value={match.testCaseId}>
                                    {getTestCaseName(match.testCaseId)} ({match.confidence}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Uploaded Test CVs</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Case</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {file.test_case_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-mono text-xs">{file.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.id, file.storage_path)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
