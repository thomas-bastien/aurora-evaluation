import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";

export default function CMSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cmData, setCmData] = useState<any>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    linkedinUrl: "",
  });

  useEffect(() => {
    if (!token) {
      toast({
        title: "Error",
        description: "Invalid invitation link",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from("community_managers")
        .select("*")
        .eq("invitation_token", token)
        .maybeSingle();

      if (error || !data) {
        throw new Error("Invalid invitation token");
      }

      if (data.user_id) {
        toast({
          title: "Error",
          description: "This invitation has already been used",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const expiresAt = new Date(data.invitation_expires_at);
      if (expiresAt < new Date()) {
        toast({
          title: "Error",
          description: "This invitation has expired",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setCmData(data);
    } catch (error: any) {
      console.error("Error validating token:", error);
      toast({
        title: "Error",
        description: "Invalid or expired invitation",
        variant: "destructive",
      });
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("complete-cm-signup", {
        body: {
          token,
          password: formData.password,
          linkedinUrl: formData.linkedinUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account created successfully! Please sign in.",
      });

      navigate("/auth");
    } catch (error: any) {
      console.error("Error completing signup:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Aurora as a Community Manager</CardTitle>
          <CardDescription>
            Welcome, {cmData?.name}! Complete your account setup below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={cmData?.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                minLength={8}
                placeholder="Re-enter your password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL (Optional)</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkedinUrl: e.target.value })
                }
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
