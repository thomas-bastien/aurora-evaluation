import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Search, Edit, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import CMFormModal from "@/components/cm/CMFormModal";

interface CommunityManager {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  job_title: string | null;
  organization: string | null;
  linkedin_url: string | null;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  permissions: any;
  created_at: string;
}

export default function CMManagementTab() {
  const { toast } = useToast();
  const [cms, setCms] = useState<CommunityManager[]>([]);
  const [filteredCms, setFilteredCms] = useState<CommunityManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCM, setSelectedCM] = useState<CommunityManager | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cmToDelete, setCmToDelete] = useState<CommunityManager | null>(null);

  useEffect(() => {
    fetchCMs();
  }, []);

  useEffect(() => {
    filterCMs();
  }, [searchTerm, cms]);

  const fetchCMs = async () => {
    try {
      const { data, error } = await supabase
        .from("community_managers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCms(data || []);
    } catch (error: any) {
      console.error("Error fetching CMs:", error);
      toast({
        title: "Error",
        description: "Failed to load community managers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCMs = () => {
    if (!searchTerm) {
      setFilteredCms(cms);
      return;
    }

    const filtered = cms.filter(
      (cm) =>
        cm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cm.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cm.organization?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCms(filtered);
  };

  const getStatusBadge = (cm: CommunityManager) => {
    if (cm.user_id) {
      return <Badge variant="default">Active</Badge>;
    }

    if (cm.invitation_expires_at) {
      const expiresAt = new Date(cm.invitation_expires_at);
      if (expiresAt < new Date()) {
        return <Badge variant="destructive">Expired</Badge>;
      }
      return <Badge variant="secondary">Invited</Badge>;
    }

    return <Badge variant="outline">Pending</Badge>;
  };

  const handleAddCM = () => {
    setSelectedCM(null);
    setIsFormOpen(true);
  };

  const handleEdit = (cm: CommunityManager) => {
    setSelectedCM(cm);
    setIsFormOpen(true);
  };

  const handleDelete = (cm: CommunityManager) => {
    setCmToDelete(cm);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!cmToDelete) return;

    try {
      const { error } = await supabase
        .from("community_managers")
        .delete()
        .eq("id", cmToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Community manager removed successfully",
      });

      fetchCMs();
    } catch (error: any) {
      console.error("Error deleting CM:", error);
      toast({
        title: "Error",
        description: "Failed to remove community manager",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setCmToDelete(null);
    }
  };

  const handleResendInvitation = async (cm: CommunityManager) => {
    try {
      const { error } = await supabase.functions.invoke("send-cm-invitation", {
        body: {
          name: cm.name,
          email: cm.email,
          organization: cm.organization,
          jobTitle: cm.job_title,
          permissions: cm.permissions,
          isResend: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation resent successfully",
      });

      fetchCMs();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: `Failed to resend invitation to ${cm.name}`,
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    fetchCMs();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <div>
                <CardTitle>Community Managers</CardTitle>
                <CardDescription>
                  Manage your team of community managers
                </CardDescription>
              </div>
              <Badge variant="secondary" className="ml-2">
                {cms.length}
              </Badge>
            </div>
            <Button onClick={handleAddCM}>
              <Plus className="w-4 h-4 mr-2" />
              Add CM
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No community managers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCms.map((cm) => (
                  <TableRow key={cm.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{cm.name}</TableCell>
                    <TableCell>{cm.email}</TableCell>
                    <TableCell>{cm.organization || "-"}</TableCell>
                    <TableCell>{cm.job_title || "-"}</TableCell>
                    <TableCell>{getStatusBadge(cm)}</TableCell>
                    <TableCell>
                      {cm.invitation_sent_at
                        ? new Date(cm.invitation_sent_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!cm.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(cm)}
                            title="Resend invitation"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cm)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cm)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      <CMFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        cm={selectedCM}
        onSuccess={handleFormSubmit}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {cmToDelete?.name} and remove their access.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
