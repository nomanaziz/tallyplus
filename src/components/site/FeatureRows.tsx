import { useI18n } from "@/lib/i18n";
import { icons, type IconKey } from "@/lib/icons";
import { Check } from "lucide-react";

type Row = {
  iconKey: IconKey;
  bnTitle: string;
  enTitle: string;
  bnDesc: string;
  enDesc: string;
  bnPoints: string[];
  enPoints: string[];
};

const rows: Row[] = [
  {
    iconKey: "businessReport",
    bnTitle: "লাভ না ক্ষতি? প্রতিদিন ব্যবসার আসল ছবি জানুন",
    enTitle: "Profit or loss? Know the real picture every day",
    bnDesc: "দৈনিক, সাপ্তাহিক বা মাসিক — সব রিপোর্ট এক জায়গায়। কোন প্রোডাক্ট সবচেয়ে বেশি লাভ আনে সহজেই বুঝুন।",
    enDesc: "Daily, weekly or monthly — detailed P&L reports in one place. Easily see which products bring the most profit.",
    bnPoints: ["দৈনিক/সাপ্তাহিক/মাসিক লাভ-ক্ষতি বিশ্লেষণ", "প্রোডাক্ট-ভিত্তিক আয় ও খরচ", "টার্গেট অনুযায়ী সেলস ট্র্যাকিং"],
    enPoints: ["Daily/weekly/monthly P&L analysis", "Product-wise income & expense", "Track sales against target"],
  },
  {
    iconKey: "stock",
    bnTitle: "স্টক শেষ? মেয়াদ পার? আগে থেকেই সাবধান হোন।",
    enTitle: "Out of stock? Expired? Be careful before anything else.",
    bnDesc: "প্রোডাক্টের মেয়াদ, স্টক ও স্টক-আউটের সময়মতো অ্যালার্ট পান।",
    enDesc: "Timely alerts on product expiration, low stock, and stock-outs.",
    bnPoints: ["মেয়াদোত্তীর্ণ পণ্যের আগাম সতর্কতা", "স্টক শেষ হওয়ার আগেই অ্যালার্ট", "চাহিদা অনুযায়ী ইনভেন্টরি"],
    enPoints: ["Early warning of expired products", "Alerts before stocks run out", "Inventory by sales & demand"],
  },
  {
    iconKey: "buySubscription",
    bnTitle: "ঝুঁকি ছাড়াই বাড়তি আয়ের সুযোগ",
    enTitle: "Earn without risk, ensure business growth",
    bnDesc: "মূল ব্যবসার পাশাপাশি ওষুধ, ইলেকট্রনিক্স, মুদি পণ্য রেফার করে বাড়তি আয় করুন।",
    enDesc: "Earn extra alongside your main business — sell medicines, electronics, groceries and more.",
    bnPoints: ["প্রোডাক্ট স্টক করার ঝামেলা নেই", "শুধু রেফার করে আয়", "মূলধন ছাড়াই ব্যবসার সুযোগ"],
    enPoints: ["No hassle of stocking products", "Earn just by referring", "Do business without capital"],
  },
  {
    iconKey: "due",
    bnTitle: "বাকি সময়মতো — শুধু একটা রিমাইন্ডারে",
    enTitle: "The rest will be paid on time — just with a reminder",
    bnDesc: "কাস্টমারদের বাকি অংকের জন্য SMS/WhatsApp রিমাইন্ডার পাঠান। পরিশোধ সহজ।",
    enDesc: "Send SMS/WhatsApp reminders for outstanding dues. Easy to collect.",
    bnPoints: ["এক ক্লিকে রিমাইন্ডার", "কাস্টমার-ভিত্তিক বাকির হিসাব", "অটো ডিউ আপডেট"],
    enPoints: ["One-tap reminder", "Per-customer due tracking", "Auto due updates"],
  },
  {
    iconKey: "access",
    bnTitle: "ব্যবসার নিয়ন্ত্রণ এখন আপনার হাতে",
    enTitle: "Control of your business is now in your hands",
    bnDesc: "স্টাফ কী দেখতে পারবে আর কী পারবে না — অ্যাক্সেস ম্যানেজমেন্ট দিয়ে নির্ধারণ করুন।",
    enDesc: "Decide exactly what staff can see or do with full access management.",
    bnPoints: ["রোল-ভিত্তিক পারমিশন", "ক্যাশিয়ার/ম্যানেজার আলাদা অ্যাক্সেস", "অ্যাক্টিভিটি লগ"],
    enPoints: ["Role-based permissions", "Separate cashier/manager access", "Activity log"],
  },
];

export function FeatureRows() {
  const { lang } = useI18n();
  return (
    <section id="features" className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-extrabold md:text-5xl">
          {lang === "bn" ? <>টালি প্লাস <span className="text-primary">আপনার ব্যবসা</span> কীভাবে বাড়াবে?</> : <>How will <span className="text-primary">Tally Plus</span> grow your business?</>}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {lang === "bn" ? "ব্যবসার প্রতিটি দিক স্মার্টভাবে ম্যানেজ করুন। রিপোর্ট দেখে সঠিক সিদ্ধান্ত নিন।" : "Manage every aspect of your business smartly. Make decisions by viewing reports."}
        </p>
      </div>
      <div className="mt-14 space-y-16 md:space-y-24">
        {rows.map((r, i) => {
          const reverse = i % 2 === 1;
          return (
            <div key={r.bnTitle} className={`grid gap-8 md:grid-cols-2 md:items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div className="relative mx-auto flex h-56 w-56 items-center justify-center rounded-[2rem] bg-primary/10 shadow-inner md:h-72 md:w-72">
                <div className="absolute inset-3 rounded-[1.5rem] bg-card shadow-md" aria-hidden />
                <img src={icons[r.iconKey]} alt="" className="relative h-28 w-28 md:h-36 md:w-36" loading="lazy" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold leading-tight md:text-3xl">
                  {lang === "bn" ? r.bnTitle : r.enTitle}
                </h3>
                <p className="mt-3 text-muted-foreground">{lang === "bn" ? r.bnDesc : r.enDesc}</p>
                <ul className="mt-5 space-y-2">
                  {(lang === "bn" ? r.bnPoints : r.enPoints).map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/20"><Check className="h-3 w-3" /></span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}