import { CommunicationLifecycleTimeline } from "@/components/cm/CommunicationLifecycleTimeline";
import { EmailOverview } from "@/components/communication/EmailOverview";
import { EmailTemplateTable } from "@/components/communication/EmailTemplateTable";
import { EmailCommunicationsTable } from "@/components/communication/EmailCommunicationsTable";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import RoleGuard from "@/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, BarChart3, Settings, MessageSquare, Activity } from "lucide-react";

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
                Communications Management Hub
              </h1>
              <p className="text-lg text-muted-foreground">
                Comprehensive email communication management, templates, and analytics
              </p>
            </div>

            {/* Tabbed Interface */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="communications" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Communications
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <EmailOverview />
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <EmailTemplateTable />
              </TabsContent>

              <TabsContent value="communications" className="space-y-6">
                <EmailCommunicationsTable />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <CommunicationLifecycleTimeline />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}