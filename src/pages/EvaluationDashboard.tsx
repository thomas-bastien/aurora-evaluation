import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CohortSummaryCard } from "@/components/dashboard/CohortSummaryCard";
import { FunnelStage } from "@/components/dashboard/FunnelStage";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  FileText, 
  CheckCircle, 
  Calendar,
  MessageSquare,
  Users,
  AlertCircle,
  Link2
} from "lucide-react";
interface DashboardStats {
  totalStartups: number;
  totalJurors: number;
  currentPhase: 'screening' | 'pitching';
  screeningAssigned: number;
  screeningEvaluated: number;
  pitchingAssigned: number;
  schedulingLinkUploaded: boolean;
  pitchCalls: {
    scheduled: number;
    completed: number;
  };
  pitchingEvaluated: number;
}
const EvaluationDashboard = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStartups: 0,
    totalJurors: 0,
    currentPhase: 'screening',
    screeningAssigned: 0,
    screeningEvaluated: 0,
    pitchingAssigned: 0,
    schedulingLinkUploaded: false,
    pitchCalls: { scheduled: 0, completed: 0 },
    pitchingEvaluated: 0
  });
  useEffect(() => {
    if (user && profile?.role === 'vc') {
      fetchDashboardStats();
    }
  }, [user, profile]);
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get total startups count
      const { count: totalStartups } = await supabase
        .from('startups')
        .select('*', { count: 'exact', head: true });

      // Get total jurors count
      const { count: totalJurors } = await supabase
        .from('jurors')
        .select('*', { count: 'exact', head: true });

      // Find current juror record
      const { data: juror } = await supabase
        .from('jurors')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!juror) {
        console.warn('No juror record found for this user');
        return;
      }

      // Get screening assignments
      const { count: screeningAssigned } = await supabase
        .from('startup_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('juror_id', juror.id)
        .eq('status', 'assigned');

      // Get screening evaluations completed
      const { count: screeningEvaluated } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('evaluator_id', user?.id)
        .eq('status', 'submitted');

      // Check if scheduling link is uploaded
      const schedulingLinkUploaded = profile?.calendly_link ? true : false;

      // For now, set static values for pitching phase (can be enhanced later)
      const pitchingAssigned = 0; // Will be populated when pitching phase is active
      const pitchingEvaluated = 0; // Will be populated when pitching evaluations start

      setStats({
        totalStartups: totalStartups || 0,
        totalJurors: totalJurors || 0,
        currentPhase: 'screening', // TODO: Get from global settings
        screeningAssigned: screeningAssigned || 0,
        screeningEvaluated: screeningEvaluated || 0,
        pitchingAssigned,
        schedulingLinkUploaded,
        pitchCalls: { scheduled: 0, completed: 0 }, // TODO: Implement when pitch requests are available
        pitchingEvaluated
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  // Calculate progress percentages
  const screeningProgress = stats.screeningAssigned > 0 
    ? Math.round((stats.screeningEvaluated / stats.screeningAssigned) * 100) 
    : 0;
  
  const pitchingProgress = stats.pitchingAssigned > 0 
    ? Math.round((stats.pitchingEvaluated / stats.pitchingAssigned) * 100) 
    : 0;
  if (profile?.role !== 'vc') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                This page is only accessible to VC Partners (Jurors). Please contact your administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Cohort Summary Card */}
        <div className="mb-8">
          <CohortSummaryCard
            totalStartups={stats.totalStartups}
            totalJurors={stats.totalJurors}
            activePhase={stats.currentPhase}
            evaluationProgress={screeningProgress}
            reminders={0}
            nextMilestone="Screening evaluations due soon"
          />
        </div>

        {/* Juror Context */}
        <div className="mb-8 text-center">
          <p className="text-lg text-muted-foreground">
            You are 1 of {stats.totalJurors} jurors helping evaluate this year's cohort of {stats.totalStartups} startups.
          </p>
        </div>

        {/* Round 1 - Screening */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">1</div>
            Round 1 – Screening
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FunnelStage
              title="Assigned Startups"
              description="Your startups for Screening"
              tooltip="Startups allocated to you for the Screening round. You can draft and edit your evaluations until the phase closes."
              status={stats.screeningAssigned > 0 ? 'current' : 'upcoming'}
              statusText={`${stats.screeningAssigned} assigned`}
              icon={Users}
              onClick={() => navigate('/evaluate')}
            />
            
            <FunnelStage
              title="Evaluate (Screening)"
              description="Complete evaluation forms"
              tooltip="Provide scores and detailed feedback (min. 30 characters per open field). Required for all assigned startups."
              status={stats.screeningAssigned > 0 ? 'current' : 'upcoming'}
              progress={screeningProgress}
              statusText={`${stats.screeningEvaluated}/${stats.screeningAssigned} submitted`}
              icon={FileText}
              onClick={() => navigate('/evaluate')}
              isLast
            />
          </div>
        </div>

        {/* Round 2 - Pitching */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">2</div>
            Round 2 – Pitching
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FunnelStage
              title="Assigned Startups"
              description="Your finalists for Pitching"
              tooltip="Your Pitching startups, selected from the Top 30 semi-finalists."
              status={stats.pitchingAssigned > 0 ? 'current' : 'upcoming'}
              statusText={`${stats.pitchingAssigned} assigned`}
              icon={Users}
              onClick={() => navigate('/evaluate?phase=pitching')}
            />
            
            <FunnelStage
              title="Upload Scheduling Link"
              description="Add your Calendly link"
              tooltip="Add your Calendly (or other scheduling) link so startups can book slots with you. You only need to do this once per cohort."
              status={stats.schedulingLinkUploaded ? 'completed' : 'current'}
              statusText={stats.schedulingLinkUploaded ? 'Link on file' : 'Missing'}
              icon={Link2}
              onClick={() => navigate('/profile')}
            />
            
            <FunnelStage
              title="Pitch Calls"
              description="Join scheduled calls"
              tooltip="Startups choose slots from your scheduling link. You just need to join the calls when booked. Status updates will track scheduled and completed calls."
              status={stats.pitchCalls.scheduled > 0 ? 'current' : 'upcoming'}
              statusText={`${stats.pitchCalls.completed}/${stats.pitchCalls.scheduled} completed`}
              icon={Calendar}
              onClick={() => navigate('/evaluate?phase=pitching&view=calls')}
            />
            
            <FunnelStage
              title="Evaluate (Pitching)"
              description="Post-pitch evaluations"
              tooltip="Submit your evaluation after each pitch call. Editable until the CM closes the phase."
              status={stats.pitchingEvaluated > 0 ? 'current' : 'upcoming'}
              progress={pitchingProgress}
              statusText={`${stats.pitchingEvaluated}/${stats.pitchingAssigned} submitted`}
              icon={MessageSquare}
              onClick={() => navigate('/evaluate?phase=pitching&view=evaluations')}
              isLast
            />
          </div>
        </div>
      </main>
    </div>
  );
};
export default EvaluationDashboard;