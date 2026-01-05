import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { EduvancaLoader } from "@/components/EduvancaLoader";

const CompanySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    website: "",
    tax_id: "",
    gst_number: "",
    quotation_template: "t1",
    brand_color: "#F9423A",
    company_type: "",
    cin_number: "",
    show_tax_id: true,
    show_cin_number: true,
    //show_gst_number: true,
    billing_type: "inclusive_gst",
show_gst_split: true,

  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
  if (formData.billing_type === "exclusive_gst") {
    setFormData((prev) => ({ ...prev, show_gst_split: true }));
  }
}, [formData.billing_type]);


  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setFormData({
          company_name: data.company_name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          country: data.country || "",
          website: data.website || "",
          tax_id: data.tax_id || "",
          gst_number: (data as any).gst_number || "",
          quotation_template: (data as any).quotation_template || "t1",
          brand_color: (data as any).brand_color || "#F9423A",
          company_type: (data as any).company_type || "",
          cin_number: (data as any).cin_number || "",
          show_tax_id: (data as any).show_tax_id !== false,
          show_cin_number: (data as any).show_cin_number !== false,
         // show_gst_number: (data as any).show_gst_number !== false,
          billing_type: (data as any).billing_type || "inclusive_gst",
show_gst_split: (data as any).show_gst_split !== false,

        });
      }
    } catch (error: any) {
      toast.error("Error fetching settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First check if settings exist
      const { data: existingSettings } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let error;
      if (existingSettings) {
        // Update existing
        const result = await supabase
          .from("company_settings")
          .update({
            company_name: formData.company_name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            postal_code: formData.postal_code || null,
            country: formData.country || null,
            website: formData.website || null,
            tax_id: formData.tax_id || null,
            gst_number: formData.gst_number || null,
            quotation_template: formData.quotation_template,
            brand_color: formData.brand_color,
            company_type: formData.company_type || null,
            cin_number: formData.cin_number || null,
            show_tax_id: formData.show_tax_id,
            show_cin_number: formData.show_cin_number,
            billing_type: formData.billing_type,
show_gst_split: formData.show_gst_split,
onboarding_completed: true,
onboarding_completed_at: new Date().toISOString(),


          })
          .eq("user_id", user.id);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("company_settings")
          .insert({
            company_name: formData.company_name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            postal_code: formData.postal_code || null,
            country: formData.country || null,
            website: formData.website || null,
            tax_id: formData.tax_id || null,
            gst_number: formData.gst_number || null,
            quotation_template: formData.quotation_template,
            brand_color: formData.brand_color,
            company_type: formData.company_type || null,
            cin_number: formData.cin_number || null,
            show_tax_id: formData.show_tax_id,
            show_cin_number: formData.show_cin_number,
            billing_type: formData.billing_type,
show_gst_split: formData.show_gst_split,
onboarding_completed: true,
onboarding_completed_at: new Date().toISOString(),


            user_id: user.id,
          });
        error = result.error;
      }

      if (error) throw error;

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12"><EduvancaLoader size={32} /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company information for documents</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This information will appear on your quotations, invoices, and other documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                />
              </div>
            </div>

            

            <div className="space-y-2">
              <Label htmlFor="company_type">Company Type</Label>
              <Select 
                value={formData.company_type} 
                onValueChange={(value) => setFormData({ ...formData, company_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="private_limited">Private Limited</SelectItem>
                  <SelectItem value="public_limited">Public Limited</SelectItem>
                  <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                  <SelectItem value="one_person_company">One Person Company (OPC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.company_type === "private_limited" && (
              <div className="space-y-2">
                <Label htmlFor="cin_number">CIN Number</Label>
                <Input
                  id="cin_number"
                  value={formData.cin_number}
                  onChange={(e) => setFormData({ ...formData, cin_number: e.target.value })}
                  placeholder="Enter CIN Number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="brand_color">Brand Color (for invoices)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="brand_color"
                  type="color"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  placeholder="#F9423A"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for company name and totals color in invoices</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice & Quotation Settings</CardTitle>
            <CardDescription>
              Control what information appears on your invoices and quotations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            

            <div className="space-y-2">
  <Label>Billing Type</Label>
  <Select
    value={formData.billing_type}
    onValueChange={(value) => setFormData({ ...formData, billing_type: value })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select billing type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="inclusive_gst">Inclusive GST (MRP includes GST)</SelectItem>
      <SelectItem value="exclusive_gst">Exclusive GST (GST added extra)</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Inclusive = GST included in item price | Exclusive = GST added on top
  </p>
</div>


            

            <div className="flex items-center justify-between space-x-2">
  <div className="space-y-0.5">
    <Label htmlFor="show_gst_split">Show GST Split (CGST/SGST)</Label>
    <p className="text-sm text-muted-foreground">
      Turn off to hide tax columns but still calculate GST internally
    </p>
  </div>

  <Switch
    id="show_gst_split"
    checked={
      formData.billing_type === "exclusive_gst"
        ? true // exclusive → always ON
        : formData.show_gst_split
    }
    disabled={formData.billing_type === "exclusive_gst"} // lock the toggle
    onCheckedChange={(checked) =>
      formData.billing_type === "inclusive_gst" &&
      setFormData({ ...formData, show_gst_split: checked })
    }
    className={
      formData.billing_type === "exclusive_gst"
        ? "opacity-50 cursor-not-allowed"
        : ""
    }
  />
</div>



            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CompanySettings;
