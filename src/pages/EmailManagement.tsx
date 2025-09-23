import { useState } from "react";
import { EmailManagement } from "@/components/cm/EmailManagement";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import RoleGuard from "@/components/RoleGuard";

export default function EmailManagementPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <EmailManagement />
        </div>
      </div>
    </RoleGuard>
  );
}