import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Search, Settings, User, ChevronDown, Building, Users, LogOut } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const DashboardHeader = () => {
  const { profile } = useUserProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);
  
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
              <a 
                href="/dashboard" 
                className={`font-medium hover:text-primary transition-smooth ${
                  isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Dashboard
              </a>
              <a 
                href="/evaluate" 
                className={`hover:text-primary transition-smooth ${
                  isActive('/evaluate') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Evaluate
              </a>
              <a 
                href="/sessions" 
                className={`hover:text-primary transition-smooth ${
                  isActive('/sessions') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Sessions
              </a>
              
              {/* Ecosystem Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`flex items-center gap-1 hover:text-primary transition-smooth ${
                      isActive('/startup') || isActive('/vc') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Ecosystem
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-card border border-border shadow-elegant">
                  <DropdownMenuItem onClick={() => navigate('/startups')} className="cursor-pointer">
                    <Building className="w-4 h-4 mr-2" />
                    Startups
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/vcs')} className="cursor-pointer">
                    <Users className="w-4 h-4 mr-2" />
                    Investors
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {profile?.role === 'admin' && (
                <a 
                  href="/admin" 
                  className={`hover:text-primary transition-smooth ${
                    isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Admin
                </a>
              )}
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="professional" size="sm">
                  <User className="w-4 h-4" />
                  Profile
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border border-border shadow-elegant">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};