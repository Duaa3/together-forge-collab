import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, TrendingUp, Zap, CheckCircle, Brain } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl shadow-lg mb-4">
            <Briefcase className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            CV Screening System
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            AI-Powered recruitment platform that streamlines hiring with intelligent CV screening and automated candidate matching
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <Brain className="w-12 h-12 text-primary mb-4" />
              <CardTitle>AI-Powered Screening</CardTitle>
              <CardDescription className="text-base">
                Advanced AI algorithms analyze CVs to extract skills, experience, and qualifications automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <Zap className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Automated Matching</CardTitle>
              <CardDescription className="text-base">
                Smart candidate-job matching based on skills, experience, and requirements with real-time scoring
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription className="text-base">
                Comprehensive insights and analytics to make data-driven hiring decisions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* For HR Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto bg-card border rounded-2xl p-8 md:p-12 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                For HR Managers
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Post jobs and manage openings effortlessly</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Review AI-scored candidates with detailed insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Track hiring metrics and performance analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Streamline the entire recruitment process</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <Users className="w-48 h-48 text-primary/20" />
            </div>
          </div>
        </div>
      </section>

      {/* For Candidates Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto bg-card border rounded-2xl p-8 md:p-12 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center order-2 md:order-1">
              <Briefcase className="w-48 h-48 text-primary/20" />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                For Job Candidates
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Upload your CV and create your profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Browse available job opportunities</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Apply with one click using your uploaded CV</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-lg">Track your application status in real-time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your Hiring?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join hundreds of companies using AI to find the perfect candidates
          </p>
          <Button 
            size="lg" 
            className="text-lg px-12 py-6"
            onClick={() => navigate("/auth")}
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
