import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FileText, Eye } from "lucide-react";

interface StartupDetailsModalProps {
  startup: {
    id: string;
    name: string;
    description?: string;
    stage?: string;
    regions?: string[];
    verticals?: string[];
    contact_email?: string;
    founder_names?: string[];
    website?: string;
    pitch_deck_url?: string;
    demo_url?: string;
    averageScore?: number;
    totalScore?: number;
  } | null;
  open: boolean;
  onClose: () => void;
}

export const StartupDetailsModal = ({ startup, open, onClose }: StartupDetailsModalProps) => {
  const formatScore = (score?: number) => {
    return score != null ? score.toFixed(1) : 'N/A';
  };

  if (!startup) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {startup.name} - Application Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Stage:</span> {startup.stage || 'Not specified'}</div>
                <div><span className="font-medium">Regions:</span> {startup.regions?.join(', ') || 'Not specified'}</div>
                <div><span className="font-medium">Verticals:</span> {startup.verticals?.join(', ') || 'Not specified'}</div>
                <div><span className="font-medium">Contact:</span> {startup.contact_email || 'Not provided'}</div>
                <div><span className="font-medium">Founders:</span> {startup.founder_names?.join(', ') || 'Not specified'}</div>
                {startup.website && (
                  <div>
                    <span className="font-medium">Website:</span>{' '}
                    <a 
                      href={startup.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {startup.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {startup.description || 'No description available'}
              </p>
            </div>
          </div>

          {/* Right Column - Evaluation Data & Resources */}
          <div className="space-y-4">
            {(startup.averageScore != null || startup.totalScore != null) && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">Evaluation Metrics</h4>
                  <div className="space-y-3">
                    {startup.averageScore != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Score:</span>
                        <Badge variant="default" className="font-bold">
                          {formatScore(startup.averageScore)}/10
                        </Badge>
                      </div>
                    )}
                    {startup.totalScore != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Score:</span>
                        <Badge variant="outline">
                          {formatScore(startup.totalScore)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />
              </>
            )}

            <div>
              <h4 className="font-semibold mb-2">Resources</h4>
              <div className="space-y-2">
                {startup.pitch_deck_url && (
                  <a
                    href={startup.pitch_deck_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    Pitch Deck
                  </a>
                )}
                {startup.demo_url && (
                  <a
                    href={startup.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Eye className="w-4 h-4" />
                    Demo
                  </a>
                )}
                {!startup.pitch_deck_url && !startup.demo_url && (
                  <span className="text-sm text-muted-foreground">No resources available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};