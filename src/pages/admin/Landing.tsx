import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ExternalLink, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";



type Section = {
  id: string;
  section: string;
  data: any;
  is_published: boolean;
  updated_at: string;
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero (টপ ব্যানার)",
  features: "Features (বৈশিষ্ট্য)",
  pain: "Pain Points (সমস্যা ও সমাধান)",
  compare: "Comparison Table",
  business_types: "Business Types",
  testimonials: "Testimonials",
  pricing_intro: "Pricing Intro",
  contact: "Contact Info",
  stats: "Stats Strip",
  final_cta: "Final CTA",
  footer: "Footer",
};

function LandingCMS() {
  const [sections, setSections] = useState<Section[]>([]);
  const [editing, setEditing] = useState<Section | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .order("section", { ascending: true });
    if (error) toast.error(error.message);
    setSections((data as Section[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const togglePublished = async (s: Section) => {
    const { error } = await supabase
      .from("site_content")
      .update({ is_published: !s.is_published })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const openEditor = (s: Section) => {
    setEditing(s);
    setJsonText(JSON.stringify(s.data, null, 2));
  };

  const save = async () => {
    if (!editing) return;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e: any) {
      return toast.error("Invalid JSON: " + e.message);
    }
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .update({ data: parsed })
      .eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing Page Editor</h1>
          <p className="text-sm text-muted-foreground">প্রতিটি section আলাদাভাবে edit করুন</p>
        </div>
        <Button asChild variant="outline">
          <a href="/" target="_blank" rel="noopener">
            <ExternalLink className="mr-1 h-4 w-4" /> Preview Site
          </a>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{SECTION_LABELS[s.section] ?? s.section}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(s.updated_at).toLocaleString("en-GB")}
                  </p>
                </div>
                <Badge variant={s.is_published ? "default" : "secondary"}>
                  {s.is_published ? "Published" : "Hidden"}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.is_published}
                    onCheckedChange={() => togglePublished(s)}
                    id={`pub-${s.id}`}
                  />
                  <Label htmlFor={`pub-${s.id}`} className="text-xs">
                    Publish
                  </Label>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditor(s)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit: {editing && (SECTION_LABELS[editing.section] ?? editing.section)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Content (JSON)</Label>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={18}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Tip: প্রতিটা section-এর জন্য structured form coming soon। আপাতত JSON edit করুন।
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LandingCMS;
