import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLiveCommunicationStats } from '@/hooks/useLiveCommunicationStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  MessageSquare,
  Clock,
  RefreshCw
} from "lucide-react";

interface OverviewStats {
  totalTemplates: number;
  activeTemplates: number;
  totalEmailsSent: number;
  deliveryRate: number;
  openRate: number;
  recentActivity: EmailActivity[];
  templateHealth: TemplateHealth[];
  communicationProgress: CommunicationStage[];
}

interface EmailActivity {
  id: string;
  type: string;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
}

interface TemplateHealth {
  template_name: string;
  category: string;
  usage_count: number;
  success_rate: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface CommunicationStage {
  stage: string;
  total: number;
  completed: number;
  progress: number;
}

export const EmailOverview = () => {
  const { data: lifecycleData, isLoading: isLoadingLifecycle, refetch: refetchLifecycle } = useLiveCommunicationStats();
  
  const [stats, setStats] = useState<OverviewStats>({
    totalTemplates: 0,
    activeTemplates: 0,
    totalEmailsSent: 0,
    deliveryRate: 0,
    openRate: 0,
    recentActivity: [],
    templateHealth: [],
    communicationProgress: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      // Fetch template stats
      const { data: templates } = await supabase
        .from('email_templates')
        .select('id, name, category, is_active');

      // Fetch communication stats
      const { data: communications } = await supabase
        .from('email_communications')
        .select('id, recipient_email, subject, status, created_at, delivered_at, opened_at, template_id')
        .order('created_at', { ascending: false })
        .limit(50);

      // Calculate basic stats
      const totalTemplates = templates?.length || 0;
      const activeTemplates = templates?.filter(t => t.is_active).length || 0;
      const totalEmailsSent = communications?.length || 0;
      const delivered = communications?.filter(c => c.delivered_at).length || 0;
      const opened = communications?.filter(c => c.opened_at).length || 0;

      const deliveryRate = totalEmailsSent > 0 ? (delivered / totalEmailsSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;

      // Recent activity (last 10 emails)
      const recentActivity = communications?.slice(0, 10).map(c => ({
        id: c.id,
        type: 'email',
        recipient_email: c.recipient_email,
        subject: c.subject,
        status: c.status,
        created_at: c.created_at
      })) || [];

      // Template health analysis
      const templateUsage = new Map();
      communications?.forEach(comm => {
        if (comm.template_id) {
          const existing = templateUsage.get(comm.template_id) || { count: 0, successful: 0 };
          existing.count += 1;
          if (comm.status === 'delivered' || comm.status === 'opened' || comm.status === 'clicked') {
            existing.successful += 1;
          }
          templateUsage.set(comm.template_id, existing);
        }
      });

      const templateHealth: TemplateHealth[] = templates?.map(template => {
        const usage = templateUsage.get(template.id) || { count: 0, successful: 0 };
        const successRate = usage.count > 0 ? (usage.successful / usage.count) * 100 : 0;
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        
        if (usage.count === 0) status = 'warning';
        else if (successRate < 50) status = 'critical';
        else if (successRate < 80) status = 'warning';

        return {
          template_name: template.name,
          category: template.category,
          usage_count: usage.count,
          success_rate: successRate,
          status
        };
      }) || [];

      setStats({
        totalTemplates,
        activeTemplates,
        totalEmailsSent,
        deliveryRate,
        openRate,
        recentActivity,
        templateHealth,
        communicationProgress: []
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'sent': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'delivered': 'bg-green-500/10 text-green-600 border-green-500/20',
      'opened': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'clicked': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      'bounced': 'bg-red-500/10 text-red-600 border-red-500/20',
      'failed': 'bg-red-500/10 text-red-600 border-red-500/20',
      'pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-muted text-muted-foreground'}>
        {status}
      </Badge>
    );
  };

  const getHealthIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  if (loading || isLoadingLifecycle) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Extract communication progress from lifecycle data
  const communicationProgress: CommunicationStage[] = lifecycleData?.stages.flatMap(stage => 
    stage.substeps?.map(substep => ({
      stage: substep.name,
      total: substep.total,
      completed: substep.completed,
      progress: substep.total > 0 ? (substep.completed / substep.total) * 100 : 0
    })) || []
  ) || [];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Templates</p>
                <p className="text-2xl font-bold">{stats.activeTemplates}</p>
                <p className="text-xs text-muted-foreground">of {stats.totalTemplates} total</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{stats.totalEmailsSent}</p>
                <p className="text-xs text-muted-foreground">total communications</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <p className="text-xs text-green-600">Excellent</p>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">engagement rate</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Communication Progress
              </CardTitle>
              <CardDescription>
                Progress across different communication stages
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchLifecycle()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {communicationProgress.length > 0 ? (
                communicationProgress.map(stage => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-muted-foreground">
                        {stage.completed}/{stage.total}
                      </span>
                    </div>
                    <Progress value={stage.progress} className="h-2" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No communication stages active yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Template Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Template Health
            </CardTitle>
            <CardDescription>
              Performance analysis of email templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.templateHealth.map(template => (
                <div key={template.template_name} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(template.status)}
                    <div>
                      <p className="text-sm font-medium">{template.template_name}</p>
                      <p className="text-xs text-muted-foreground">{template.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{template.success_rate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">{template.usage_count} uses</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest email communications and system events
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOverviewStats}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map(activity => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">{activity.subject}</p>
                    <p className="text-xs text-muted-foreground">{activity.recipient_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(activity.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};