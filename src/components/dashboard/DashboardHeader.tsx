import { Button } from "@/components/ui/button";
import { Bell, Search, Settings, User } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";

export const DashboardHeader = () => {
  const { profile } = useUserProfile();
  
  return (
    <header className="bg-card border-b border-border shadow-soft">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-aurora rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Aurora Evaluation</h1>
                <p className="text-sm text-muted-foreground">Startup Assessment Platform</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/dashboard" className="text-foreground font-medium hover:text-primary transition-smooth">
                Dashboard
              </a>
              <a href="/sessions" className="text-muted-foreground hover:text-primary transition-smooth">
                Sessions
              </a>
              <a href="/evaluate" className="text-muted-foreground hover:text-primary transition-smooth">
                Evaluate
              </a>
              {profile?.role === 'admin' && (
                <a href="/admin" className="text-muted-foreground hover:text-primary transition-smooth">
                  Admin
                </a>
              )}
              <a href="/startup/1" className="text-muted-foreground hover:text-primary transition-smooth">
                Startups
              </a>
            </nav>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search startups..."
                className="w-80 pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              />
            </div>
            
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button variant="professional" size="sm">
              <User className="w-4 h-4" />
              Profile
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};