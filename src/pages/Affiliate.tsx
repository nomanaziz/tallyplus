import { Link } from "@/lib/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingUp, Wallet, GraduationCap, Share2, UserPlus, Coins } from "lucide-react";

type Tier = { id: string; name: string; min_sales: number; commission_pct: number; bonus_pct: number; sort_order: number };



function AffiliateLanding() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [maxPct, setMaxPct] = useState<number>(25);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("affiliate_tiers").select("*").order("sort_order");
      const list = (data as Tier[]) ?? [];
      setTiers(list);
      if (list.length) setMaxPct(Math.max(...list.map((t) => Number(t.commission_pct) + Number(t.bonus_pct))));
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="text-base font-extrabold">Tally Plus <span className="text-primary">Growth Partner</span></Link>
          <div className="flex items-center gap-2">
            <Link to="/affiliate/register" className="text-sm font-semibold text-primary hover:underline">রেজিস্ট্রেশন</Link>
            <Link to="/"><Button size="sm" variant="outline">লগইন</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-background to-emerald-500/10" />
        <div className="container mx-auto px-4 py-16 text-center md:py-24">
          <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">এফিলিয়েট প্রোগ্রাম</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
            বিনা পুঁজিতে <span className="text-primary">ইনকামের</span> সুযোগ
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            প্রতিটি সফল রেফারেলে পাচ্ছেন <strong className="text-foreground">{maxPct}%</strong> পর্যন্ত কমিশন।
            আজই যুক্ত হয়ে যান Tally Plus গ্রোথ পার্টনার প্রোগ্রামে।
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/affiliate/register"><Button size="lg" className="h-12 px-6 text-base font-bold">পার্টনার হয়ে যান</Button></Link>
            <a href="#how" className="text-sm font-semibold text-muted-foreground hover:text-foreground">কীভাবে কাজ করে?</a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-center text-2xl font-bold md:text-3xl">কেন হবেন গ্রোথ পার্টনার?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { Icon: TrendingUp, title: "উচ্চ কমিশন", desc: `প্রতিটি সাবস্ক্রিপশন বিক্রিতে ${maxPct}% পর্যন্ত কমিশন।` },
            { Icon: Wallet, title: "বিনা পুঁজি", desc: "কোনো বিনিয়োগ ছাড়াই শুরু করুন — শুধু সময় ও সাহস দরকার।" },
            { Icon: GraduationCap, title: "ক্যারিয়ার গঠন", desc: "শিখুন মার্কেটিং, সেলস ও যোগাযোগের আধুনিক স্কিল।" },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><c.Icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="bg-muted/40 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-2xl font-bold md:text-3xl">সহজ ৩টি ধাপে শুরু করুন</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { Icon: UserPlus, n: "১", t: "রেজিস্ট্রেশন", d: "ফ্রিতে রেজিস্ট্রেশন করুন এবং পেয়ে যান নিজস্ব রেফারেল কোড।" },
              { Icon: Share2, n: "২", t: "প্রোমোট করুন", d: "আপনার লিংক/কোড পরিচিত দোকানদার ও উদ্যোক্তাদের সাথে শেয়ার করুন।" },
              { Icon: Coins, n: "৩", t: "আয় করুন", d: "আপনার লিংকে কেউ সাবস্ক্রিপশন কিনলেই কমিশন পেয়ে যান।" },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border bg-card p-6 shadow-sm">
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">ধাপ {s.n}</div>
                <s.Icon className="h-7 w-7 text-primary" />
                <h3 className="mt-3 text-lg font-bold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-center text-2xl font-bold md:text-3xl">কমিশন টিয়ার</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">গ্রেড যত উপরের দিকে যাবে, কমিশনের হার তত বাড়বে।</p>
        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">টিয়ার</th>
                <th className="px-4 py-3 text-right">মিনিমাম সেল</th>
                <th className="px-4 py-3 text-right">কমিশন</th>
                <th className="px-4 py-3 text-right">বোনাস</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 font-semibold">{t.name}</td>
                  <td className="px-4 py-3 text-right">{t.min_sales}</td>
                  <td className="px-4 py-3 text-right text-primary">{Number(t.commission_pct)}%</td>
                  <td className="px-4 py-3 text-right">{Number(t.bonus_pct)}%</td>
                </tr>
              ))}
              {tiers.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">শীঘ্রই আসছে</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/40 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-center text-2xl font-bold md:text-3xl">সর্বাধিক জিজ্ঞাসিত প্রশ্ন</h2>
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="a">
              <AccordionTrigger>Tally Plus গ্রোথ পার্টনার হতে কি কোনো টাকা লাগে?</AccordionTrigger>
              <AccordionContent>না, রেজিস্ট্রেশন একদম ফ্রি। কোনো বিনিয়োগের প্রয়োজন নেই।</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>আমি কীভাবে কাস্টমার রেফার করবো?</AccordionTrigger>
              <AccordionContent>আপনার ড্যাশবোর্ড থেকে এক্সক্লুসিভ রেফারেল লিংক/কোড শেয়ার করুন। কেউ ওই লিংকে সাইন আপ ও সাবস্ক্রিপশন কিনলেই সেটি আপনার কমিশন।</AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>আমি কত কমিশন পাবো?</AccordionTrigger>
              <AccordionContent>প্রাথমিকভাবে ১৫% থেকে শুরু — পারফরম্যান্স অনুযায়ী টিয়ার বাড়লে {maxPct}% পর্যন্ত পেতে পারেন।</AccordionContent>
            </AccordionItem>
            <AccordionItem value="d">
              <AccordionTrigger>আমার রেফার করা কাস্টমার অ্যাপ ব্যবহার করছে কি না কীভাবে বুঝবো?</AccordionTrigger>
              <AccordionContent>ড্যাশবোর্ডে রেফারেল ট্যাবে দেখতে পাবেন কতজন আপনার লিংকে সাইন আপ করেছে এবং কতজন সাবস্ক্রিপশন কিনেছে।</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">এখনই যুক্ত হোন!</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          আজই রেজিস্ট্রেশন করে শুরু করুন ইনকামের যাত্রা।
        </p>
        <Link to="/affiliate/register">
          <Button size="lg" className="mt-6 h-12 px-8 text-base font-bold">পার্টনার হয়ে যান</Button>
        </Link>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tally Plus। সর্বস্বত্ব সংরক্ষিত।
      </footer>
    </div>
  );
}
export default AffiliateLanding;
