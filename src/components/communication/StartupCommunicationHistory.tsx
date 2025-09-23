import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Eye, 
  MousePointer, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText
} from "lucide-react";
import { format } from "date-fns";

interface CommunicationRecord {
  id: string;
  subject: string;
  body: string;
  status: string;
  round_name: string | null;
  communication_type: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  created_at: string;
  metadata: any;
}

interface StartupCommunicationHistoryProps {
  startupId: string;
  startupName: string;
}

export const StartupCommunicationHistory = ({ startupId, startupName }: StartupCommunicationHistoryProps) => {
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<CommunicationRecord | null>(null);

  useEffect(() => {
    fetchCommunicationHistory();
  }, [startupId]);

  const fetchCommunicationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('recipient_type', 'startup')
        .eq('recipient_id', startupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communication history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (communication: CommunicationRecord) => {
    if (communication.bounced_at) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    } else if (communication.clicked_at) {
      return <MousePointer className="h-4 w-4 text-success" />;
    } else if (communication.opened_at) {
      return <Eye className="h-4 w-4 text-info" />;
    } else if (communication.delivered_at) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else if (communication.sent_at) {
      return <Mail className="h-4 w-4 text-primary" />;
    } else {
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (communication: CommunicationRecord) => {
    if (communication.bounced_at) return 'Bounced';
    if (communication.clicked_at) return 'Clicked';
    if (communication.opened_at) return 'Opened';
    if (communication.delivered_at) return 'Delivered';
    if (communication.sent_at) return 'Sent';
    return 'Pending';
  };

  const getStatusVariant = (communication: CommunicationRecord): "default" | "secondary" | "destructive" | "outline" => {
    if (communication.bounced_at) return 'destructive';
    if (communication.clicked_at || communication.opened_at) return 'default';
    if (communication.delivered_at || communication.sent_at) return 'secondary';
    return 'outline';
  };

  const getCommunicationTypeDisplay = (type: string | null) => {
    if (!type) return 'General';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
  };

  const getRoundDisplay = (round: string | null) => {
    if (!round) return '';
    return round.charAt(0).toUpperCase() + round.slice(1);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Communication History
          </CardTitle>
          <CardDescription>Loading communication history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (communications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Communication History
          </CardTitle>
          <CardDescription>No communications sent to this startup yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Communication History
        </CardTitle>
        <CardDescription>
          Email communications sent to {startupName} ({communications.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {communications.map((communication) => (
            <div key={communication.id} className="flex items-start justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1">
                  {getStatusIcon(communication)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-medium truncate">{communication.subject}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {communication.round_name && (
                        <Badge variant="outline" className="text-xs">
                          {getRoundDisplay(communication.round_name)}
                        </Badge>
                      )}
                      {communication.communication_type && (
                        <Badge variant="outline" className="text-xs">
                          {getCommunicationTypeDisplay(communication.communication_type)}
                        </Badge>
                      )}
                      <Badge variant={getStatusVariant(communication)} className="text-xs">
                        {getStatusText(communication)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Sent: {communication.sent_at 
                        ? format(new Date(communication.sent_at), 'MMM d, yyyy at h:mm a')
                        : format(new Date(communication.created_at), 'MMM d, yyyy at h:mm a')
                      }
                    </div>
                    
                    {communication.delivered_at && (
                      <div>
                        Delivered: {format(new Date(communication.delivered_at), 'MMM d, yyyy at h:mm a')}
                      </div>
                    )}
                    
                    {communication.opened_at && (
                      <div>
                        Opened: {format(new Date(communication.opened_at), 'MMM d, yyyy at h:mm a')}
                      </div>
                    )}
                    
                    {communication.clicked_at && (
                      <div>
                        Clicked: {format(new Date(communication.clicked_at), 'MMM d, yyyy at h:mm a')}
                      </div>
                    )}
                    
                    {communication.bounced_at && (
                      <div className="text-destructive">
                        Bounced: {format(new Date(communication.bounced_at), 'MMM d, yyyy at h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedEmail(communication)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>{communication.subject}</DialogTitle>
                      <DialogDescription>
                        {communication.round_name && getRoundDisplay(communication.round_name)} {' '}
                        {communication.communication_type && getCommunicationTypeDisplay(communication.communication_type)} {' '}
                        • {format(new Date(communication.created_at), 'MMM d, yyyy at h:mm a')}
                      </DialogDescription>
                    </DialogHeader>
                    <Separator />
                    <ScrollArea className="max-h-[60vh] w-full">
                      <div 
                        className="prose prose-sm max-w-none p-4"
                        dangerouslySetInnerHTML={{ __html: communication.body }}
                      />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};