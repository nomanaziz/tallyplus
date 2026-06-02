import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, MapPin } from "lucide-react";
import { useSiteContact, waDigits } from "@/lib/site-contact";

const FALLBACK_PHONE = "+8801841577944";
const FALLBACK_EMAIL = "support@tallyplus.app";

export function ContactSection() {
  const { lang } = useI18n();
  const { data: contact } = useSiteContact();
  const PHONE = contact?.support_phone || FALLBACK_PHONE;
  const EMAIL = contact?.support_email || FALLBACK_EMAIL;
  const PHONE_DIGITS = waDigits(contact?.whatsapp_number || contact?.support_phone || FALLBACK_PHONE);
  const items = [
    {
      Icon: Phone,
      bnTitle: "ফোন করুন",
      enTitle: "Call us",
      value: PHONE,
      href: `tel:${PHONE}`,
      bnSub: "সকাল ৯টা — রাত ১০টা",
      enSub: "9 AM — 10 PM",
    },
    {
      Icon: MessageCircle,
      bnTitle: "WhatsApp",
      enTitle: "WhatsApp",
      value: PHONE,
      href: `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(lang === "bn" ? "আসসালামু আলাইকুম, টালি প্লাস সম্পর্কে জানতে চাই।" : "Hi, I want to know more about Tally Plus.")}`,
      bnSub: "২৪/৭ চ্যাট সাপোর্ট",
      enSub: "24/7 chat support",
    },
    {
      Icon: Mail,
      bnTitle: "ইমেইল",
      enTitle: "Email",
      value: EMAIL,
      href: `mailto:${EMAIL}`,
      bnSub: "২৪ ঘণ্টায় উত্তর পাবেন",
      enSub: "Reply within 24 hours",
    },
  ];

  return (
    <section id="contact" className="scroll-mt-20 py-16 md:py-24">
      <div className="site-container">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold md:text-5xl">
            {lang === "bn" ? <>আমাদের <span className="text-primary">যোগাযোগ</span> করুন</> : <>Get in <span className="text-primary">touch</span></>}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {lang === "bn" ? "যেকোনো প্রশ্ন বা সাহায্যের জন্য আমাদের টিম সবসময় প্রস্তুত।" : "Our team is always ready for any question or help you need."}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {items.map((it) => (
            <a
              key={`${it.enTitle}-${it.href}`}
              href={it.href}
              target={it.href.startsWith("http") ? "_blank" : undefined}
              rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 transition-colors group-hover:bg-primary">
                <it.Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{lang === "bn" ? it.bnTitle : it.enTitle}</h3>
              <p className="mt-1 break-all text-sm font-semibold text-foreground">{it.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{lang === "bn" ? it.bnSub : it.enSub}</p>
            </a>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl items-center gap-3 rounded-2xl border bg-secondary/40 p-5 text-sm">
          <MapPin className="h-5 w-5 flex-none text-primary" />
          <span>
            <span className="font-semibold">{lang === "bn" ? "ঠিকানা:" : "Address:"}</span>{" "}
            {lang === "bn" ? "ঢাকা, বাংলাদেশ" : "Dhaka, Bangladesh"}
          </span>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="h-14 rounded-full px-8 text-base font-bold">
            <a
              href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(lang === "bn" ? "হ্যালো, আমি টালি প্লাস সম্পর্কে জানতে চাই।" : "Hi, I'd like to know more about Tally Plus.")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              {lang === "bn" ? "Contact Us — এখনই কথা বলুন" : "Contact Us — Talk to us now"}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}