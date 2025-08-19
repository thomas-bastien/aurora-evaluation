import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Building2, Mail, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Startup {
  id: string;
  name: string;
  industry: string;
  stage: string;
  description: string;
  location: string;
  founder_names: string[];
}

interface Juror {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
}

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface StartupAssignmentModalProps {
  startup: Startup;
  jurors: Juror[];
  existingAssignments: Assignment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (assignments: Assignment[]) => void;
}

export const StartupAssignmentModal = ({
  startup,
  jurors,
  existingAssignments,
  open,
  onOpenChange,
  onComplete
}: StartupAssignmentModalProps) => {
  const [selectedJurorIds, setSelectedJurorIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Initialize selected jurors from existing assignments
  useEffect(() => {
    setSelectedJurorIds(existingAssignments.map(a => a.juror_id));
  }, [existingAssignments]);

  const filteredJurors = jurors.filter(juror =>
    juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    juror.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    juror.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleJurorToggle = (jurorId: string) => {
    setSelectedJurorIds(prev => 
      prev.includes(jurorId)
        ? prev.filter(id => id !== jurorId)
        : [...prev, jurorId]
    );
  };

  const handleSave = () => {
    if (selectedJurorIds.length < 3) {
      toast({
        title: "Insufficient Jurors",
        description: "Please select at least 3 jurors for this startup.",
        variant: "destructive"
      });
      return;
    }

    const newAssignments: Assignment[] = selectedJurorIds.map(jurorId => {
      const juror = jurors.find(j => j.id === jurorId);
      return {
        startup_id: startup.id,
        juror_id: jurorId,
        startup_name: startup.name,
        juror_name: juror?.name || ''
      };
    });

    onComplete(newAssignments);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Assign Jurors to {startup.name}
          </DialogTitle>
          <DialogDescription>
            Select at least 3 jurors to evaluate this startup. You can assign more than 3 if needed.
          </DialogDescription>
        </DialogHeader>

        {/* Startup Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{startup.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{startup.industry}</Badge>
                <Badge variant="outline">{startup.stage}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{startup.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{startup.location}</span>
                {startup.founder_names && startup.founder_names.length > 0 && (
                  <span>Founders: {startup.founder_names.join(", ")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search jurors by name, company, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection Summary */}
        <div className="mb-4 p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected: {selectedJurorIds.length} jurors
            </span>
            <span className="text-sm text-muted-foreground">
              {selectedJurorIds.length >= 3 ? (
                <span className="text-success">✓ Minimum requirement met</span>
              ) : (
                <span className="text-destructive">Minimum 3 jurors required</span>
              )}
            </span>
          </div>
        </div>

        {/* Jurors List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredJurors.map((juror) => {
            const isSelected = selectedJurorIds.includes(juror.id);
            
            return (
              <div
                key={juror.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => handleJurorToggle(juror.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {}} // Handled by parent onClick
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{juror.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{juror.job_title}</span>
                      <span>@{juror.company}</span>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {juror.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredJurors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No jurors found matching your search criteria.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedJurorIds.length} of {jurors.length} jurors selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={selectedJurorIds.length < 3}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};