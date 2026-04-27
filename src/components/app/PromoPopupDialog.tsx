import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type Popup = {
  id: string;
  title_bn: string | null; title_en: string | null;
  body_bn: string | null; body_en: string | null;
  image_url: string | null;
  cta_text_bn: string | null; cta_text_en: string | null;
  cta_link: string | null;
};

export function PromoPopupDialog() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("promo_popups")
        .select("*")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const seenKey = `tp_promo_seen_${data.id}`;
      if (typeof window !== "undefined" && localStorage.getItem(seenKey)) return;
      setPopup(data as Popup);
      setOpen(true);
    })();
  }, [user?.id]);

  const close = () => {
    if (popup && typeof window !== "undefined") {
      localStorage.setItem(`tp_promo_seen_${popup.id}`, "1");
    }
    setOpen(false);
  };

  if (!popup) return null;
  const title = (lang === "bn" ? popup.title_bn : popup.title_en) || popup.title_bn || popup.title_en;
  const body = (lang === "bn" ? popup.body_bn : popup.body_en) || popup.body_bn || popup.body_en;
  const cta = (lang === "bn" ? popup.cta_text_bn : popup.cta_text_en) || popup.cta_text_bn || popup.cta_text_en;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {title && (
          <div className="border-b px-4 py-3 text-center text-sm font-bold">{title}</div>
        )}
        {popup.image_url && (
          <img src={popup.image_url} alt="" className="w-full object-cover" />
        )}
        {body && <p className="px-5 py-4 text-sm text-foreground">{body}</p>}
        <div className="flex gap-2 p-4 pt-0">
          {cta && popup.cta_link && (
            <Button asChild className="flex-1">
              <a href={popup.cta_link} onClick={close}>{cta}</a>
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={close}>
            {lang === "bn" ? "বন্ধ" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
