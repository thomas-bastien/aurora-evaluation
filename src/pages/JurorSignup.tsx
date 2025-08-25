import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const JurorSignup = () => {
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [calendlyLink, setCalendlyLink] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [jurorData, setJurorData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. Please check your email for the correct link.");
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        const { data, error } = await supabase
          .from('jurors')
          .select('*')
          .eq('invitation_token', token)
          .gt('invitation_expires_at', new Date().toISOString())
          .is('user_id', null)
          .maybeSingle();

        if (error || !data) {
          setError("Invalid or expired invitation link.");
        } else {
          setJurorData(data);
        }
      } catch (err) {
        setError("Failed to validate invitation.");
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: jurorData.email,
        password: password,
        options: {
          data: {
            full_name: jurorData.name,
            role: 'vc'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update juror record to link with user
        const { error: jurorUpdateError } = await supabase
          .from('jurors')
          .update({ 
            user_id: authData.user.id,
            invitation_token: null // Clear the token after use
          })
          .eq('id', jurorData.id);

        if (jurorUpdateError) throw jurorUpdateError;

        // Create profile with additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            calendly_link: calendlyLink || null,
            expertise: expertise.length > 0 ? expertise : null,
            investment_stages: investmentStages.length > 0 ? investmentStages : null,
            organization: jurorData.company || null
          })
          .eq('user_id', authData.user.id);

        if (profileError) throw profileError;

        toast({
          title: "Account created successfully!",
          description: "Welcome to Aurora Evaluation Platform."
        });

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpertiseChange = (value: string) => {
    const areas = value.split(',').map(area => area.trim()).filter(Boolean);
    setExpertise(areas);
  };

  const handleStagesChange = (value: string) => {
    const stages = value.split(',').map(stage => stage.trim()).filter(Boolean);
    setInvestmentStages(stages);
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Validating invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!jurorData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} className="w-full mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4 mx-auto">
              <span>Aurora Evaluation Platform</span>
            </div>
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription>
              Welcome {jurorData.name}! Set up your account to get started.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border/50">
              <h4 className="text-sm font-medium text-foreground mb-2">Your Invitation Details</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div><strong>Name:</strong> {jurorData.name}</div>
                <div><strong>Email:</strong> {jurorData.email}</div>
                {jurorData.job_title && <div><strong>Position:</strong> {jurorData.job_title}</div>}
                {jurorData.company && <div><strong>Company:</strong> {jurorData.company}</div>}
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendly">Calendly Link (Optional)</Label>
                <Input
                  id="calendly"
                  type="url"
                  placeholder="https://calendly.com/your-link"
                  value={calendlyLink}
                  onChange={(e) => setCalendlyLink(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expertise">Areas of Expertise (Optional)</Label>
                <Input
                  id="expertise"
                  type="text"
                  placeholder="e.g. FinTech, AI, SaaS (comma-separated)"
                  onChange={(e) => handleExpertiseChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stages">Investment Stages (Optional)</Label>
                <Input
                  id="stages"
                  type="text"
                  placeholder="e.g. Seed, Series A, Growth (comma-separated)"
                  onChange={(e) => handleStagesChange(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account & Join Platform
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JurorSignup;