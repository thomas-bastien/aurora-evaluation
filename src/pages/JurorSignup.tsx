import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { REGION_OPTIONS, VERTICAL_OPTIONS, STAGE_OPTIONS } from "@/constants/jurorPreferences";

const JurorSignup = () => {
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [calendlyLink, setCalendlyLink] = useState("");
  const [targetVerticals, setTargetVerticals] = useState<string[]>([]);
  const [preferredStages, setPreferredStages] = useState<string[]>([]);
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
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
        console.log("Validating token:", token);
        
        // First check if token exists at all
        const { data: allData, error: checkError } = await supabase
          .from('jurors')
          .select('*')
          .eq('invitation_token', token)
          .maybeSingle();

        console.log("Token check result:", { allData, checkError });

        if (checkError) {
          console.error("Database error during token validation:", checkError);
          setError("Database error. Please try again or contact support.");
          setValidatingToken(false);
          return;
        }

        if (!allData) {
          console.log("No juror found with this token");
          setError("Invalid invitation token. Please check your email for the correct link or request a new invitation.");
          setValidatingToken(false);
          return;
        }

        // Check if already used
        if (allData.user_id) {
          console.log("Token already used for user:", allData.user_id);
          setError("This invitation has already been used. If you need to reset your password, please use the sign-in page.");
          setValidatingToken(false);
          return;
        }

        // Check if expired
        const now = new Date();
        const expiryDate = new Date(allData.invitation_expires_at);
        console.log("Expiry check:", { now: now.toISOString(), expiry: allData.invitation_expires_at, expired: now > expiryDate });

        if (now > expiryDate) {
          console.log("Token has expired");
          setError("This invitation has expired. Please contact Aurora to request a new invitation.");
          setValidatingToken(false);
          return;
        }

        console.log("Token validation successful");
        setJurorData(allData);
      } catch (err) {
        console.error("Token validation failed:", err);
        setError("Failed to validate invitation. Please try again or contact support.");
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
      // Clear any existing session first
      await supabase.auth.signOut();
      
      // Call edge function to complete signup with auto-confirmed email
      const { data, error } = await supabase.functions.invoke('complete-juror-signup', {
        body: {
          token,
          password,
          calendlyLink,
          targetVerticals,
          preferredStages,
          preferredRegions
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Account created successfully!",
        description: "You can now sign in with your credentials."
      });

      // Redirect to auth page for fresh login
      navigate('/auth');
    } catch (err: any) {
      console.error("Signup error:", err);
      const errorMessage = err.message || 'Failed to create account. Please try again.';
      
      // Provide more specific error messages based on the error
      if (errorMessage.includes("Invalid invitation token")) {
        setError("The invitation token is invalid. Please check your email for the correct link.");
      } else if (errorMessage.includes("expired")) {
        setError("This invitation has expired. Please contact Aurora for a new invitation.");
      } else if (errorMessage.includes("already been used")) {
        setError("This invitation has already been used. Try signing in instead.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
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
                <Label htmlFor="calendly">Scheduling Link (Optional)</Label>
                <Input
                  id="calendly"
                  type="url"
                  placeholder="https://calendly.com/your-link"
                  value={calendlyLink}
                  onChange={(e) => setCalendlyLink(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Regions (Optional)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {REGION_OPTIONS.map(region => (
                    <Badge 
                      key={region} 
                      variant={preferredRegions.includes(region) ? "default" : "outline"} 
                      className="cursor-pointer" 
                      onClick={() => setPreferredRegions(toggleArrayItem(preferredRegions, region))}
                    >
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Verticals (Optional)</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {VERTICAL_OPTIONS.map(vertical => (
                    <Badge 
                      key={vertical} 
                      variant={targetVerticals.includes(vertical) ? "default" : "outline"} 
                      className="cursor-pointer" 
                      onClick={() => setTargetVerticals(toggleArrayItem(targetVerticals, vertical))}
                    >
                      {vertical}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Investment Stages (Optional)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STAGE_OPTIONS.map(stage => (
                    <Badge 
                      key={stage} 
                      variant={preferredStages.includes(stage) ? "default" : "outline"} 
                      className="cursor-pointer" 
                      onClick={() => setPreferredStages(toggleArrayItem(preferredStages, stage))}
                    >
                      {stage}
                    </Badge>
                  ))}
                </div>
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