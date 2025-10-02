import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import testCases from "../../../tests/test-cases/extraction-test-cases.json";

interface UploadedFile {
  id: string;
  test_case_id: string;
  filename: string;
  storage_path: string;
  uploaded_at: string;
}

interface FilePreview {
  file: File;
  detectedTestCase: string | null;
  status: 'valid' | 'invalid' | 'duplicate';
  message?: string;
}

const detectTestCaseFromFilename = (filename: string): string | null => {
  const pattern = /TC(\d{3})/i;
  const match = filename.match(pattern);
  return match ? `TC${match[1]}` : null;
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

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const previews: FilePreview[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type !== 'application/pdf') {
        previews.push({
          file,
          detectedTestCase: null,
          status: 'invalid',
          message: 'Not a PDF file'
        });
        continue;
      }

      const detectedTestCase = detectTestCaseFromFilename(file.name);
      
      if (!detectedTestCase) {
        previews.push({
          file,
          detectedTestCase: null,
          status: 'invalid',
          message: 'No test case ID found in filename'
        });
        continue;
      }

      const testCaseExists = testCases.testCases.some(tc => tc.id === detectedTestCase);
      if (!testCaseExists) {
        previews.push({
          file,
          detectedTestCase,
          status: 'invalid',
          message: `Test case ${detectedTestCase} not found`
        });
        continue;
      }

      const isDuplicate = uploadedFiles.some(uf => uf.test_case_id === detectedTestCase);
      previews.push({
        file,
        detectedTestCase,
        status: isDuplicate ? 'duplicate' : 'valid',
        message: isDuplicate ? 'Test case already uploaded' : undefined
      });
    }

    setFilePreviews(previews);
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
    const validFiles = filePreviews.filter(fp => fp.status === 'valid' || fp.status === 'duplicate');
    
    if (validFiles.length === 0) {
      toast({
        title: "No valid files",
        description: "Please add files with valid test case IDs in the filename",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let skipCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const preview of validFiles) {
        try {
          const filePath = `${preview.detectedTestCase}/${preview.file.name}`;
          
          // Check if duplicate and skip
          if (preview.status === 'duplicate') {
            skipCount++;
            continue;
          }

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('test-cvs')
            .upload(filePath, preview.file, { upsert: true });

          if (uploadError) throw uploadError;

          // Save metadata to database
          const { error: dbError } = await supabase
            .from('test_cv_files')
            .insert({
              test_case_id: preview.detectedTestCase!,
              filename: preview.file.name,
              storage_path: filePath,
              uploaded_by: user.id,
            });

          if (dbError) throw dbError;
          successCount++;
        } catch (error: any) {
          console.error(`Failed to upload ${preview.file.name}:`, error);
        }
      }

      toast({
        title: "Upload complete",
        description: `${successCount} uploaded, ${skipCount} skipped (duplicates)`,
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

        {/* Naming Convention Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Filename convention:</strong> Include test case ID in your filename (e.g., TC001_john_doe.pdf, standard_cv_tc002.pdf)
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
                  disabled={uploading || !filePreviews.some(fp => fp.status === 'valid')}
                >
                  {uploading ? "Uploading..." : `Upload ${filePreviews.filter(fp => fp.status === 'valid').length} Files`}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Test Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filePreviews.map((preview, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {preview.status === 'valid' && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                        {preview.status === 'duplicate' && (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Duplicate
                          </Badge>
                        )}
                        {preview.status === 'invalid' && (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {preview.file.name}
                      </TableCell>
                      <TableCell>
                        {preview.detectedTestCase ? (
                          <span className="font-medium">{preview.detectedTestCase}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {preview.message}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
