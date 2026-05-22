import { Link } from "@/lib/router";
import { useI18n, LANG_NAMES, type Lang } from "@/lib/i18n";
import { ArrowLeft, Facebook, Youtube, MessageCircle, Globe, Check } from "lucide-react";
import { ColorThemeButton } from "@/components/app/ColorThemePicker";
import { useSiteContact, waDigits } from "@/lib/site-contact";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteFooter() {
  const { t, lang, setLang } = useI18n();
  const { data: contact } = useSiteContact();
  const currentLang = LANG_NAMES.find((l) => l.code === lang) ?? LANG_NAMES[0];
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold hover:bg-accent hover:text-foreground"
              aria-label="Change language"
            >
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span>{currentLang.native}</span>
              <span className="text-muted-foreground">({currentLang.english})</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">
                {lang === "bn" ? "ভাষা নির্বাচন করুন / Choose language" : "Choose language / ভাষা নির্বাচন"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANG_NAMES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code as Lang)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="font-medium">{l.native}</span>
                  <span className="text-xs text-muted-foreground">({l.english})</span>
                  {l.code === lang && <Check className="ml-auto h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </footer>
  );
}