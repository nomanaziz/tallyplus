import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/online-shop/delivery")({
  head: () => ({ meta: [{ title: "Delivery — Tally Plus" }] }),
  component: Page,
});

function Page() {
  const { lang } = useI18n();
  return (
    <div className="container mx-auto max-w-2xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "ডেলিভারি" : "Delivery"}`} title="" />
      <div className="mt-10 flex flex-col items-center rounded-xl border bg-card p-10 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-bold">{lang === "bn" ? "ডেলিভারি" : "Delivery"}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {lang === "bn" ? "এই ফিচারটি শীঘ্রই আসছে।" : "This feature is coming soon."}
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/app/online-shop">{lang === "bn" ? "ফিরে যান" : "Go back"}</Link>
        </Button>
      </div>
    </div>
  );
}
