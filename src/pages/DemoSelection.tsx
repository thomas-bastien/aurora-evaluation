import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayerModal } from "@/components/ui/video-player-modal";
import { Shield, Users, Play } from "lucide-react";

const DemoSelection = () => {
  const [activeModal, setActiveModal] = useState<'admin' | 'vc' | null>(null);

  const handleAdminDemo = () => {
    setActiveModal('admin');
  };

  const handleVCDemo = () => {
    setActiveModal('vc');
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Play className="w-4 h-4" />
            <span>VIDEO DEMOS</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Demo Experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch video demonstrations of Aurora's evaluation platform from different user perspectives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={handleAdminDemo}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Community Manager Demo</CardTitle>
              <CardDescription>
                See how admins manage the full evaluation process, assignments, and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Platform management overview</li>
                <li>• Juror assignment workflows</li>
                <li>• Evaluation progress tracking</li>
                <li>• Analytics and reporting tools</li>
              </ul>
              <Button className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Watch Demo Video
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={handleVCDemo}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Juror Demo</CardTitle>
              <CardDescription>
                Experience the evaluation process from a VC partner's perspective
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Startup evaluation workflows</li>
                <li>• Scoring and feedback forms</li>
                <li>• Pitch session scheduling</li>
                <li>• Progress tracking dashboard</li>
              </ul>
              <Button className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Watch Demo Video
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            These are video demonstrations of the platform in action
          </p>
        </div>

        <VideoPlayerModal
          open={activeModal === 'admin'}
          onOpenChange={closeModal}
          videoUrl="https://www.loom.com/embed/2a823ca88abe413c99d12c09270ed084"
          title="Community Manager Demo"
        />

        <VideoPlayerModal
          open={activeModal === 'vc'}
          onOpenChange={closeModal}
          videoUrl="https://www.loom.com/embed/ac0ae0a3e49e4b17927ed0b729312f2c"
          title="Juror Demo"
        />
      </div>
    </div>
  );
};

export default DemoSelection;