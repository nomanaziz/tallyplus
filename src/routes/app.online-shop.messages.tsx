import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/online-shop/messages")({
  head: () => ({ meta: [{ title: "Message Settings — Tally Plus" }] }),
  component: MessagesPage,
});

type Row = { id: string; whatsapp_number: string | null; facebook_page_id: string | null };

function MessagesPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const shopId = current?.id ?? null;
  const [tab, setTab] = useState<"whatsapp" | "facebook">("whatsapp");
  const [wa, setWa] = useState("");
  const [fb, setFb] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, refetch } = useQuery<Row | null>({
    queryKey: ["shop-messaging", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops")
        .select("id,whatsapp_number,facebook_page_id" as string)
        .eq("id", shopId!).maybeSingle();
      return (data as Row | null) ?? null;
    },
  });

  useEffect(() => {
    if (!data) return;
    setWa(data.whatsapp_number ?? "");
    setFb(data.facebook_page_id ?? "");
  }, [data?.id]);

  const save = async () => {
    if (!shopId) return;
    setSaving(true);
    const payload = tab === "whatsapp"
      ? { whatsapp_number: wa.trim() || null }
      : { facebook_page_id: fb.trim() || null };
    const { error } = await supabase.from("shops").update(payload as never).eq("id", shopId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    void refetch();
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "মেসেজ" : "Messages"}`} title="" />

      <h1 className="mt-2 text-xl font-bold">{lang === "bn" ? "চ্যাট অপশন নির্বাচন" : "Select Chat Option"}</h1>

      <div className="mt-3 inline-flex rounded-lg border bg-card p-1">
        <button
          onClick={() => setTab("whatsapp")}
          className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${tab === "whatsapp" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >Whatsapp</button>
        <button
          onClick={() => setTab("facebook")}
          className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${tab === "facebook" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >Facebook</button>
      </div>

      {tab === "whatsapp" ? (
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="rounded-lg bg-muted/60 p-3">
            <div className="text-sm font-bold">{lang === "bn" ? "Whatsapp চ্যাট সেটআপ" : "Setup Whatsapp Chat"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "bn" ? "Whatsapp নম্বর দিন। যেমন: 01********" : "Enter whatsapp number Like:- 01********"}
            </p>
          </div>
          <div className="mt-4">
            <Label className="text-xs">{lang === "bn" ? "Whatsapp নম্বর" : "Whatsapp Number"}</Label>
            <div className="mt-1 flex items-center gap-2 rounded-md border bg-background px-2 py-1">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">🇧🇩 +88</span>
              <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="XXXXXXXXXX" className="border-0 px-1 shadow-none focus-visible:ring-0" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="px-8">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {lang === "bn" ? "সেভ" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm font-bold">{lang === "bn" ? "Facebook চ্যাট" : "Facebook Chat"}</div>
          <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs">
            <div className="font-semibold">{lang === "bn" ? "Facebook চ্যাট চালু করার ধাপ" : "Steps to enable Facebook Chat"}</div>
            <p className="mt-2"><b>1. {lang === "bn" ? "Page ID নিন:" : "Get Page ID:"}</b> {lang === "bn" ? "আপনার facebook page → About → Page transparency থেকে Page ID কপি করুন।" : "Go to your facebook page → About → Page transparency and copy the Page ID."}</p>
          </div>
          <div className="mt-4">
            <Input value={fb} onChange={(e) => setFb(e.target.value)} placeholder={lang === "bn" ? "Facebook Page ID" : "Facebook Page ID"} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="px-8">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {lang === "bn" ? "সেভ" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}