import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, BadgeCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SubscriptionGateDialog({
  open,
  onClose,
  onUnlock,
}: {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const { lang } = useI18n();
  const isBn = lang === "bn";

  const benefits = [
    {
      title: isBn ? "কম্বাইন্ড সেলস রিপোর্ট" : "Combined Sales Report",
      desc: isBn
        ? "সব দোকানের মোট কেনা, বেচা ও বাকি একসাথে দেখুন"
        : "View total purchases, sales, and outstanding dues across all shops",
    },
    {
      title: isBn ? "এক নজরে সর্বমোট ব্যালেন্স" : "Overall Balance at a Glance",
      desc: isBn
        ? "ব্যবসা লাভে না ক্ষতিতে এক নজরে বুঝুন"
        : "Instantly understand whether your business is in profit or loss",
    },
    {
      title: isBn ? "দ্রুত সিদ্ধান্ত নেওয়া" : "Faster Decision Making",
      desc: isBn
        ? "ম্যানুয়াল হিসাব বা দোকান পরিবর্তন করার প্রয়োজন নেই"
        : "No manual calculations or switching between shops",
    },
    {
      title: isBn ? "সব দোকানের একটাই PDF" : "One PDF for All Shops",
      desc: isBn
        ? "সব দোকানের একটাই রিপোর্ট ডাউনলোড বা শেয়ার করুন"
        : "Download or share a single report for all your shops",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <BadgeCheck className="h-10 w-10 text-amber-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-extrabold text-primary">
            {isBn ? "একবারে ৳১০,০০০ দিন!" : "Pay ৳10,000 once!"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-primary">
            {isBn
              ? "একটি ইউনিফাইড ড্যাশবোর্ডে সব দোকানের রিপোর্ট দেখুন"
              : "Access all your shop reports in one unified dashboard"}
          </p>
        </div>

        <div className="px-6 pb-4">
          <h3 className="mb-3 text-sm font-bold">
            {isBn ? "যা যা পাবেন:" : "What you get:"}
          </h3>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-tight">{b.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{b.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pb-6 pt-2">
          <Button
            className="h-11 w-full bg-primary text-base font-bold hover:bg-primary/90"
            onClick={onUnlock}
          >
            {isBn ? "এখনই আনলক করুন" : "Unlock Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
