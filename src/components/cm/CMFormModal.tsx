import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CMFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cm?: any;
  onSuccess: () => void;
}

export default function CMFormModal({
  open,
  onOpenChange,
  cm,
  onSuccess,
}: CMFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    jobTitle: "",
    linkedinUrl: "",
    permissions: {
      can_invite_cms: true,
      can_manage_jurors: true,
      can_manage_startups: true,
    },
  });

  useEffect(() => {
    if (cm) {
      setFormData({
        name: cm.name || "",
        email: cm.email || "",
        organization: cm.organization || "",
        jobTitle: cm.job_title || "",
        linkedinUrl: cm.linkedin_url || "",
        permissions: cm.permissions || {
          can_invite_cms: true,
          can_manage_jurors: true,
          can_manage_startups: true,
        },
      });
    } else {
      // Reset form for new CM
      setFormData({
        name: "",
        email: "",
        organization: "",
        jobTitle: "",
        linkedinUrl: "",
        permissions: {
          can_invite_cms: true,
          can_manage_jurors: true,
          can_manage_startups: true,
        },
      });
    }
  }, [cm, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (cm) {
        // Update existing CM
        const { error } = await supabase
          .from("community_managers")
          .update({
            name: formData.name,
            organization: formData.organization,
            job_title: formData.jobTitle,
            linkedin_url: formData.linkedinUrl,
            permissions: formData.permissions,
          })
          .eq("id", cm.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Community manager updated successfully",
        });
      } else {
        // Send invitation for new CM
        const { error } = await supabase.functions.invoke("send-cm-invitation", {
          body: {
            name: formData.name,
            email: formData.email,
            organization: formData.organization,
            jobTitle: formData.jobTitle,
            permissions: formData.permissions,
          },
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Invitation sent successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving CM:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save community manager",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cm ? "Edit Community Manager" : "Invite Community Manager"}
          </DialogTitle>
          <DialogDescription>
            {cm
              ? "Update community manager details"
              : "Send an invitation to join as a community manager"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={!!cm}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) =>
                  setFormData({ ...formData, organization: e.target.value })
                }
                placeholder="Aurora Tech Awards"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) =>
                  setFormData({ ...formData, jobTitle: e.target.value })
                }
                placeholder="Community Manager"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
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

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_invite_cms"
                  checked={formData.permissions.can_invite_cms}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        can_invite_cms: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="can_invite_cms" className="font-normal">
                  Can invite other community managers
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_manage_jurors"
                  checked={formData.permissions.can_manage_jurors}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        can_manage_jurors: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="can_manage_jurors" className="font-normal">
                  Can manage jurors
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_manage_startups"
                  checked={formData.permissions.can_manage_startups}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        can_manage_startups: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="can_manage_startups" className="font-normal">
                  Can manage startups
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cm ? "Update" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
