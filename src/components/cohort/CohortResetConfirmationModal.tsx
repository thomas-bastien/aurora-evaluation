import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface CohortResetConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohortName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const CohortResetConfirmationModal = ({
  open,
  onOpenChange,
  cohortName,
  onConfirm,
  isLoading = false,
}: CohortResetConfirmationModalProps) => {
  const [confirmText, setConfirmText] = useState('');

  const isConfirmed = confirmText === cohortName;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText('');
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Reset Cohort Data</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p className="font-semibold text-foreground">
              This will permanently delete all data for this cohort:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>All startups and their evaluations</li>
              <li>All jurors and their assignments</li>
              <li>All screening and pitching evaluations</li>
              <li>All communications and workflows</li>
              <li>All calendar invitations and sessions</li>
              <li>All matchmaking assignments</li>
            </ul>
            <p className="text-destructive font-medium pt-2">
              The cohort settings (name, deadlines) will remain intact.
            </p>
            <p className="text-destructive font-medium">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono font-semibold">{cohortName}</span> to confirm:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter cohort name"
              disabled={isLoading}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Cohort Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
