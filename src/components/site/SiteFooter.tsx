import { Link } from "@/lib/router";
import { useI18n, LANG_NAMES, type Lang } from "@/lib/i18n";
import { ArrowLeft, Facebook, Youtube, MessageCircle } from "lucide-react";
import { ColorThemeButton } from "@/components/app/ColorThemePicker";
import { useSiteContact, waDigits } from "@/lib/site-contact";

export function SiteFooter() {
  const { t, lang, setLang } = useI18n();
  const { data: contact } = useSiteContact();
  const wa = waDigits(contact?.whatsapp_number);
  const socials: { href: string; label: string; Icon: typeof Facebook }[] = [];
  if (contact?.facebook_url) socials.push({ href: contact.facebook_url, label: "Facebook", Icon: Facebook });
  if (contact?.youtube_url) socials.push({ href: contact.youtube_url, label: "YouTube", Icon: Youtube });
  if (wa) socials.push({ href: `https://wa.me/${wa}`, label: "WhatsApp", Icon: MessageCircle });
  return (
    <footer className="border-t bg-secondary/30">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            {lang === "bn" ? `${t("appName")} হোমে ফিরুন` : `Back to ${t("appName")}`}
          </Link>
          <p>© {new Date().getFullYear()} {t("appName")}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
          <p>
            {lang === "bn" ? "ডেভেলপ করেছে " : "Developed by "}
            <a
              href="https://finehost.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary"
            >
              FineHost.net
            </a>
          </p>
          {socials.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/about" hash="features" className="hover:text-foreground">{t("features")}</Link>
          <Link to="/about" hash="pricing" className="hover:text-foreground">{t("pricing")}</Link>
          <Link to="/about" hash="contact" className="hover:text-foreground">{t("contact")}</Link>
          <Link to="/privacy" className="hover:text-foreground">
            {lang === "bn" ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            {lang === "bn" ? "শর্তাবলী" : "Terms & Conditions"}
          </Link>
          <span className="hidden h-4 w-px bg-border md:inline-block" />
          <ColorThemeButton
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border hover:bg-accent hover:text-foreground"
          />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="rounded-md border bg-background px-2 py-1 text-xs font-semibold hover:bg-accent"
            aria-label="Language"
          >
            {LANG_NAMES.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </div>
      </div>
    </footer>
  );
}