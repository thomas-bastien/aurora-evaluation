import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const handleGetAccess = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] p-0 bg-background border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6">
          <div className="relative w-full mb-6" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={videoUrl}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
          </div>
          
          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 mb-6 text-center border border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Get Early Access
            </h3>
            <p className="text-muted-foreground mb-4">
              Your input helps shape the platform.
            </p>
            <Button 
              onClick={handleGetAccess}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};