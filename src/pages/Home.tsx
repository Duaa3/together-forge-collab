import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, TrendingUp, Zap, CheckCircle, Brain, Sparkles } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="inline-block mb-6 animate-scale-in">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 animate-pulse-glow">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium gradient-text">AI-Powered Recruitment</span>
            </div>
          </div>
          
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-accent-vibrant rounded-2xl shadow-lg mb-4 animate-float">
            <Briefcase className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold gradient-text leading-tight animate-slide-up">
            CV Screening System
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            AI-Powered recruitment platform that streamlines hiring with intelligent CV screening and automated candidate matching
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button 
              size="lg" 
              variant="premium"
              className="text-lg px-8 py-6 group"
              onClick={() => navigate("/auth")}
            >
              Get Started
              <Sparkles className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
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
      <section className="container mx-auto px-4 py-16 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-primary/50 hover-lift group animate-scale-in">
            <CardHeader>
              <Brain className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>AI-Powered Screening</CardTitle>
              <CardDescription className="text-base">
                Advanced AI algorithms analyze CVs to extract skills, experience, and qualifications automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 hover-lift group animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <Zap className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Automated Matching</CardTitle>
              <CardDescription className="text-base">
                Smart candidate-job matching based on skills, experience, and requirements with real-time scoring
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 hover-lift group animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription className="text-base">
                Comprehensive insights and analytics to make data-driven hiring decisions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* For HR Section */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-5xl mx-auto glassmorphic rounded-2xl p-8 md:p-12 shadow-xl hover-lift">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
                For HR Managers
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Post jobs and manage openings effortlessly</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Review AI-scored candidates with detailed insights</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Track hiring metrics and performance analytics</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Streamline the entire recruitment process</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center animate-float">
              <Users className="w-48 h-48 text-primary/20" />
            </div>
          </div>
        </div>
      </section>

      {/* For Candidates Section */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-5xl mx-auto glassmorphic rounded-2xl p-8 md:p-12 shadow-xl hover-lift">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center order-2 md:order-1 animate-float" style={{ animationDelay: '0.5s' }}>
              <Briefcase className="w-48 h-48 text-primary/20" />
            </div>
            <div className="order-1 md:order-2 animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
                For Job Candidates
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Upload your CV and create your profile</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Browse available job opportunities</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Apply with one click using your uploaded CV</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Track your application status in real-time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">
            Ready to Transform Your Hiring?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join hundreds of companies using AI to find the perfect candidates
          </p>
          <Button 
            size="lg" 
            variant="premium"
            className="text-lg px-12 py-6 group"
            onClick={() => navigate("/auth")}
          >
            Get Started Today
            <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
