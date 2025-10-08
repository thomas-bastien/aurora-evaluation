import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, Edit, Trash2, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

export interface Admin {
  id: string;
  name: string;
  email: string;
  job_title?: string;
  organization?: string;
  linkedin_url?: string;
  user_id?: string;
  invitation_token?: string;
  invitation_sent_at?: string;
  invitation_expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface AdminsTableProps {
  admins: Admin[];
  onEdit: (admin: Admin) => void;
  onDelete: (adminId: string) => void;
  onSendInvitation: (admin: Admin) => void;
}

export function AdminsTable({ admins, onEdit, onDelete, onSendInvitation }: AdminsTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  const handleDeleteClick = (adminId: string) => {
    setAdminToDelete(adminId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (adminToDelete) {
      onDelete(adminToDelete);
      setDeleteConfirmOpen(false);
      setAdminToDelete(null);
    }
  };

  const getStatus = (admin: Admin) => {
    if (admin.user_id) {
      return { label: 'Active', variant: 'default' as const, icon: CheckCircle };
    }
    
    if (admin.invitation_sent_at && admin.invitation_expires_at) {
      const expiresAt = new Date(admin.invitation_expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        return { label: 'Expired', variant: 'destructive' as const, icon: XCircle };
      }
      return { label: 'Invited', variant: 'secondary' as const, icon: Clock };
    }
    
    return { label: 'Pending', variant: 'outline' as const, icon: AlertCircle };
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => {
            const status = getStatus(admin);
            const StatusIcon = status.icon;
            
            return (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">{admin.name}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>{admin.organization || '-'}</TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!admin.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSendInvitation(admin)}
                        title="Send Invitation"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(admin)}
                      title="Edit Admin"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(admin.id)}
                      title="Delete Admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {admins.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No administrators found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this administrator. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
