import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ExternalLink
} from "lucide-react";

interface EmailCommunication {
  id: string;
  recipient_email: string;
  recipient_type: string;
  subject: string;
  body: string;
  status: string;
  communication_type?: string;
  round_name?: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  template_id?: string;
  resend_email_id?: string;
  error_message?: string;
  email_templates?: {
    name: string;
    category: string;
  };
}

export const EmailCommunicationsTable = () => {
  const [communications, setCommunications] = useState<EmailCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailCommunication | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('email_communications')
        .select(`
          *,
          email_templates (
            name,
            category
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (communication: EmailCommunication) => {
    if (communication.bounced_at) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Bounced</Badge>;
    }
    if (communication.clicked_at) {
      return <Badge className="gap-1 bg-indigo-500/10 text-indigo-600 border-indigo-500/20"><ExternalLink className="w-3 h-3" />Clicked</Badge>;
    }
    if (communication.opened_at) {
      return <Badge className="gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20"><TrendingUp className="w-3 h-3" />Opened</Badge>;
    }
    if (communication.delivered_at) {
      return <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3" />Delivered</Badge>;
    }
    if (communication.sent_at) {
      return <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20"><Mail className="w-3 h-3" />Sent</Badge>;
    }
    if (communication.status === 'failed') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const handleViewEmail = (communication: EmailCommunication) => {
    setSelectedEmail(communication);
    setShowEmailDialog(true);
  };

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = 
      comm.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.email_templates?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || comm.status === statusFilter;
    const matchesType = typeFilter === 'all' || comm.communication_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const statuses = [...new Set(communications.map(c => c.status))];
  const types = [...new Set(communications.map(c => c.communication_type).filter(Boolean))];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Communications
          </CardTitle>
          <CardDescription>
            Track and monitor all email communications sent through the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient, subject, or template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>
                    {type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Communications Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type/Round</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommunications.map(comm => (
                  <TableRow key={comm.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{comm.recipient_email}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {comm.recipient_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate font-medium">{comm.subject}</div>
                    </TableCell>
                    <TableCell>
                      {comm.email_templates?.name ? (
                        <div>
                          <div className="text-sm font-medium">{comm.email_templates.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {comm.email_templates.category.replace('-', ' ')}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Manual</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(comm)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {comm.communication_type && (
                          <Badge variant="outline" className="text-xs">
                            {comm.communication_type.replace('-', ' ')}
                          </Badge>
                        )}
                        {comm.round_name && (
                          <Badge variant="outline" className="text-xs">
                            {comm.round_name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(comm.sent_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(comm.delivered_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(comm.opened_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewEmail(comm)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCommunications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No communications found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              Full email content and delivery information
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-6">
              {/* Email Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">To:</label>
                    <div className="font-medium">{selectedEmail.recipient_email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subject:</label>
                    <div className="font-medium">{selectedEmail.subject}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status:</label>
                    <div>{getStatusBadge(selectedEmail)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sent:</label>
                    <div>{formatDate(selectedEmail.sent_at)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Delivered:</label>
                    <div>{formatDate(selectedEmail.delivered_at)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Opened:</label>
                    <div>{formatDate(selectedEmail.opened_at)}</div>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Content:</label>
                <ScrollArea className="h-96 w-full border rounded-lg p-4">
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                </ScrollArea>
              </div>

              {/* Error Message if any */}
              {selectedEmail.error_message && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <div>
                      <div className="font-medium text-destructive">Error</div>
                      <div className="text-sm text-muted-foreground">{selectedEmail.error_message}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};