import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PLATFORMS = [
  "HTML", "React", "Next.js", "Vue", "Angular",
  "WordPress", "Wix", "Shopify", "PHP", "Laravel",
];

export default function FormEmbedIntegration() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [formId, setFormId] = useState("my_form_01");
  const [platform, setPlatform] = useState("HTML");
  const [embedCode, setEmbedCode] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (token) generateEmbedCode(platform, formId, token);
  }, [platform, formId, token]);

  async function loadUser() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    setUser(auth.user);
    loadOrCreateToken(auth.user.id);
  }

  async function loadOrCreateToken(uid: string) {
    const { data } = await supabase
      .from("company_settings")
      .select("form_embed_token")
      .eq("user_id", uid)
      .maybeSingle();

    let t = data?.form_embed_token;

    if (!t) {
      t = await generateTokenFromServer(uid);

      await supabase
        .from("company_settings")
        .update({ form_embed_token: t })
        .eq("user_id", uid);
    }

    setToken(t);
    generateEmbedCode(platform, formId, t);   // <-- Important!
  }

  async function generateTokenFromServer(userId: string) {
    const res = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embed-token`,
  {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ user_id: userId }),
  }
);


    const json = await res.json();
    return json.token;
  }

  async function regenerateToken() {
    const newToken = await generateTokenFromServer(user.id);

    await supabase
      .from("company_settings")
      .update({ form_embed_token: newToken })
      .eq("user_id", user.id);

    setToken(newToken);
    toast.success("Token refreshed");
  }

  function generateEmbedCode(platform: string, formId: string, token: string) {
    const script = `<script src="https://eduvanca.com/forms-v5.js" data-token="${token}"></script>`;

    const formCode = `<form data-form-id="${formId}">
  <!-- Your custom fields -->
</form>`;

    setEmbedCode(`${script}\n\n${formCode}`);
  }

  return (
  <div className="max-w-5xl mx-auto py-10 space-y-6">
    
    {/* Header */}
    <div>
      <h1 className="text-2xl font-bold">Website Form Integration</h1>
      <p className="text-sm text-muted-foreground">
        Embed Eduvanca forms into your website and capture leads directly into CRM.
      </p>
    </div>

    {/* STEP 1 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 1: Form Details</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium">Form Identifier</label>
          <Input
            className="mt-1"
            placeholder="eg: contact_form_v1"
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            This ID is used to map submissions inside Eduvanca CRM
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Platform</label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select where you want to embed the form
          </p>
        </div>
      </CardContent>
    </Card>

    {/* STEP 2 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 2: Embed Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          readOnly
          value={embedCode}
          className="h-64 font-mono text-xs bg-muted"
        />
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(embedCode);
              toast.success("Embed code copied");
            }}
          >
            Copy Code
          </Button>
          <Button variant="outline">
            View Sample HTML
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* STEP 3 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 3: Security</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Embed Token</p>
          <p className="text-xs text-muted-foreground break-all">
            {token}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Used to securely associate form submissions with your account
          </p>
        </div>

        <Button variant="destructive" onClick={regenerateToken}>
          Regenerate Token
        </Button>
      </CardContent>
    </Card>

    {/* Help */}
    <div className="rounded-lg border-2 border-blue-500 bg-blue-50/60 p-5 text-sm">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    
    <div>
      <p className="font-semibold text-blue-700">
        Need Help with Form Integration?
      </p>

      <ul className="list-disc pl-5 mt-2 text-blue-700/90 space-y-1 text-sm">
        <li>Embed the script once per page</li>
        <li>Use unique form IDs per form</li>
        <li>Submissions auto-sync to Leads</li>
        <li>Regenerate token if compromised</li>
      </ul>
    </div>

    <Button
      className="bg-blue-600 hover:bg-blue-700 text-white"
      onClick={() => {
        // later you can route this to support page or open chat
        toast("Support team will assist you shortly");
      }}
    >
      Contact Support
    </Button>

  </div>
</div>


  </div>
);

}
