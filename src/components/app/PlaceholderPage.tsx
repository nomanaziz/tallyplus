import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function PlaceholderPage({
  title,
  icon,
  breadcrumb,
}: {
  title: ReactNode;
  icon?: string;
  breadcrumb?: string;
}) {
  const { lang } = useI18n();
  return (
    <div className="container px-4 py-4">
      {breadcrumb && <div className="mb-2 text-xs text-muted-foreground">{breadcrumb}</div>}
      <h1 className="text-xl font-extrabold">{title}</h1>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
        {icon && <img src={icon} alt="" className="h-16 w-16 opacity-60" />}
        <p>{lang === "bn" ? "এই পেজটি শীঘ্রই আসছে।" : "This page is coming soon."}</p>
      </div>
    </div>
  );
}