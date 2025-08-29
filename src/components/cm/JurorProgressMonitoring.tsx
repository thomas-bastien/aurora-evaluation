import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FilterPanel } from "@/components/common/FilterPanel";
import { 
  Search, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Filter,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface JurorProgress {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  assignedCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  lastActivity: string;
  status: 'completed' | 'active' | 'behind' | 'inactive';
}

interface JurorProgressMonitoringProps {
  currentPhase: 'screeningPhase' | 'pitchingPhase';
}

export const JurorProgressMonitoring = ({ currentPhase }: JurorProgressMonitoringProps) => {
  const [jurors, setJurors] = useState<JurorProgress[]>([]);
  const [filteredJurors, setFilteredJurors] = useState<JurorProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJurorProgress();
  }, []);

  useEffect(() => {
    filterJurors();
  }, [jurors, searchTerm, statusFilter]);

  const fetchJurorProgress = async () => {
    try {
      // Fetch jurors with their evaluation progress
      const { data: jurorsData, error } = await supabase
        .from('jurors')
        .select(`
          *,
          startup_assignments(
            id,
            status
          )
        `);

      if (error) throw error;

      const jurorProgress: JurorProgress[] = jurorsData?.map(juror => {
        const assignments = juror.startup_assignments || [];
        const assignedCount = assignments.length;
        const completedCount = Math.floor(assignedCount * 0.7); // Mock completion
        const pendingCount = assignedCount - completedCount;
        const completionRate = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0;
        
        // Determine status
        let status: 'completed' | 'active' | 'behind' | 'inactive' = 'inactive';
        if (completionRate === 100) status = 'completed';
        else if (completionRate >= 50) status = 'active';
        else if (completionRate > 0) status = 'behind';
        
        return {
          id: juror.id,
          name: juror.name,
          email: juror.email,
          company: juror.company || 'N/A',
          job_title: juror.job_title || 'N/A',
          assignedCount,
          completedCount,
          pendingCount,
          completionRate,
          lastActivity: 'Never',
          status
        };
      }) || [];

      setJurors(jurorProgress);
    } catch (error) {
      console.error('Error fetching juror progress:', error);
      toast.error('Failed to load juror progress');
    } finally {
      setLoading(false);
    }
  };

  const filterJurors = () => {
    let filtered = jurors;

    if (searchTerm) {
      filtered = filtered.filter(juror => 
        juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        juror.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        juror.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(juror => juror.status === statusFilter);
    }

    setFilteredJurors(filtered);
  };

  const sendReminder = async (jurorId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-juror-reminder', {
        body: { jurorId, email }
      });

      if (error) throw error;

      toast.success('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };

  const sendBulkReminders = async () => {
    const incompleteJurors = filteredJurors.filter(j => j.status !== 'completed');
    
    try {
      for (const juror of incompleteJurors) {
        await sendReminder(juror.id, juror.email);
      }
      toast.success(`Reminders sent to ${incompleteJurors.length} jurors`);
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast.error('Failed to send bulk reminders');
    }
  };

  const getStatusBadge = (status: string, completionRate: number) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'active':
        return <Badge className="bg-primary text-primary-foreground">Active</Badge>;
      case 'behind':
        return <Badge className="bg-warning text-warning-foreground">Behind</Badge>;
      case 'inactive':
        return <Badge className="bg-muted text-muted-foreground">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate === 100) return "bg-success";
    if (rate >= 50) return "bg-primary";
    if (rate > 0) return "bg-warning";
    return "bg-muted";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Juror Progress Monitoring - {currentPhase === 'screeningPhase' ? 'Screening' : 'Pitching'}
            </CardTitle>
            <CardDescription>
              Track {currentPhase === 'screeningPhase' ? 'evaluation' : 'pitch'} submission status by juror and send reminders
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button onClick={sendBulkReminders}>
              <Mail className="w-4 h-4 mr-2" />
              Send Reminders
            </Button>
            <Button variant="outline" onClick={fetchJurorProgress}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search jurors by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="behind">Behind</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{jurors.length}</div>
            <div className="text-sm text-muted-foreground">Total Jurors</div>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{jurors.filter(j => j.status === 'completed').length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{jurors.filter(j => j.status === 'behind').length}</div>
            <div className="text-sm text-muted-foreground">Behind</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-muted-foreground">{jurors.filter(j => j.status === 'inactive').length}</div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </div>
        </div>

        {/* Juror List */}
        <div className="space-y-4">
          {filteredJurors.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jurors found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'No jurors have been assigned yet'}
              </p>
            </div>
          ) : (
            filteredJurors.map(juror => (
              <div key={juror.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-foreground">{juror.name}</h4>
                      {getStatusBadge(juror.status, juror.completionRate)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {juror.job_title} at {juror.company} • {juror.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">
                      {juror.completedCount}/{juror.assignedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">evaluations</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{juror.completionRate.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={juror.completionRate} 
                      className="h-2"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {juror.lastActivity === 'Never' ? 'Never' : new Date(juror.lastActivity).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => sendReminder(juror.id, juror.email)}
                    disabled={juror.status === 'completed'}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};