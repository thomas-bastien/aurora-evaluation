import { CommunicationLifecycleTimeline } from "@/components/cm/CommunicationLifecycleTimeline";
import { CommunicationTemplateManager } from "@/components/communication/CommunicationTemplateManager";
import { EmailAnalyticsCard } from "@/components/dashboard/EmailAnalyticsCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import RoleGuard from "@/components/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, BarChart3, Settings } from "lucide-react";

export default function EmailManagementPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Mail className="h-8 w-8" />
                Email Management Hub
              </h1>
              <p className="text-lg text-muted-foreground">
                Central dashboard for email communications, analytics, and template management
              </p>
            </div>

            <Separator />

            {/* Analytics Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Performance Analytics</h2>
              </div>
              <EmailAnalyticsCard />
            </div>

            <Separator />

            {/* Template Management Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Template Management</h2>
              </div>
              <CommunicationTemplateManager currentRound="screeningRound" />
            </div>

            <Separator />

            {/* Communication Timeline Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Communication Timeline</h2>
              </div>
              <CommunicationLifecycleTimeline />
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}