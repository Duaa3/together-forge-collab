import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import testCases from "../../../tests/test-cases/extraction-test-cases.json";

interface UploadedFile {
  id: string;
  test_case_id: string;
  filename: string;
  storage_path: string;
  uploaded_at: string;
}

export const TestCVUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTestCase) {
      toast({
        title: "Missing information",
        description: "Please select a test case and file",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const filePath = `${selectedTestCase}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('test-cvs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('test_cv_files')
        .insert({
          test_case_id: selectedTestCase,
          filename: file.name,
          storage_path: filePath,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload successful",
        description: `${file.name} uploaded for test case ${selectedTestCase}`,
      });

      setSelectedTestCase("");
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

  const getTestCaseName = (id: string) => {
    const testCase = testCases.testCases.find(tc => tc.id === id);
    return testCase ? `${testCase.id} - ${testCase.description}` : id;
  };

  const uploadedCount = new Set(uploadedFiles.map(f => f.test_case_id)).size;
  const totalRequired = testCases.metadata.requiredMinimum;

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
              Upload CV files for extraction testing ({uploadedCount}/{totalRequired} test cases covered)
            </CardDescription>
          </div>
          <Button onClick={loadUploadedFiles} variant="outline" disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedTestCase} onValueChange={setSelectedTestCase}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select test case" />
            </SelectTrigger>
            <SelectContent>
              {testCases.testCases.map((tc) => (
                <SelectItem key={tc.id} value={tc.id}>
                  {tc.id} - {tc.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedTestCase || uploading}
          >
            {uploading ? "Uploading..." : "Choose File"}
          </Button>
        </div>

        {uploadedFiles.length > 0 && (
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
                        {file.filename}
                      </div>
                    </TableCell>
                    <TableCell>
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
        )}
      </CardContent>
    </Card>
  );
};
