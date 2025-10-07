import { useState } from "react";
import { formatScore } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingModal } from "@/components/ui/loading-modal";
import { StartupEvaluationModal } from "./StartupEvaluationModal";
import { 
  Building2, 
  MapPin, 
  Users, 
  DollarSign, 
  Calendar,
  Globe,
  FileText,
  Video,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";

interface AssignedStartup {
  id: string;
  name: string;
  description: string;
  verticalsText: string;
  regionsText: string;
  regions?: string[];
  stage: string;
  contact_email: string;
  website: string;
  pitch_deck_url: string;
  demo_url: string;
  location: string;
  country: string;
  linkedin_url: string;
  evaluation_status: 'not_started' | 'draft' | 'completed';
  evaluation_id?: string;
  overall_score?: number;
}

interface StartupsEvaluationListProps {
  startups: AssignedStartup[];
  loading: boolean;
  onEvaluationUpdate: () => void;
  currentRound: 'screening' | 'pitching';
}

export const StartupsEvaluationList = ({ startups, loading, onEvaluationUpdate, currentRound }: StartupsEvaluationListProps) => {
  const [selectedStartup, setSelectedStartup] = useState<AssignedStartup | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('edit');

  const handleOpenModal = (startup: AssignedStartup, mode: 'view' | 'edit') => {
    setSelectedStartup(startup);
    setModalMode(mode);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Not Started</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'draft':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  if (loading) {
    return <LoadingModal open={loading} title="Loading Evaluations" description="Please wait while we fetch your assigned startups..." />;
  }

  if (startups.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Startups Assigned for Evaluation</h3>
          <div className="space-y-2 text-muted-foreground">
            <p><strong>Juror Workflow:</strong> You evaluate startups assigned to you by Community Managers.</p>
            <p>You don't have any startups assigned for evaluation in this round yet. The Community Manager will assign startups to you through the matchmaking process.</p>
            <p className="text-sm">Contact your administrator if you believe this is an error.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {startups.map((startup) => (
          <Card key={startup.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    {getStatusIcon(startup.evaluation_status)}
                    {startup.name}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {startup.description}
                  </CardDescription>
                  
                  {/* Overview Tags */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {startup.verticalsText && (
                      <Badge variant="secondary">
                        <Building2 className="w-3 h-3 mr-1" />
                        {startup.verticalsText}
                      </Badge>
                    )}
                    {startup.stage && (
                      <Badge variant="outline">
                        <Star className="w-3 h-3 mr-1" />
                        {startup.stage}
                      </Badge>
                    )}
                    {startup.regionsText && (
                      <Badge variant="outline">
                        <MapPin className="w-3 h-3 mr-1" />
                        {startup.regionsText}
                      </Badge>
                    )}
                    {startup.country && (
                      <Badge variant="outline">
                        <Globe className="w-3 h-3 mr-1" />
                        {startup.country}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(startup.evaluation_status)}
                  {startup.overall_score && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-primary">
                        <Star className="w-4 h-4" />
                        {formatScore(startup.overall_score)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Resources Section */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Resources & Links</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/startup/${startup.id}`, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Startup Profile
                    </Button>
                    {startup.linkedin_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.linkedin_url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Building2 className="w-4 h-4" />
                        LinkedIn
                      </Button>
                    )}
                    {startup.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.website, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                      </Button>
                    )}
                    {startup.pitch_deck_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.pitch_deck_url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Pitch Deck
                      </Button>
                    )}
                    {startup.demo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(startup.demo_url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Full Application
                      </Button>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleOpenModal(startup, startup.evaluation_status === 'completed' ? 'view' : 'edit')}
                    className="flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    {startup.evaluation_status === 'completed' ? 'View Evaluation' : 
                     startup.evaluation_status === 'draft' ? 'Continue Evaluation' : 
                     'Start Evaluation'}
                  </Button>
                  
                  {startup.evaluation_status === 'completed' && (
                    <Button
                      variant="outline"
                      onClick={() => handleOpenModal(startup, 'edit')}
                    >
                      Edit Evaluation
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evaluation Modal */}
      {selectedStartup && (
        <StartupEvaluationModal
          startup={selectedStartup}
          open={!!selectedStartup}
          onClose={() => setSelectedStartup(null)}
          onEvaluationUpdate={onEvaluationUpdate}
          mode={modalMode}
          currentRound={currentRound}
        />
      )}
    </>
  );
};