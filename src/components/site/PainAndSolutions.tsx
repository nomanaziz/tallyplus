import { useI18n } from "@/lib/i18n";
import { icons } from "@/lib/icons";
import { X, Cloud, Bell, BarChart3 } from "lucide-react";

export function PainAndSolutions() {
  const { lang } = useI18n();
  const pains = lang === "bn"
    ? [
        { t: "খাতায় লিখলে হিসাব হারায়", d: "কাগজের খাতা নষ্ট বা হারিয়ে গেলে সব হিসাব শেষ।" },
        { t: "কে কত বাকি ভুলে যান", d: "কাস্টমারদের বাকির হিসাব রাখা খুব কঠিন।" },
        { t: "লাভ না ক্ষতি — বুঝতে পারেন না!", d: "সঠিক লাভ-ক্ষতির হিসাব জানা যায় না।" },
      ]
    : [
        { t: "Paper ledger gets lost", d: "If the paper ledger is damaged or lost, all accounts vanish." },
        { t: "Forget who owes how much", d: "Tracking customers' balances is very difficult." },
        { t: "No idea — profit or loss?", d: "The exact profit and loss is not known." },
      ];

  const solutions = lang === "bn"
    ? [
        { Icon: Cloud, t: "ক্লাউডে সেভ — কখনো হারাবে না", d: "অনলাইন ক্লাউডে সব হিসাব নিরাপদ।", img: icons.businessReport },
        { Icon: Bell, t: "অটো রিমাইন্ডার, বাকি কালেকশন সহজ", d: "SMS/WhatsApp এ অটো ব্যালান্স রিমাইন্ডার।", img: icons.due },
        { Icon: BarChart3, t: "স্মার্ট রিপোর্ট, পরিষ্কার লাভ-ক্ষতি", d: "দৈনিক ও মাসিক রিপোর্টে এক নজরে ব্যবসার অবস্থা।", img: icons.businessReport },
      ]
    : [
        { Icon: Cloud, t: "Saved in cloud, never lost", d: "All accounts safe in the online cloud.", img: icons.businessReport },
        { Icon: Bell, t: "Auto reminder, easy due collection", d: "Auto SMS/WhatsApp balance reminders.", img: icons.due },
        { Icon: BarChart3, t: "Smart reports, clear P&L", d: "Daily and monthly reports — business at a glance.", img: icons.businessReport },
      ];

  return (
    <section className="bg-secondary/40 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-extrabold md:text-4xl">
          {lang === "bn" ? "এই চিন্তাগুলো কি আপনারও?" : "Are these your concerns too?"}
        </h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {pains.map((p) => (
            <div key={p.t} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <X className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">{p.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            {lang === "bn" ? <>টালি প্লাসে <span className="text-primary">সহজ সমাধান!</span></> : <>Simple solution in <span className="text-primary">Tally Plus!</span></>}
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {solutions.map((s) => (
            <div key={s.t} className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-foreground transition-colors group-hover:bg-primary">
                <s.Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}