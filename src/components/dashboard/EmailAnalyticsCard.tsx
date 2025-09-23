import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Mail, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface CommunicationAnalytics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export const EmailAnalyticsCard = () => {
  const [analytics, setAnalytics] = useState<CommunicationAnalytics>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: communications, error } = await supabase
        .from('email_communications')
        .select('status, sent_at, delivered_at, opened_at, clicked_at, bounced_at');

      if (error) throw error;

      const total = communications?.length || 0;
      const delivered = communications?.filter(c => c.delivered_at).length || 0;
      const opened = communications?.filter(c => c.opened_at).length || 0;
      const clicked = communications?.filter(c => c.clicked_at).length || 0;
      const bounced = communications?.filter(c => c.bounced_at).length || 0;

      setAnalytics({
        totalSent: total,
        delivered,
        opened,
        clicked,
        bounced,
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: opened > 0 ? (clicked / opened) * 100 : 0
      });
    } catch (error) {
      console.error('Error fetching communication analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (rate: number, type: 'delivery' | 'open' | 'click') => {
    const thresholds = { delivery: 95, open: 20, click: 2 };
    const threshold = thresholds[type];
    
    if (rate >= threshold) return <TrendingUp className="h-4 w-4 text-success" />;
    if (rate >= threshold * 0.7) return <BarChart3 className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const getMetricColor = (rate: number, type: 'delivery' | 'open' | 'click') => {
    const thresholds = { delivery: 95, open: 20, click: 2 };
    const threshold = thresholds[type];
    
    if (rate >= threshold) return 'text-success';
    if (rate >= threshold * 0.7) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Email Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Email Performance Analytics
        </CardTitle>
        <CardDescription>
          Communication performance metrics across all email campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Primary Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{analytics.totalSent}</div>
            <div className="text-sm text-muted-foreground">Total Sent</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analytics.delivered}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analytics.opened}</div>
            <div className="text-sm text-muted-foreground">Opened</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analytics.clicked}</div>
            <div className="text-sm text-muted-foreground">Clicked</div>
          </div>
        </div>

        {/* Performance Rates */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Delivery Rate</div>
              <div className={`text-sm ${getMetricColor(analytics.deliveryRate, 'delivery')}`}>
                {analytics.deliveryRate.toFixed(1)}%
              </div>
            </div>
            {getMetricIcon(analytics.deliveryRate, 'delivery')}
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Open Rate</div>
              <div className={`text-sm ${getMetricColor(analytics.openRate, 'open')}`}>
                {analytics.openRate.toFixed(1)}%
              </div>
            </div>
            {getMetricIcon(analytics.openRate, 'open')}
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Click Rate</div>
              <div className={`text-sm ${getMetricColor(analytics.clickRate, 'click')}`}>
                {analytics.clickRate.toFixed(1)}%
              </div>
            </div>
            {getMetricIcon(analytics.clickRate, 'click')}
          </div>
        </div>

        {/* Alerts */}
        {(analytics.bounced > 0 || analytics.deliveryRate < 90) && (
          <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-destructive">Performance Alert</div>
                <div className="text-sm text-muted-foreground">
                  {analytics.bounced > 0 && (
                    <div>• {analytics.bounced} emails bounced</div>
                  )}
                  {analytics.deliveryRate < 90 && (
                    <div>• Low delivery rate ({analytics.deliveryRate.toFixed(1)}%)</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};