import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Mail, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface EmailCommunication {
  id: string;
  template_id?: string;
  recipient_email: string;
  recipient_type: string;
  subject: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  error_message?: string;
  created_at: string;
  email_templates?: {
    name: string;
    category: string;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  is_active: boolean;
  created_at: string;
}

export function EmailManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Fetch email communications
  const { data: communications, isLoading: loadingComms } = useQuery({
    queryKey: ["email-communications", searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_communications")
        .select(`
          *,
          email_templates (
            name,
            category
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.or(`recipient_email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("recipient_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailCommunication[];
    },
  });

  // Fetch email templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  // Calculate email statistics
  const stats = communications ? {
    total: communications.length,
    sent: communications.filter(c => c.status === 'sent' || c.status === 'delivered' || c.status === 'opened' || c.status === 'clicked').length,
    delivered: communications.filter(c => c.status === 'delivered' || c.status === 'opened' || c.status === 'clicked').length,
    opened: communications.filter(c => c.opened_at).length,
    clicked: communications.filter(c => c.clicked_at).length,
    bounced: communications.filter(c => c.status === 'bounced').length,
    failed: communications.filter(c => c.status === 'failed').length,
  } : null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "secondary", icon: AlertCircle },
      sent: { variant: "default", icon: Mail },
      delivered: { variant: "default", icon: CheckCircle },
      opened: { variant: "default", icon: TrendingUp },
      clicked: { variant: "default", icon: TrendingUp },
      bounced: { variant: "destructive", icon: AlertCircle },
      complained: { variant: "destructive", icon: AlertCircle },
      failed: { variant: "destructive", icon: AlertCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Management</h2>
          <p className="text-muted-foreground">
            Monitor email delivery and manage templates
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              <div className="text-sm text-muted-foreground">Sent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.opened}</div>
              <div className="text-sm text-muted-foreground">Opened</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-indigo-600">{stats.clicked}</div>
              <div className="text-sm text-muted-foreground">Clicked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.bounced}</div>
              <div className="text-sm text-muted-foreground">Bounced</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="communications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="communications">Email Communications</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Communications</CardTitle>
              <div className="flex gap-4">
                <Input
                  placeholder="Search by email or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="juror">Juror</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingComms ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Loading email communications...
                      </TableCell>
                    </TableRow>
                  ) : communications?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No email communications found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    communications?.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{comm.recipient_email}</div>
                            <div className="text-sm text-muted-foreground">
                              {comm.recipient_type}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {comm.subject}
                        </TableCell>
                        <TableCell>
                          {comm.email_templates ? (
                            <Badge variant="outline">
                              {comm.email_templates.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Custom</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(comm.status)}</TableCell>
                        <TableCell>
                          {comm.sent_at ? format(new Date(comm.sent_at), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {comm.delivered_at ? format(new Date(comm.delivered_at), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {comm.opened_at ? format(new Date(comm.opened_at), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTemplates ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Loading email templates...
                      </TableCell>
                    </TableRow>
                  ) : templates?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No email templates found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates?.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.subject_template}
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(template.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm">
                              Preview
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}