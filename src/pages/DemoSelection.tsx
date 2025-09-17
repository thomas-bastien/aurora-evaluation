import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useDemoContext } from "@/contexts/DemoContext";
import { Shield, Users } from "lucide-react";

const DemoSelection = () => {
  const navigate = useNavigate();
  const { setDemoRole, demoData } = useDemoContext();

  const handleAdminDemo = () => {
    setDemoRole('admin');
    navigate('/demo/admin/dashboard');
  };

  const handleVCDemo = () => {
    setDemoRole('vc', 'demo-juror-1'); // Default to first juror
    navigate('/demo/vc/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            <span>DEMO MODE</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Demo Experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore Aurora's evaluation platform from different perspectives. All data is realistic but completely isolated from live systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={handleAdminDemo}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Admin View</CardTitle>
              <CardDescription>
                Full platform management including startup evaluation, juror assignments, and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Manage {demoData.startups.length} demo startups</li>
                <li>• Oversee {demoData.jurors.length} VC partners</li>
                <li>• View evaluation progress and analytics</li>
                <li>• Control matchmaking and assignments</li>
              </ul>
              <Button className="w-full">
                Explore Admin Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={handleVCDemo}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">VC Partner View</CardTitle>
              <CardDescription>
                Evaluate assigned startups, manage pitch sessions, and track your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Evaluate assigned startups</li>
                <li>• Score and provide feedback</li>
                <li>• Schedule pitch meetings</li>
                <li>• Track evaluation progress</li>
              </ul>
              <Button className="w-full">
                Explore VC Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            This is a safe demo environment with no impact on live data
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoSelection;