import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, Shield, BarChart3, Calendar, Zap, Filter, Brain, Target, FileSearch, Mic, Scale } from "lucide-react";
const Index = () => {
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              <span>Aurora Startup Evaluation Platform</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Streamline Your
              <span className="bg-gradient-aurora bg-clip-text text-transparent"> Evaluation Process</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">Manage the complete evaluation journey from a list of startups to your final investment committee. Centralised scoring, scheduling, and analytics in one AI-driven platform.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button size="lg" className="shadow-aurora" asChild>
                <a href="/auth">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/demo">
                  View Demo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              ⚙️ Core Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run a professional startup evaluation process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "200ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Structured Scoring</h3>
              <p className="text-muted-foreground">
                Standardised criteria and weighted scoring across multiple dimensions for consistent startup assessments.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "300ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Pitch Scheduling</h3>
              <p className="text-muted-foreground">
                Automated scheduling system for final 30 startups with calendar integration, reminders, and notifications.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "400ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Real-time Analytics</h3>
              <p className="text-muted-foreground">
                Comprehensive dashboards with progress tracking, score distributions, and evaluation insights.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "500ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Multi-juror workflows with role-based access, transparent feedback sharing, and streamlined coordination.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "600ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Seamless Integrations</h3>
              <p className="text-muted-foreground">
                Connects easily with your current tools — CRM, email, and scheduling platforms — so you don't have to change your stack.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "700ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Secure & Reliable</h3>
              <p className="text-muted-foreground">
                Enterprise-grade security with role-based permissions and safe handling of sensitive evaluation data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              🤖 Advanced Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Smarter startup investing, built for tomorrow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "200ms"
          }}>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-6">
                <Filter className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Dealflow Digest</h3>
              <p className="text-muted-foreground">
                AI curates a shortlist of startups most aligned with your thesis.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "300ms"
          }}>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Smart Evaluation Assistant</h3>
              <p className="text-muted-foreground">
                Summarises juror feedback into clear strengths, risks, and follow-up questions.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "400ms"
          }}>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI-Driven Matchmaking</h3>
              <p className="text-muted-foreground">
                Automatically assigns jurors with explainable scoring, balancing preferences, expertise, and conflicts.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "500ms"
          }}>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-6">
                <FileSearch className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Due Diligence Copilot</h3>
              <p className="text-muted-foreground">
                Benchmarks traction, team experience, and competition, then drafts diligence notes to save hours.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "600ms"
          }}>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-6">
                <Mic className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Pitch Intelligence</h3>
              <p className="text-muted-foreground">
                Real-time pitch call summaries with structured notes and suggested next steps.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "700ms"
          }}>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-6">
                <Scale className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Bias & Benchmark Checks</h3>
              <p className="text-muted-foreground">
                Detects potential bias in evaluations and compares startups to relevant market benchmarks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-aurora p-8 lg:p-12 rounded-2xl shadow-aurora animate-pulse-glow">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Evaluation Process?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join Aurora's streamlined evaluation platform and eliminate spreadsheets forever.
            </p>
            <Button variant="secondary" size="lg" className="shadow-strong text-primary-foreground" asChild>
              <a href="/auth">
                Get Started Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>;
};
export default Index;