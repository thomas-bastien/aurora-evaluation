import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CommunicationStatusBadge } from "@/components/communication/CommunicationStatusBadge";
import { JurorStatusBadge } from "@/components/common/JuryRoundStatusBadges";
import { Search, Users, RefreshCw } from "lucide-react";

interface JurorWithCommunication {
  id: string;
  name: string;
  email: string;
  company?: string;
  user_id?: string;
  invitation_sent_at?: string;
  invitation_expires_at?: string;
  target_verticals?: string[];
  preferred_regions?: string[];
}

export function JurorProgressWithCommunication() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: jurors, isLoading, refetch } = useQuery({
    queryKey: ["jurors-with-communication", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("jurors")
        .select("*")
        .order("name");

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JurorWithCommunication[];
    },
  });

  const filteredJurors = jurors?.filter(juror => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return juror.user_id;
    if (statusFilter === "invited") return juror.invitation_sent_at && !juror.user_id;
    if (statusFilter === "not_invited") return !juror.invitation_sent_at;
    return true;
  });

  const getJurorStatus = (juror: JurorWithCommunication) => {
    if (juror.user_id) return "active";
    if (juror.invitation_sent_at) {
      const now = new Date();
      const expiresAt = juror.invitation_expires_at ? new Date(juror.invitation_expires_at) : null;
      return expiresAt && now > expiresAt ? "expired" : "invited";
    }
    return "not_invited";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Juror Communication Overview
            </CardTitle>
            <CardDescription>
              Track juror progress and communication status across all rounds
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jurors by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jurors</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited (Pending)</SelectItem>
              <SelectItem value="not_invited">Not Invited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredJurors?.filter(j => j.user_id).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {filteredJurors?.filter(j => j.invitation_sent_at && !j.user_id).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Invited</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredJurors?.filter(j => !j.invitation_sent_at).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Not Invited</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {filteredJurors?.filter(j => {
                if (!j.invitation_expires_at) return false;
                const now = new Date();
                const expiresAt = new Date(j.invitation_expires_at);
                return j.invitation_sent_at && !j.user_id && now > expiresAt;
              }).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </div>
        </div>

        {/* Jurors Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Juror</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Communication</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading jurors...
                  </TableCell>
                </TableRow>
              ) : !filteredJurors?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No jurors found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJurors.map((juror) => (
                  <TableRow key={juror.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{juror.name}</div>
                        <div className="text-sm text-muted-foreground">{juror.email}</div>
                        {juror.company && (
                          <div className="text-xs text-muted-foreground">{juror.company}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <JurorStatusBadge jurorId={juror.id} className="mb-1" />
                    </TableCell>
                    <TableCell>
                      <CommunicationStatusBadge 
                        participantId={juror.id}
                        participantType="juror"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {juror.target_verticals && juror.target_verticals.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {juror.target_verticals.slice(0, 2).map((vertical, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {vertical}
                              </Badge>
                            ))}
                            {juror.target_verticals.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{juror.target_verticals.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        {juror.preferred_regions && juror.preferred_regions.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {juror.preferred_regions.slice(0, 2).map((region, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                            {juror.preferred_regions.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{juror.preferred_regions.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/jurors/${juror.id}`}
                        >
                          View Profile
                        </Button>
                        {getJurorStatus(juror) !== "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // Trigger email invitation
                              try {
                                await supabase.functions.invoke('send-juror-invitation', {
                                  body: { jurorId: juror.id }
                                });
                                refetch();
                              } catch (error) {
                                console.error('Error sending invitation:', error);
                              }
                            }}
                          >
                            {juror.invitation_sent_at ? "Resend" : "Send"} Invite
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}