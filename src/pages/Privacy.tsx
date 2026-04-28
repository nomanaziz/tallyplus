import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useI18n } from "@/lib/i18n";

function PrivacyPage() {
  const { lang, t } = useI18n();
  const bn = lang === "bn";

  const sections = bn
    ? [
        {
          h: "১. ভূমিকা",
          p: `${t("appName")} (“আমরা”, “আমাদের”) আপনার গোপনীয়তা রক্ষায় প্রতিশ্রুতিবদ্ধ। এই Privacy Policy ব্যাখ্যা করে কীভাবে আমরা আপনার তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষা করি যখন আপনি আমাদের ওয়েবসাইট, মোবাইল অ্যাপ ও সেবা ব্যবহার করেন।`,
        },
        {
          h: "২. আমরা কী তথ্য সংগ্রহ করি",
          list: [
            "অ্যাকাউন্ট তথ্য: নাম, মোবাইল নম্বর, ইমেইল, পিন/পাসওয়ার্ড।",
            "ব্যবসায়িক তথ্য: দোকানের নাম, ঠিকানা, ধরন, লোগো।",
            "লেনদেন ডেটা: বিক্রি, কেনাকাটা, খরচ, ক্যাশবক্স, বাকি, কাস্টমার ও সরবরাহকারীর তথ্য।",
            "ডিভাইস ও লগ ডেটা: ব্রাউজার, IP, ব্যবহারের সময়।",
            "পেমেন্ট তথ্য: subscription কেনার সময় payment gateway-এর মাধ্যমে।",
          ],
        },
        {
          h: "৩. তথ্য কিভাবে ব্যবহার হয়",
          list: [
            "সেবা প্রদান, account পরিচালনা ও support।",
            "Subscription ও billing প্রক্রিয়াকরণ।",
            "নিরাপত্তা, fraud prevention ও আইনি বাধ্যবাধকতা।",
            "সেবা উন্নয়ন এবং নতুন feature তৈরি।",
            "আপনার অনুমতিক্রমে notifications ও marketing।",
          ],
        },
        {
          h: "৪. তথ্য শেয়ারিং",
          p: "আমরা আপনার তথ্য বিক্রি করি না। শুধু প্রয়োজনীয় service provider (যেমন Supabase hosting, payment gateway, SMS) এর সাথে contractual ভিত্তিতে শেয়ার করা হয় এবং আইন অনুযায়ী প্রয়োজন হলে কর্তৃপক্ষের সাথে।",
        },
        {
          h: "৫. ডেটা সংরক্ষণ ও নিরাপত্তা",
          p: "আমরা encryption, access control ও Row Level Security ব্যবহার করি। তবু কোনো ব্যবস্থা ১০০% নিরাপদ নয়। অ্যাকাউন্ট সক্রিয় থাকা পর্যন্ত আপনার ডেটা সংরক্ষিত থাকে; account মুছে ফেললে যৌক্তিক সময়ের মধ্যে ডেটাও মুছে ফেলা হয়।",
        },
        {
          h: "৬. Cookies",
          p: "session ব্যবস্থাপনা, preference সংরক্ষণ এবং analytics-এর জন্য আমরা cookies ব্যবহার করি। ব্রাউজার থেকে আপনি cookies disable করতে পারেন।",
        },
        {
          h: "৭. আপনার অধিকার",
          list: [
            "তথ্য দেখা ও সংশোধনের অধিকার।",
            "অ্যাকাউন্ট ও ডেটা মুছে ফেলার অনুরোধ।",
            "marketing থেকে opt-out।",
            "ডেটা export-এর অনুরোধ।",
          ],
        },
        {
          h: "৮. শিশুদের গোপনীয়তা",
          p: "আমাদের সেবা ১৮ বছরের কম বয়সীদের জন্য নয়।",
        },
        {
          h: "৯. পরিবর্তন",
          p: "এই Policy সময়ে সময়ে পরিবর্তন হতে পারে। গুরুত্বপূর্ণ পরিবর্তনের ক্ষেত্রে আমরা ওয়েবসাইট বা ইমেইলে জানাব।",
        },
        {
          h: "১০. যোগাযোগ",
          p: `কোনো প্রশ্ন থাকলে যোগাযোগ করুন: support@${t("appName").toLowerCase()}.app`,
        },
      ]
    : [
        {
          h: "1. Introduction",
          p: `${t("appName")} (“we”, “our”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website, mobile app, and services.`,
        },
        {
          h: "2. Information We Collect",
          list: [
            "Account info: name, mobile number, email, PIN/password.",
            "Business info: shop name, address, type, logo.",
            "Transaction data: sales, purchases, expenses, cashbox, dues, customer & supplier records.",
            "Device & log data: browser, IP, usage timestamps.",
            "Payment info: when purchasing a subscription via payment gateways.",
          ],
        },
        {
          h: "3. How We Use Information",
          list: [
            "Provide the service, manage accounts and support.",
            "Process subscriptions and billing.",
            "Security, fraud prevention and legal compliance.",
            "Improve the service and build new features.",
            "Send notifications and marketing with your consent.",
          ],
        },
        {
          h: "4. Sharing",
          p: "We do not sell your data. We share only with necessary service providers (e.g., Supabase hosting, payment gateway, SMS) under contract, and with authorities when legally required.",
        },
        {
          h: "5. Data Retention & Security",
          p: "We use encryption, access control and Row Level Security. No system is 100% secure. Your data is retained while your account is active; on deletion it is removed within a reasonable period.",
        },
        {
          h: "6. Cookies",
          p: "We use cookies for sessions, preferences, and analytics. You may disable cookies in your browser.",
        },
        {
          h: "7. Your Rights",
          list: [
            "Access and correct your information.",
            "Request account and data deletion.",
            "Opt out of marketing.",
            "Request data export.",
          ],
        },
        {
          h: "8. Children's Privacy",
          p: "Our service is not intended for users under 18.",
        },
        {
          h: "9. Changes",
          p: "We may update this Policy from time to time. Material changes will be communicated via the website or email.",
        },
        {
          h: "10. Contact",
          p: `For questions, contact us at: support@${t("appName").toLowerCase()}.app`,
        },
      ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {bn ? "আইনি" : "Legal"}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">
            {bn ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {bn ? "সর্বশেষ আপডেট: " : "Last updated: "}
            {new Date().toLocaleDateString(bn ? "bn-BD" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>
        <article className="space-y-6 text-[15px] leading-7 text-foreground">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 text-lg font-bold">{s.h}</h2>
              {s.p && <p className="text-muted-foreground">{s.p}</p>}
              {s.list && (
                <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                  {s.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export default PrivacyPage;
