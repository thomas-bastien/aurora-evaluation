import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Mail, Eye, RotateCcw, AlertCircle, CheckCircle, Clock, MousePointer } from "lucide-react";

interface EmailHistorySectionProps {
  participantId: string;
  participantType: 'juror' | 'startup';
  participantName: string;
}

interface EmailCommunication {
  id: string;
  template_id?: string;
  recipient_email: string;
  recipient_id?: string;
  subject: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  created_at: string;
  body: string;
  error_message?: string;
  email_templates?: {
    name: string;
    category: string;
  };
}

export function EmailHistorySection({ participantId, participantType, participantName }: EmailHistorySectionProps) {
  const [selectedEmail, setSelectedEmail] = useState<EmailCommunication | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: communications, isLoading, refetch } = useQuery({
    queryKey: ["email-history", participantId, participantType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_communications")
        .select(`
          *,
          email_templates (
            name,
            category
          )
        `)
        .eq("recipient_id", participantId)
        .eq("recipient_type", participantType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailCommunication[];
    },
  });

  const getStatusIcon = (status: string, communication: EmailCommunication) => {
    if (communication.clicked_at) return <MousePointer className="w-4 h-4 text-purple-500" />;
    if (communication.opened_at) return <Eye className="w-4 h-4 text-blue-500" />;
    if (communication.delivered_at) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'sent') return <Mail className="w-4 h-4 text-blue-500" />;
    if (status === 'bounced' || status === 'failed') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: string, communication: EmailCommunication) => {
    if (communication.clicked_at) return <Badge className="bg-purple-100 text-purple-800">Clicked</Badge>;
    if (communication.opened_at) return <Badge className="bg-blue-100 text-blue-800">Opened</Badge>;
    if (communication.delivered_at) return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
    if (status === 'sent') return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
    if (status === 'bounced') return <Badge variant="destructive">Bounced</Badge>;
    if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  const handleResendEmail = async (communication: EmailCommunication) => {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          recipientEmail: communication.recipient_email,
          recipientType: participantType,
          recipientId: participantId,
          templateId: communication.template_id,
          variables: {
            participant_name: participantName,
          },
        },
      });

      refetch();
    } catch (error) {
      console.error('Error resending email:', error);
    }
  };

  const viewEmailPreview = (communication: EmailCommunication) => {
    setSelectedEmail(communication);
    setShowPreview(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
          <CardDescription>Loading communication history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email History
              </CardTitle>
              <CardDescription>
                Complete communication history for {participantName}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!communications?.length ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No emails sent</h3>
              <p className="text-muted-foreground">
                No communication history found for this {participantType}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email Statistics */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {communications.filter(c => c.status === 'sent' || c.delivered_at).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {communications.filter(c => c.delivered_at).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {communications.filter(c => c.opened_at).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Opened</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {communications.filter(c => c.clicked_at).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Clicked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {communications.filter(c => c.bounced_at || c.status === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Bounced</div>
                </div>
              </div>

              {/* Email Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communications.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(comm.status, comm)}
                          {getStatusBadge(comm.status, comm)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate font-medium">{comm.subject}</div>
                        {comm.error_message && (
                          <div className="text-xs text-red-600 truncate">{comm.error_message}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {comm.email_templates ? (
                          <Badge variant="outline" className="text-xs">
                            {comm.email_templates.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Custom</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {comm.sent_at ? format(new Date(comm.sent_at), 'MMM d, HH:mm') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {comm.delivered_at && (
                            <div className="text-green-600">
                              Delivered: {format(new Date(comm.delivered_at), 'MMM d, HH:mm')}
                            </div>
                          )}
                          {comm.opened_at && (
                            <div className="text-blue-600">
                              Opened: {format(new Date(comm.opened_at), 'MMM d, HH:mm')}
                            </div>
                          )}
                          {comm.clicked_at && (
                            <div className="text-purple-600">
                              Clicked: {format(new Date(comm.clicked_at), 'MMM d, HH:mm')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => viewEmailPreview(comm)}
                          >
                            Preview
                          </Button>
                          {(comm.status === 'failed' || comm.status === 'bounced') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleResendEmail(comm)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Resend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview of email sent to {participantName}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium">Subject:</label>
                  <div>{selectedEmail.subject}</div>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <div>{getStatusBadge(selectedEmail.status, selectedEmail)}</div>
                </div>
              </div>
              <div>
                <label className="font-medium">Email Content:</label>
                <div className="mt-2 p-4 border rounded-md bg-gray-50 max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}