import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Settings, User, ChevronDown, Building, Users, LogOut, Network, Eye, Shield, CheckCircle, UserCog } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useState } from "react";
import { JurorViewSelectionModal } from "@/components/admin/JurorViewSelectionModal";
export const DashboardHeader = () => {
  const {
    profile
  } = useUserProfile();
  const {
    signOut,
    user
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    viewMode,
    isImpersonating,
    switchToAdminView
  } = useViewMode();
  const [showJurorSelectionModal, setShowJurorSelectionModal] = useState(false);
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);
  return <>
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
              <a href="/dashboard" className={`font-medium hover:text-primary transition-smooth ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
                Dashboard
              </a>
              
              {/* Show Selection Dropdown for Admin/CM users */}
              {profile?.role === 'admin' && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex items-center gap-1 hover:text-primary transition-smooth ${isActive('/selection') ? 'text-primary' : 'text-muted-foreground'}`}>
                      Selection
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-card border border-border shadow-elegant w-80">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-medium text-primary">Community Manager Workflow</p>
                      <p className="text-xs text-muted-foreground">Manage matchmaking, monitor progress, make selections</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate('/selection?round=screening')} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span>Screening Round</span>
                        <span className="text-xs text-muted-foreground">Assign jurors → Monitor evaluations → Select for pitching</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/selection?round=pitching')} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span>Pitching Round</span>
                        <span className="text-xs text-muted-foreground">Re-assign jurors → Monitor pitch calls → Final selections</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>}
              
              {/* Show Evaluate Dropdown for VC users (jurors) */}
              {profile?.role === 'vc' && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex items-center gap-1 hover:text-primary transition-smooth ${isActive('/evaluate') ? 'text-primary' : 'text-muted-foreground'}`}>
                      Evaluate
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-card border border-border shadow-elegant w-80">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-medium text-primary">Juror Workflow</p>
                      <p className="text-xs text-muted-foreground">Evaluate assigned startups only - no selection decisions</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate('/evaluate?round=screening')} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span>Screening Evaluations</span>
                        <span className="text-xs text-muted-foreground">Review pitch decks → Score & provide feedback</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/evaluate?round=pitching')} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span>Pitching Evaluations</span>
                        <span className="text-xs text-muted-foreground">Join pitch calls → Evaluate presentations</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>}
              
              {/* Ecosystem Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-1 hover:text-primary transition-smooth ${isActive('/startup') || isActive('/vc') || isActive('/juror') ? 'text-primary' : 'text-muted-foreground'}`}>
                    Ecosystem
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-card border border-border shadow-elegant">
                  <DropdownMenuItem onClick={() => navigate('/startups')} className="cursor-pointer">
                    <Building className="w-4 h-4 mr-2" />
                    Startups
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/jurors')} className="cursor-pointer">
                    <Users className="w-4 h-4 mr-2" />
                    Jury
                  </DropdownMenuItem>
                  {(profile?.role === 'admin' || profile?.role === 'cm') && <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                      Team Management
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate('/community-managers')} className="cursor-pointer">
                      <UserCog className="w-4 h-4 mr-2" />
                      Community Managers
                    </DropdownMenuItem>
                  </>}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {profile?.role === 'admin'}
            </nav>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input type="text" placeholder="Search startups..." className="w-80 pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth" />
            </div>
            
            
            
            

            {/* View Mode Toggle (Admin Only) */}
            {profile?.role === 'admin' && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="hidden md:inline">
                      {viewMode === 'admin' ? 'Admin View' : 'Juror Preview'}
                    </span>
                    <Badge variant={viewMode === 'admin' ? 'default' : 'secondary'} className={viewMode === 'admin' ? 'bg-primary' : 'bg-warning text-warning-foreground'}>
                      {viewMode === 'admin' ? 'Admin' : 'Preview'}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>View Mode</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={switchToAdminView} disabled={!isImpersonating} className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Admin View (Default)
                    {viewMode === 'admin' && <CheckCircle className="w-4 h-4 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowJurorSelectionModal(true)} className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Preview as Juror...
                    {viewMode === 'juror' && <CheckCircle className="w-4 h-4 ml-auto text-warning" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="professional" size="sm">
                  <User className="w-4 h-4" />
                  Profile
                </Button>
              </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border border-border shadow-elegant w-64">
          {/* User Info Section */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium text-foreground">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-medium text-primary">
                  {profile?.role === 'admin' ? 'CM' : 'Juror'}
                </span>
                {profile?.organization && <span className="text-xs text-muted-foreground">
                    {profile.organization}
                  </span>}
              </div>
            </div>
          </div>
          
          {/* Menu Items */}
          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          {profile?.role === 'admin' && <DropdownMenuItem onClick={() => navigate('/cohort-settings')} className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Cohort Settings
            </DropdownMenuItem>}
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>

    {/* Juror Selection Modal */}
    <JurorViewSelectionModal open={showJurorSelectionModal} onOpenChange={setShowJurorSelectionModal} />
  </>;
};