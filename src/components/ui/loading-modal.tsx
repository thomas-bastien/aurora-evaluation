import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  open: boolean;
  title?: string;
  description?: string;
}

export const LoadingModal = ({ 
  open, 
  title = "Loading...", 
  description = "Please wait while we fetch your data." 
}: LoadingModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};