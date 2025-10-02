import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CVTestRunner } from "@/components/testing/CVTestRunner";
import { TestCVUploader } from "@/components/testing/TestCVUploader";
import { BarChart3, CheckSquare } from "lucide-react";

const TestingDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Testing Dashboard</h1>
        <p className="text-muted-foreground">Validate CV extraction and scoring algorithms</p>
      </div>

      <Tabs defaultValue="extraction" className="space-y-4">
        <TabsList>
          <TabsTrigger value="extraction">Extraction Tests</TabsTrigger>
          <TabsTrigger value="scoring">Scoring Validation</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="extraction" className="space-y-4">
          <TestCVUploader />
          <CVTestRunner />
        </TabsContent>

        <TabsContent value="scoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Scoring Algorithm Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Validate 100% accuracy in candidate scoring decisions
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Batch Processing Stability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Test stability with 50+ CVs processed in batches
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestingDashboard;
