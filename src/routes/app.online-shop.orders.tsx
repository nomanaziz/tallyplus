import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/app/online-shop/orders")({
  head: () => ({ meta: [{ title: "Order List — Tally Plus" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { lang } = useI18n();
  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "অর্ডার লিস্ট" : "Order List"}`} title="" />
      <Tabs defaultValue="on-order" className="mt-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="on-order">{lang === "bn" ? "নতুন অর্ডার" : "On Order"}</TabsTrigger>
          <TabsTrigger value="ongoing">{lang === "bn" ? "চলমান" : "Ongoing"}</TabsTrigger>
          <TabsTrigger value="completed">{lang === "bn" ? "সম্পন্ন" : "Completed"}</TabsTrigger>
        </TabsList>
        {["on-order", "ongoing", "completed"].map((v) => (
          <TabsContent key={v} value={v}>
            <EmptyOrders lang={lang} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function EmptyOrders({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <ClipboardList className="h-12 w-12 text-muted-foreground" />
      <p className="mt-2 text-muted-foreground">
        {lang === "bn" ? "কোনো অর্ডার নেই" : "No orders yet"}
      </p>
    </div>
  );
}