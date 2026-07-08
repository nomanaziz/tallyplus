import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getNumLocale, useI18n } from "@/lib/i18n";

function TermsPage() {
  const { lang, t } = useI18n();
  const bn = lang === "bn";

  const sections = bn
    ? [
        {
          h: "১. সম্মতি",
          p: `${t("appName")} ব্যবহার করে আপনি এই Terms & Conditions মেনে নিতে সম্মত হচ্ছেন। যদি একমত না হন, অনুগ্রহ করে সেবা ব্যবহার করবেন না।`,
        },
        {
          h: "২. সেবার পরিচয়",
          p: `${t("appName")} ছোট ও মাঝারি ব্যবসার জন্য একটি ডিজিটাল ব্যবসা ব্যবস্থাপনা প্ল্যাটফর্ম — বিক্রি, ক্রয়, স্টক, বাকি, ক্যাশবক্স ও online shop পরিচালনার সুবিধা দেয়।`,
        },
        {
          h: "৩. যোগ্যতা ও Account",
          list: [
            "আপনার বয়স ১৮ বছরের বেশি হতে হবে।",
            "Account-এর সকল তথ্য সঠিক ও হালনাগাদ রাখার দায়িত্ব আপনার।",
            "আপনার PIN/পাসওয়ার্ডের গোপনীয়তা ও account-এ হওয়া সকল কার্যক্রমের দায় আপনার।",
          ],
        },
        {
          h: "৪. Subscription, পেমেন্ট ও Refund",
          list: [
            "কিছু feature paid subscription-এ পাওয়া যায়।",
            "subscription সক্রিয় হওয়ার পর সাধারণত ফি ফেরতযোগ্য নয়।",
            "মূল্য ও plan যেকোনো সময় পরিবর্তন হতে পারে; পরিবর্তন আগেই জানানো হবে।",
          ],
        },
        {
          h: "৫. গ্রহণযোগ্য ব্যবহার",
          list: [
            "অবৈধ, প্রতারণামূলক বা ক্ষতিকর কাজে সেবা ব্যবহার নিষিদ্ধ।",
            "অন্যের তথ্য বা মেধাস্বত্ব লঙ্ঘন করা যাবে না।",
            "Reverse engineering, scraping বা অননুমোদিত access নিষিদ্ধ।",
          ],
        },
        {
          h: "৬. ব্যবহারকারীর কন্টেন্ট",
          p: "আপনি যে ডেটা ও কন্টেন্ট আপলোড করেন তার মালিকানা আপনার। সেবা পরিচালনার জন্য আমাদের সীমিত পরিসরে তা সংরক্ষণ ও প্রক্রিয়াকরণের অনুমতি দিচ্ছেন।",
        },
        {
          h: "৭. মেধাস্বত্ব",
          p: `${t("appName")} ব্র্যান্ড, লোগো, software ও ডিজাইন আমাদের সম্পত্তি। অনুমতি ছাড়া ব্যবহার নিষিদ্ধ।`,
        },
        {
          h: "৮. দায় সীমাবদ্ধতা",
          p: "সেবা “as-is” ভিত্তিতে প্রদান করা হয়। পরোক্ষ, আনুষঙ্গিক বা পরিণতিগত কোনো ক্ষতির জন্য আমরা দায়ী নই। আমাদের সর্বোচ্চ দায় গত ৩ মাসে আপনার পরিশোধিত subscription ফি-এর সমান।",
        },
        {
          h: "৯. Termination",
          p: "শর্ত লঙ্ঘন হলে আমরা যেকোনো সময় account স্থগিত বা বন্ধ করতে পারি। আপনি নিজেও যেকোনো সময় account বন্ধ করতে পারেন।",
        },
        {
          h: "১০. পরিবর্তন",
          p: "আমরা এই Terms পরিবর্তন করতে পারি। গুরুত্বপূর্ণ পরিবর্তন ওয়েবসাইট বা ইমেইলে জানানো হবে।",
        },
        {
          h: "১১. প্রযোজ্য আইন",
          p: "এই Terms বাংলাদেশের আইন দ্বারা পরিচালিত হবে এবং সংশ্লিষ্ট আদালতের এখতিয়ারভুক্ত হবে।",
        },
        {
          h: "১২. যোগাযোগ",
          p: `support@${t("appName").toLowerCase()}.app`,
        },
      ]
    : [
        {
          h: "1. Acceptance",
          p: `By using ${t("appName")} you agree to these Terms & Conditions. If you do not agree, please do not use the service.`,
        },
        {
          h: "2. The Service",
          p: `${t("appName")} is a digital business management platform for small and medium businesses — covering sales, purchases, stock, dues, cashbox and online shop.`,
        },
        {
          h: "3. Eligibility & Account",
          list: [
            "You must be 18 years or older.",
            "You are responsible for keeping your account information accurate and current.",
            "You are responsible for the confidentiality of your PIN/password and all activity under your account.",
          ],
        },
        {
          h: "4. Subscription, Payment & Refund",
          list: [
            "Some features are available on a paid subscription.",
            "Once a subscription is active, fees are generally non-refundable.",
            "Prices and plans may change; changes will be communicated in advance.",
          ],
        },
        {
          h: "5. Acceptable Use",
          list: [
            "Do not use the service for unlawful, fraudulent or harmful activity.",
            "Do not infringe on others' data or intellectual property.",
            "Reverse engineering, scraping and unauthorized access are prohibited.",
          ],
        },
        {
          h: "6. User Content",
          p: "You own the data and content you upload. You grant us a limited license to store and process it as needed to operate the service.",
        },
        {
          h: "7. Intellectual Property",
          p: `The ${t("appName")} brand, logo, software and design are our property. Use without permission is prohibited.`,
        },
        {
          h: "8. Limitation of Liability",
          p: "The service is provided “as-is”. We are not liable for indirect, incidental or consequential damages. Our maximum liability is limited to the subscription fees you paid in the last 3 months.",
        },
        {
          h: "9. Termination",
          p: "We may suspend or terminate accounts for breach of these Terms. You may close your account at any time.",
        },
        {
          h: "10. Changes",
          p: "We may update these Terms. Material changes will be communicated on the website or via email.",
        },
        {
          h: "11. Governing Law",
          p: "These Terms are governed by the laws of Bangladesh and subject to the jurisdiction of its courts.",
        },
        {
          h: "12. Contact",
          p: `support@${t("appName").toLowerCase()}.app`,
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
            {bn ? "শর্তাবলী" : "Terms & Conditions"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {bn ? "সর্বশেষ আপডেট: " : "Last updated: "}
            {new Date().toLocaleDateString(bn ? getNumLocale() : "en-US", {
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

export default TermsPage;
