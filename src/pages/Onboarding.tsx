import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EduvancaLoader } from "@/components/EduvancaLoader";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingBg } from "@/components/OnboardingBg";
import { BarChart3 } from "lucide-react";


const stepVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const StarPoint = ({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) => (
  <div className="flex gap-3 rounded-lg border p-4 bg-background/60">
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500/20 text-yellow-600 text-lg">
      ⭐
    </div>
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  </div>
);

const EduvancaCrmIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Bars */}
    <rect x="5" y="11" width="2.5" height="8" rx="1" fill="currentColor" />
    <rect x="10.75" y="7" width="2.5" height="12" rx="1" fill="currentColor" />
    <rect x="16.5" y="4" width="2.5" height="15" rx="1" fill="currentColor" />

    {/* Base line */}
    <rect x="4" y="19.5" width="16.5" height="1.5" rx="0.75" fill="currentColor" />
  </svg>
);



const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
  company_name: "",
  company_type: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  tax_id: "",
  gst_number: "",
  cin_number: "",
});


  // Check onboarding
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/auth");

      const { data } = await supabase
        .from("company_settings")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.onboarding_completed) {
        navigate("/dashboard");
      } else {
        setLoading(false);
      }
    };
    check();
  }, [navigate]);

  const handleSubmit = async () => {
    if (
  !form.company_name ||
  !form.company_type ||
  !form.email ||
  !form.phone
) {
  toast.error("Company name, email, and phone are required");
  return;
}


    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("company_settings").upsert({
        user_id: user.id,
        company_name: form.company_name,
        company_type: form.company_type,
        cin_number: form.company_type === "private_limited"
  ? form.cin_number
  : null,
        email: form.email,
        phone: form.phone,
        address: form.address || null,
        website: form.website || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country,
        tax_id: form.tax_id || null,
        gst_number: form.gst_number || null,

        quotation_template: "t1",
        brand_color: "#F9423A",
        billing_type: "inclusive_gst",
        show_tax_id: true,
        show_cin_number: true,
        show_gst_split: true,

        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      });

      toast.success("Setup complete 🚀");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <EduvancaLoader size={32} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/40 overflow-hidden">
  <OnboardingBg />

      <Card className="relative w-full max-w-xl p-6 backdrop-blur-md bg-background/80 shadow-xl">
      <div className="mb-4 flex justify-center gap-2">
  {[1, 2, 3, 4].map((s) => (
    <div
      key={s}
      className={`h-2 w-2 rounded-full transition ${
        step >= s ? "bg-indigo-600" : "bg-muted"
      }`}
    />
  ))}
</div>

        <AnimatePresence mode="wait">
          {/* STEP 1 — Welcome */}
          {step === 1 && (
  <motion.div
    key="step1"
    variants={stepVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    transition={{ duration: 0.4 }}
    className="text-center space-y-4"
  >
    {/* Eduvanca CRM Icon (same as sidebar) */}
    <div className="mx-auto w-fit p-3 bg-primary rounded-lg">
      <BarChart3 className="h-6 w-6 text-primary-foreground" />
    </div>

    <h1 className="text-3xl font-bold">Welcome to Eduvanca One</h1>

    <p className="text-muted-foreground">
      Let’s set up your company in less than a minute.
    </p>

    <Button size="lg" onClick={() => setStep(2)}>
      Get Started →
    </Button>
  </motion.div>
)}


          {/* STEP 2 — Eduvanca Value */}
{step === 2 && (
  <motion.div
    key="step2"
    variants={stepVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    transition={{ duration: 0.4 }}
    className="space-y-6"
  >
    <div className="text-center space-y-2">
      <h2 className="text-xl font-semibold">
        What Eduvanca sets up for you
      </h2>
      <p className="text-sm text-muted-foreground">
        Your company details power everything inside Eduvanca CRM.
      </p>
    </div>

    <div className="space-y-3">
      <StarPoint
        title="GST-ready billing & invoices"
        desc="Automatic tax calculation, invoice formats, and totals based on your company."
      />
      <StarPoint
        title="Sales pipeline built for your business"
        desc="Track leads, deals, customers, and follow-ups in one system."
      />
      <StarPoint
        title="Real-time reports & insights"
        desc="View revenue, sales activity, and performance without manual work."
      />
      <StarPoint
        title="One setup across all Eduvanca products"
        desc="Your details sync across CRM, Billing, Inventory, and more."
      />
      <StarPoint
        title="Editable anytime"
        desc="You can update company settings later as your business grows."
      />
    </div>

    <div className="flex justify-between pt-4">
      <Button variant="ghost" onClick={() => setStep(1)}>
        Back
      </Button>
      <Button onClick={() => setStep(3)}>
        Continue →
      </Button>
    </div>
  </motion.div>
)}


          {/* STEP 3 — Company Basics */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold">Company Basics</h2>

              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Company Type *</Label>
                <Select
                  value={form.company_type}
                  onValueChange={(v) => setForm({ ...form, company_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="private_limited">Private Limited</SelectItem>
                    <SelectItem value="llp">LLP</SelectItem>
                    <SelectItem value="opc">OPC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.company_type === "private_limited" && (
  <div className="space-y-2">
    <Label>CIN Number</Label>
    <Input
      placeholder="Enter CIN Number"
      value={form.cin_number}
      onChange={(e) =>
        setForm({ ...form, cin_number: e.target.value.toUpperCase() })
      }
    />
    <p className="text-xs text-muted-foreground">
      Applicable only for Private Limited companies
    </p>
  </div>
)}


              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)}>Next →</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Contact & Address */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold">Contact & Address</h2>

              <div className="grid grid-cols-2 gap-4">
  <div className="space-y-1">
    <Label>Email *</Label>
    <Input
      type="email"
      required
      placeholder="company@email.com"
      value={form.email}
      onChange={(e) => setForm({ ...form, email: e.target.value })}
    />
  </div>

  <div className="space-y-1">
    <Label>Phone *</Label>
    <Input
      required
      placeholder="9876543210"
      value={form.phone}
      onChange={(e) => setForm({ ...form, phone: e.target.value })}
    />
  </div>
</div>


              <Input
  placeholder="Website (optional)"
  value={form.website || ""}
  onChange={(e) => setForm({ ...form, website: e.target.value })}
/>


              <Input
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
  <Input
    placeholder="City"
    value={form.city}
    onChange={(e) => setForm({ ...form, city: e.target.value })}
  />
  <Input
    placeholder="State"
    value={form.state}
    onChange={(e) => setForm({ ...form, state: e.target.value })}
  />
</div>

<Input
  placeholder="Postal Code"
  value={form.postal_code}
  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
/>


              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? "Setting up..." : "Complete Setup"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default Onboarding;
