import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';

interface RolePromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    email: string;
    role: string;
  } | null;
  onConfirm: (permissions: { can_manage_startups: boolean; can_manage_jurors: boolean; can_invite_cms: boolean }) => void;
  isLoading?: boolean;
}

export function RolePromotionDialog({ open, onOpenChange, user, onConfirm, isLoading }: RolePromotionDialogProps) {
  const [permissions, setPermissions] = useState({
    can_manage_startups: true,
    can_manage_jurors: true,
    can_invite_cms: false
  });

  const handleConfirm = () => {
    onConfirm(permissions);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to Community Manager</DialogTitle>
          <DialogDescription>
            You are about to promote <span className="font-semibold">{user.name}</span> ({user.email}) from Juror to Community Manager.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will grant elevated permissions and access to admin functions. This action will be logged in the audit trail.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Permissions</Label>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="manage-startups"
                checked={permissions.can_manage_startups}
                onCheckedChange={(checked) => 
                  setPermissions(prev => ({ ...prev, can_manage_startups: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="manage-startups" className="cursor-pointer font-medium">
                  Can manage startups
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add, edit, and delete startup records
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="manage-jurors"
                checked={permissions.can_manage_jurors}
                onCheckedChange={(checked) => 
                  setPermissions(prev => ({ ...prev, can_manage_jurors: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="manage-jurors" className="cursor-pointer font-medium">
                  Can manage jurors
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add, edit, and invite juror accounts
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="invite-cms"
                checked={permissions.can_invite_cms}
                onCheckedChange={(checked) => 
                  setPermissions(prev => ({ ...prev, can_invite_cms: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="invite-cms" className="cursor-pointer font-medium">
                  Can invite CMs
                </Label>
                <p className="text-sm text-muted-foreground">
                  Invite and manage other community managers
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Promoting...' : 'Promote to CM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
