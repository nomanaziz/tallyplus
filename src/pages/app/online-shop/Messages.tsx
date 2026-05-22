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



type Row = { id: string; whatsapp_number: string | null; facebook_page_id: string | null };

function MessagesPage() {
  const { lang, t } = useI18n();
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
    toast.success(t("p6_Saved_2"));
    void refetch();
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${t("p6_Messages")}`} title="" />

      <h1 className="mt-2 text-xl font-bold">{t("p6_Select_Chat_Option")}</h1>

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
            <div className="text-sm font-bold">{t("p6_Setup_Whatsapp_Chat")}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("p6_Enter_whatsapp_number_Like_01")}
            </p>
          </div>
          <div className="mt-4">
            <Label className="text-xs">{t("p6_Whatsapp_Number")}</Label>
            <div className="mt-1 flex items-center gap-2 rounded-md border bg-background px-2 py-1">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">🇧🇩 +88</span>
              <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="XXXXXXXXXX" className="border-0 px-1 shadow-none focus-visible:ring-0" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="px-8">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("p6_Save_2")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm font-bold">{t("p6_Facebook_Chat")}</div>
          <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs">
            <div className="font-semibold">{t("p6_Steps_to_enable_Facebook_Chat")}</div>
            <p className="mt-2"><b>1. {t("p6_Get_Page_ID")}</b> {t("p6_Go_to_your_facebook_page_About")}</p>
          </div>
          <div className="mt-4">
            <Input value={fb} onChange={(e) => setFb(e.target.value)} placeholder={t("p6_Facebook_Page_ID")} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="px-8">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("p6_Save_2")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default MessagesPage;
