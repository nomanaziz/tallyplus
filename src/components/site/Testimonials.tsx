import { useI18n } from "@/lib/i18n";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Quote, Star } from "lucide-react";

const data = [
  {
    bn: "আগে দোকানে না থাকলে কিছুই জানতে পারতাম না। এখন মোবাইলে অ্যাপ খুললেই কতো বিক্রি হলো, কে কী কিনলো, কে কতো বাকি রাখলো — সব দেখতে পারি।",
    en: "Before, I wouldn't know anything if I wasn't in the store. Now opening the app on my mobile, I can see sales, customers and dues — even when I'm away.",
    name: "Rahul Mehta", shop: "City Choice Supermarket", city: "Sharjah, UAE",
  },
  {
    bn: "মাসের শেষে হিসাব মেলাতে পারতাম না, খরচ কোথায় যেতো বুঝতাম না। এখন মাসিক রিপোর্ট দেখে বুঝে ব্যবসা করি।",
    en: "I couldn't reconcile accounts at month-end. Now monthly reports show me where expenses go and I run business with clarity.",
    name: "Grace Wanjiku", shop: "Wanjiku Retail Shop", city: "Nairobi, Kenya",
  },
  {
    bn: "আগে কে বাকি রেখেছে ভুলে যেতাম। এখন নাম-তারিখসহ সব পরিষ্কার লেখা থাকে।",
    en: "I used to forget who owed what. Now name, date and amount — everything is recorded clearly.",
    name: "Farhan Ismail", shop: "Urban Fresh Mart", city: "Kuala Lumpur, Malaysia",
  },
  {
    bn: "নতুন দোকান খুলেছি — স্টক, বাকি, খরচ এত হ্যাসেল হবে ভাবিনি। এই অ্যাপটা যেন আমার ম্যানেজার।",
    en: "Opened a new store — never thought stock, dues, expenses would be such hassle. This app feels like my store manager.",
    name: "Noor Alam", shop: "Healthline Pharmacy", city: "Dhaka, Bangladesh",
  },
];

export function Testimonials() {
  const { lang } = useI18n();
  return (
    <section className="site-container py-16 md:py-24">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold md:text-4xl">
          {lang === "bn" ? <>আমাদের <span className="text-primary">খুশি ক্রেতারা</span> বলছেন</> : <>Our <span className="text-primary">happy customers</span> say</>}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {lang === "bn" ? "হাজার হাজার ব্যবসায়ী টালি প্লাসের সাথে এগিয়ে যাচ্ছেন।" : "Thousands of businessmen are growing with Tally Plus."}
        </p>
      </div>
      <Carousel opts={{ loop: true }} className="mx-auto mt-10 max-w-5xl">
        <CarouselContent>
          {data.map((d) => (
            <CarouselItem key={d.name} className="md:basis-1/2 lg:basis-1/3">
              <div className="m-1 h-full rounded-2xl border bg-card p-6 shadow-sm">
                <Quote className="h-6 w-6 text-primary/60" />
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{lang === "bn" ? d.bn : d.en}</p>
                <div className="mt-5 flex items-center gap-3 border-t pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {d.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.shop}</div>
                    <div className="text-xs text-muted-foreground">{d.city}</div>
                  </div>
                  <div className="flex"><Star className="h-4 w-4 fill-primary text-primary" /></div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </section>
  );
}