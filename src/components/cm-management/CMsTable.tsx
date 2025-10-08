import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface CommunityManager {
  id: string;
  name: string;
  email: string;
  job_title: string | null;
  organization: string | null;
  linkedin_url: string | null;
  user_id: string | null;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  permissions: {
    can_manage_startups: boolean;
    can_manage_jurors: boolean;
    can_invite_cms: boolean;
  };
}

interface CMsTableProps {
  cms: CommunityManager[];
  onEdit: (cm: CommunityManager) => void;
  onDelete: (id: string) => void;
  onSendInvitation: (cm: CommunityManager) => void;
}

export function CMsTable({ cms, onEdit, onDelete, onSendInvitation }: CMsTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getStatus = (cm: CommunityManager): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode } => {
    if (cm.user_id) {
      return { 
        label: 'Active', 
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />
      };
    }
    
    if (cm.invitation_sent_at && cm.invitation_expires_at) {
      const now = new Date();
      const expiryDate = new Date(cm.invitation_expires_at);
      
      if (now > expiryDate) {
        return { 
          label: 'Expired', 
          variant: 'destructive',
          icon: <XCircle className="h-3 w-3" />
        };
      }
      
      return { 
        label: 'Invited', 
        variant: 'secondary',
        icon: <Clock className="h-3 w-3" />
      };
    }
    
    return { 
      label: 'Pending', 
      variant: 'outline',
      icon: <Clock className="h-3 w-3" />
    };
  };

  const getPermissionBadges = (permissions: CommunityManager['permissions']) => {
    const badges = [];
    if (permissions?.can_manage_startups) badges.push('Startups');
    if (permissions?.can_manage_jurors) badges.push('Jurors');
    if (permissions?.can_invite_cms) badges.push('CMs');
    return badges;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No community managers found
                </TableCell>
              </TableRow>
            ) : (
              cms.map((cm) => {
                const status = getStatus(cm);
                const permissionBadges = getPermissionBadges(cm.permissions);
                
                return (
                  <TableRow key={cm.id}>
                    <TableCell className="font-medium">{cm.name}</TableCell>
                    <TableCell>{cm.email}</TableCell>
                    <TableCell>{cm.organization || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {permissionBadges.length > 0 ? (
                          permissionBadges.map(badge => (
                            <Badge key={badge} variant="outline" className="text-xs">
                              {badge}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No permissions</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!cm.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSendInvitation(cm)}
                            title={cm.invitation_sent_at ? 'Resend invitation' : 'Send invitation'}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(cm)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(cm.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community Manager</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this community manager? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
