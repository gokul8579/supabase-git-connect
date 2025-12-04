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
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Website Form Integration</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div>
            <label>Form Identifier</label>
            <Input 
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
            />
          </div>

          <div>
            <label>Platform</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea className="h-64 font-mono" readOnly value={embedCode} />

          <div className="flex gap-3">
            <Button onClick={() => navigator.clipboard.writeText(embedCode)}>Copy</Button>
            <Button variant="outline" onClick={regenerateToken}>Regenerate Token</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
