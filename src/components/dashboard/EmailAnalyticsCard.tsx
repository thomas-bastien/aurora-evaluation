import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Eye,
  MousePointer,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmailAnalytics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export function EmailAnalyticsCard() {
  const navigate = useNavigate();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["email-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: communications, error } = await supabase
        .from("email_communications")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (error) throw error;

      const totalSent = communications?.length || 0;
      const delivered = communications?.filter(c => c.delivered_at).length || 0;
      const opened = communications?.filter(c => c.opened_at).length || 0;
      const clicked = communications?.filter(c => c.clicked_at).length || 0;
      const bounced = communications?.filter(c => c.bounced_at || c.status === 'bounced').length || 0;
      const failed = communications?.filter(c => c.status === 'failed').length || 0;

      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;

      return {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        failed,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate,
      } as EmailAnalytics;
    },
  });

  const getMetricIcon = (rate: number, type: 'positive' | 'negative') => {
    if (type === 'positive') {
      return rate >= 50 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return rate <= 5 ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getMetricColor = (rate: number, type: 'positive' | 'negative') => {
    if (type === 'positive') {
      if (rate >= 80) return "text-green-600";
      if (rate >= 50) return "text-yellow-600";
      return "text-red-600";
    } else {
      if (rate <= 2) return "text-green-600";
      if (rate <= 5) return "text-yellow-600";
      return "text-red-600";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Analytics
          </CardTitle>
          <CardDescription>Loading email performance metrics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Performance (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Communication delivery and engagement metrics
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/email-management')}>
            View Details
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics?.totalSent || 0}</div>
              <div className="text-sm text-muted-foreground">Total Sent</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics?.delivered || 0}</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics?.opened || 0}</div>
              <div className="text-sm text-muted-foreground">Opened</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{analytics?.clicked || 0}</div>
              <div className="text-sm text-muted-foreground">Clicked</div>
            </div>
          </div>

          {/* Performance Rates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium">Delivery Rate</span>
              </div>
              <div className="flex items-center gap-2">
                {getMetricIcon(analytics?.deliveryRate || 0, 'positive')}
                <span className={`font-bold ${getMetricColor(analytics?.deliveryRate || 0, 'positive')}`}>
                  {(analytics?.deliveryRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Open Rate</span>
              </div>
              <div className="flex items-center gap-2">
                {getMetricIcon(analytics?.openRate || 0, 'positive')}
                <span className={`font-bold ${getMetricColor(analytics?.openRate || 0, 'positive')}`}>
                  {(analytics?.openRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Click Rate</span>
              </div>
              <div className="flex items-center gap-2">
                {getMetricIcon(analytics?.clickRate || 0, 'positive')}
                <span className={`font-bold ${getMetricColor(analytics?.clickRate || 0, 'positive')}`}>
                  {(analytics?.clickRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-medium">Bounce Rate</span>
              </div>
              <div className="flex items-center gap-2">
                {getMetricIcon(analytics?.bounceRate || 0, 'negative')}
                <span className={`font-bold ${getMetricColor(analytics?.bounceRate || 0, 'negative')}`}>
                  {(analytics?.bounceRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(analytics?.bounceRate || 0) > 5 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">High Bounce Rate Alert</span>
              </div>
              <p className="text-sm text-red-600">
                Your bounce rate is above 5%. Consider reviewing email addresses and content.
              </p>
            </div>
          )}

          {(analytics?.failed || 0) > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{analytics?.failed} Failed Deliveries</span>
              </div>
              <p className="text-sm text-yellow-600">
                Some emails failed to send. Check the email management page for details.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}