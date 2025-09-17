import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface VideoPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title: string;
}

export const VideoPlayerModal = ({ 
  open, 
  onOpenChange, 
  videoUrl, 
  title 
}: VideoPlayerModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] p-0 bg-background border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={videoUrl}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};