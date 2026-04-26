import { useI18n } from "@/lib/i18n";
import { Pill, ShoppingBasket, Smartphone, Shirt, Package, Wrench } from "lucide-react";

export function BusinessTypes() {
  const { lang } = useI18n();
  const items = [
    { Icon: Pill, bn: "ফার্মেসি", en: "Pharmacy", bnDesc: "ওষুধ, ইনজেকশন, সিরাপ ও হেলথকেয়ার পণ্যের দোকান।", enDesc: "Medicines, syrups, first-aid and healthcare." },
    { Icon: ShoppingBasket, bn: "মুদি দোকান", en: "Grocery Store", bnDesc: "চাল, ডাল, তেল, মসলা — দৈনন্দিন প্রয়োজনের দোকান।", enDesc: "Rice, pulses, oil, spices and daily essentials." },
    { Icon: Smartphone, bn: "ইলেকট্রনিক্স", en: "Electronics", bnDesc: "মোবাইল, কম্পিউটার, টিভি, ফ্রিজ ও অ্যাকসেসরিজ।", enDesc: "Mobiles, computers, TVs, fridges and accessories." },
    { Icon: Shirt, bn: "ফ্যাশন", en: "Fashion", bnDesc: "জামা, সালোয়ার-কামিজ, জুতা, ব্যাগ ও ফ্যাশন আইটেম।", enDesc: "Clothes, salwar-kameez, shoes, bags and accessories." },
    { Icon: Package, bn: "ডিলার", en: "Dealer", bnDesc: "পাইকারি ব্যবসা — ব্র্যান্ড পণ্য সরবরাহ।", enDesc: "Wholesale — supplying brand products to retailers." },
    { Icon: Wrench, bn: "হার্ডওয়্যার", en: "Hardware", bnDesc: "রড, সিমেন্ট, পাইপ, টুলস ও নির্মাণ সামগ্রী।", enDesc: "Construction materials, rods, cement, pipes, tools." },
  ];
  return (
    <section className="bg-secondary/40 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            {lang === "bn" ? <>আপনার <span className="text-primary">ব্যবসার ধরন</span> বেছে নিন</> : <>Choose your <span className="text-primary">business type</span></>}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {lang === "bn" ? "দেখুন টালি প্লাস কীভাবে আপনার ব্যবসা বাড়াবে।" : "See how Tally Plus can grow your business."}
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.en} className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-foreground transition-colors group-hover:bg-primary">
                <it.Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{lang === "bn" ? it.bn : it.en}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? it.bnDesc : it.enDesc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}