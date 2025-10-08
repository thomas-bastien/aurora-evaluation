import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Admin } from "./AdminsTable";

interface AdminFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (admin: Omit<Admin, 'id' | 'user_id' | 'invitation_token' | 'invitation_sent_at' | 'invitation_expires_at' | 'created_at' | 'updated_at'>) => void;
  editingAdmin?: Admin | null;
}

export function AdminFormModal({ open, onOpenChange, onSubmit, editingAdmin }: AdminFormModalProps) {
  const [formData, setFormData] = useState({
    name: editingAdmin?.name || '',
    email: editingAdmin?.email || '',
    job_title: editingAdmin?.job_title || '',
    organization: editingAdmin?.organization || '',
    linkedin_url: editingAdmin?.linkedin_url || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      email: '',
      job_title: '',
      organization: '',
      linkedin_url: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</DialogTitle>
            <DialogDescription>
              {editingAdmin ? 'Update admin information' : 'Add a new administrator to the platform'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!editingAdmin}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingAdmin ? 'Update' : 'Create'} Admin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
