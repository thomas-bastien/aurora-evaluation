import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ManualMatchingDropdownsProps {
  invitationId: string;
  allStartups: Array<{ id: string; name: string; }>;
  allJurors: Array<{ id: string; name: string; }>;
  onMatch: (invitationId: string, startupId: string, jurorId: string) => void;
}

const ManualMatchingDropdowns = ({ 
  invitationId, 
  allStartups, 
  allJurors, 
  onMatch 
}: ManualMatchingDropdownsProps) => {
  const [selectedStartup, setSelectedStartup] = useState<string>("");
  const [selectedJuror, setSelectedJuror] = useState<string>("");

  const handleMatch = () => {
    if (selectedStartup && selectedJuror) {
      onMatch(invitationId, selectedStartup, selectedJuror);
      setSelectedStartup("");
      setSelectedJuror("");
    } else {
      toast.error('Please select both startup and juror');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={selectedStartup} onValueChange={setSelectedStartup}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select Startup" />
          </SelectTrigger>
          <SelectContent>
            {allStartups.map(startup => (
              <SelectItem key={startup.id} value={startup.id}>
                {startup.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedJuror} onValueChange={setSelectedJuror}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select Juror" />
          </SelectTrigger>
          <SelectContent>
            {allJurors.map(juror => (
              <SelectItem key={juror.id} value={juror.id}>
                {juror.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleMatch}
        disabled={!selectedStartup || !selectedJuror}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Match
      </Button>
    </div>
  );
};

export default ManualMatchingDropdowns;