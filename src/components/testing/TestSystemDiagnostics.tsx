import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Database, Shield, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DiagnosticResult {
  storageHealth: 'checking' | 'healthy' | 'error';
  rlsPolicies: 'checking' | 'active' | 'missing';
  testFilesCount: number;
  lastTestRun?: {
    timestamp: string;
    accuracy: number;
    totalTests: number;
  };
}

export const TestSystemDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult>({
    storageHealth: 'checking',
    rlsPolicies: 'checking',
    testFilesCount: 0
  });
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeStorage = async () => {
    setIsInitializing(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-storage');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Storage initialized successfully!');
        await runDiagnostics();
      } else {
        toast.error(data?.error || 'Failed to initialize storage');
      }
    } catch (error: any) {
      console.error('Storage initialization error:', error);
      toast.error(error.message || 'Failed to initialize storage');
    } finally {
      setIsInitializing(false);
    }
  };

  const runDiagnostics = async () => {
    setDiagnostics({
      storageHealth: 'checking',
      rlsPolicies: 'checking',
      testFilesCount: 0
    });

    // Check storage health
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      const testCvsBucket = buckets?.find(b => b.id === 'test-cvs');
      
      setDiagnostics(prev => ({
        ...prev,
        storageHealth: testCvsBucket && !error ? 'healthy' : 'error'
      }));
    } catch (error) {
      setDiagnostics(prev => ({ ...prev, storageHealth: 'error' }));
    }

    // Check RLS policies (simplified - just check if we can query)
    try {
      const { error } = await supabase
        .from('test_cv_files')
        .select('count')
        .limit(1);
      
      setDiagnostics(prev => ({
        ...prev,
        rlsPolicies: error ? 'missing' : 'active'
      }));
    } catch (error) {
      setDiagnostics(prev => ({ ...prev, rlsPolicies: 'missing' }));
    }

    // Count test files
    try {
      const { count } = await supabase
        .from('test_cv_files')
        .select('*', { count: 'exact', head: true });
      
      setDiagnostics(prev => ({
        ...prev,
        testFilesCount: count || 0
      }));
    } catch (error) {
      console.error('Error counting test files:', error);
    }

    // Get last test run
    try {
      const { data: lastRun } = await supabase
        .from('test_results')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(1)
        .single();

      if (lastRun) {
        const passed = lastRun.passed ? 100 : 0;
        setDiagnostics(prev => ({
          ...prev,
          lastTestRun: {
            timestamp: lastRun.run_at,
            accuracy: passed,
            totalTests: 1
          }
        }));
      }
    } catch (error) {
      // No previous test runs
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Diagnostics
        </CardTitle>
        <CardDescription>
          Real-time health check of testing infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Storage:</span>
            <Badge variant={diagnostics.storageHealth === 'healthy' ? 'default' : 'destructive'}>
              {diagnostics.storageHealth === 'checking' ? 'Checking...' : diagnostics.storageHealth}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">RLS Policies:</span>
            <Badge variant={diagnostics.rlsPolicies === 'active' ? 'default' : 'destructive'}>
              {diagnostics.rlsPolicies === 'checking' ? 'Checking...' : diagnostics.rlsPolicies}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Test Files:</span>
            <Badge variant={diagnostics.testFilesCount > 0 ? 'default' : 'secondary'}>
              {diagnostics.testFilesCount} / 8
            </Badge>
          </div>

          {diagnostics.lastTestRun && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Last Accuracy:</span>
              <Badge variant="default">
                {diagnostics.lastTestRun.accuracy.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={initializeStorage} 
            variant="default" 
            size="sm"
            disabled={isInitializing}
            className="flex-1"
          >
            {isInitializing ? 'Initializing...' : 'Initialize Storage'}
          </Button>
          <Button onClick={runDiagnostics} variant="outline" size="sm" className="flex-1">
            Refresh Diagnostics
          </Button>
        </div>

        {diagnostics.storageHealth === 'error' && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              Storage bucket 'test-cvs' not accessible. Run the bulk upload to initialize.
            </AlertDescription>
          </Alert>
        )}

        {diagnostics.rlsPolicies === 'missing' && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              RLS policies may be misconfigured. Check authentication status.
            </AlertDescription>
          </Alert>
        )}

        {diagnostics.testFilesCount === 0 && diagnostics.storageHealth === 'healthy' && (
          <Alert>
            <AlertDescription className="text-xs">
              No test files uploaded yet. Use the bulk uploader to get started.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
