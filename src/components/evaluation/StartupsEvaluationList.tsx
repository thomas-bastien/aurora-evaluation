import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle
} from "lucide-react";

interface AssignedStartup {
  id: string;
  name: string;
  description: string;
  industry: string;
  stage: string;
  contact_email: string;
  website: string;
  pitch_deck_url: string;
  demo_url: string;
  location: string;
  region: string;
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
}

export const StartupsEvaluationList = ({ startups, loading, onEvaluationUpdate }: StartupsEvaluationListProps) => {
  const [selectedStartup, setSelectedStartup] = useState<AssignedStartup | null>(null);

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
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (startups.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Startups Assigned</h3>
          <p className="text-muted-foreground">
            You don't have any startups assigned for evaluation yet. 
            Please contact your administrator if you believe this is an error.
          </p>
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
                    <Badge variant="secondary">{startup.industry}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {startup.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(startup.evaluation_status)}
                  {startup.overall_score && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-primary">
                        <Star className="w-4 h-4" />
                        {startup.overall_score.toFixed(1)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Startup Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{startup.stage}</span>
                  </div>
                  {startup.region && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{startup.region}</span>
                    </div>
                  )}
                  {startup.country && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>{startup.country}</span>
                    </div>
                  )}
                </div>

                {/* Resources */}
                <div className="flex flex-wrap gap-2">
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

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => setSelectedStartup(startup)}
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
                      onClick={() => setSelectedStartup(startup)}
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
        />
      )}
    </>
  );
};