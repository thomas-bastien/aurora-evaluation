import { Button } from "@/components/ui/button";
import { ArrowRight, Star, TrendingUp, Users, Shield, BarChart3, Calendar } from "lucide-react";
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
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">Manage the complete evaluation journey from 100s of startups to your final investment committee. Centralised scoring, scheduling, and analytics in one AI-driven platform.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button size="lg" className="shadow-aurora" asChild>
                <a href="/auth">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Complete Evaluation Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run a professional startup evaluation process
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
                Standardized evaluation criteria with weighted scoring across multiple dimensions for consistent assessment.
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
                Automated scheduling system for final 30 startups with calendar integration and reminder notifications.
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
                Multi-reviewer workflows with role-based access and transparent evaluation processes for VC partners.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-soft hover:shadow-medium transition-smooth animate-fade-in" style={{
            animationDelay: "600ms"
          }}>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Progress Tracking</h3>
              <p className="text-muted-foreground">
                Visual pipeline management from initial screening through final selection and pitch sessions.
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
                Enterprise-grade security with data backup and role-based permissions for sensitive evaluation data.
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
            <Button variant="secondary" size="lg" className="shadow-strong" asChild>
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