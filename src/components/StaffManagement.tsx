import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Users, Mail, Shield, Trash2, Edit, UserCog, Eye, EyeOff } from "lucide-react";
import { ALL_MODULES } from "@/context/StaffContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface StaffAccount {
  id: string;
  admin_user_id: string;
  staff_user_id: string;
  staff_email: string;
  staff_name: string;
  is_active: boolean;
  allowed_modules: string[];
  created_at: string;
}

export const StaffManagement = () => {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    modules: [] as string[],
  });

  useEffect(() => {
    fetchStaffAccounts();
  }, []);

  const fetchStaffAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("staff_accounts")
        .select("*")
        .eq("admin_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaffList((data as StaffAccount[]) || []);
    } catch (error: any) {
      toast.error("Error fetching staff accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!formData.email || !formData.password || !formData.name) {
        toast.error("Please fill all required fields");
        return;
      }

      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      // Create the staff user account using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            is_staff: true,
            admin_id: user.id,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user account");

      // Create the staff account record
      const { error: staffError } = await supabase.from("staff_accounts").insert({
        admin_user_id: user.id,
        staff_user_id: authData.user.id,
        staff_email: formData.email,
        staff_name: formData.name,
        allowed_modules: formData.modules,
        is_active: true,
      });

      if (staffError) throw staffError;

      toast.success("Staff account created successfully!");
      setCreateOpen(false);
      setFormData({ name: "", email: "", password: "", modules: [] });
      fetchStaffAccounts();
    } catch (error: any) {
      console.error("Error creating staff:", error);
      toast.error(error.message || "Error creating staff account");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateModules = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from("staff_accounts")
        .update({ allowed_modules: formData.modules })
        .eq("id", selectedStaff.id);

      if (error) throw error;

      toast.success("Staff modules updated!");
      setEditOpen(false);
      fetchStaffAccounts();
    } catch (error: any) {
      toast.error("Error updating staff modules");
    }
  };

  const handleToggleActive = async (staff: StaffAccount) => {
    try {
      const { error } = await supabase
        .from("staff_accounts")
        .update({ is_active: !staff.is_active })
        .eq("id", staff.id);

      if (error) throw error;

      toast.success(`Staff ${staff.is_active ? "deactivated" : "activated"}!`);
      fetchStaffAccounts();
    } catch (error: any) {
      toast.error("Error updating staff status");
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from("staff_accounts")
        .delete()
        .eq("id", selectedStaff.id);

      if (error) throw error;

      toast.success("Staff account removed!");
      setDeleteOpen(false);
      setSelectedStaff(null);
      fetchStaffAccounts();
    } catch (error: any) {
      toast.error("Error removing staff account");
    }
  };

  const openEditDialog = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    setFormData({
      ...formData,
      modules: staff.allowed_modules,
    });
    setEditOpen(true);
  };

  const toggleModule = (moduleId: string) => {
    setFormData((prev) => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter((m) => m !== moduleId)
        : [...prev.modules, moduleId],
    }));
  };

  const selectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      modules: ALL_MODULES.map((m) => m.id),
    }));
  };

  const deselectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      modules: [],
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Staff Management
          </CardTitle>
          <CardDescription>
            Create and manage staff accounts with module-based access control
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStaff} className="flex-1 flex flex-col overflow-hidden">
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
              </div>

              <Separator />

              <div className="flex-1 overflow-hidden py-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Module Access</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllModules}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={deselectAllModules}>
                      Deselect All
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MODULES.map((module) => (
                      <div
                        key={module.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.modules.includes(module.id)
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/30 hover:bg-muted/50"
                        }`}
                        onClick={() => toggleModule(module.id)}
                      >
                        <Checkbox
                          checked={formData.modules.includes(module.id)}
                          onCheckedChange={() => toggleModule(module.id)}
                        />
                        <span className="text-sm font-medium">{module.label}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Staff Account"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No staff accounts yet</p>
            <p className="text-sm text-muted-foreground/70">
              Create staff accounts to give your team limited access
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{staff.staff_name}</p>
                      <Badge
                        variant="outline"
                        className={
                          staff.is_active
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {staff.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {staff.staff_email}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {staff.allowed_modules.length} modules
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={staff.is_active}
                    onCheckedChange={() => handleToggleActive(staff)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(staff)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Modules Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Module Access - {selectedStaff?.staff_name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Module Access</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllModules}>
                Select All
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={deselectAllModules}>
                Deselect All
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map((module) => (
                <div
                  key={module.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.modules.includes(module.id)
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => toggleModule(module.id)}
                >
                  <Checkbox
                    checked={formData.modules.includes(module.id)}
                    onCheckedChange={() => toggleModule(module.id)}
                  />
                  <span className="text-sm font-medium">{module.label}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateModules}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteStaff}
        title="Remove Staff Account"
        description={`Are you sure you want to remove ${selectedStaff?.staff_name}? They will no longer have access to your data.`}
        variant="destructive"
        confirmText="Remove"
      />
    </Card>
  );
};