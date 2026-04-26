import { useNavigate } from "@/lib/router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  back,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  back?: boolean;
  actions?: ReactNode;
  breadcrumb?: string;
}) {
  const nav = useNavigate();
  return (
    <div className="border-b bg-background">
      {breadcrumb && (
        <div className="container px-4 pt-3 text-xs text-muted-foreground">{breadcrumb}</div>
      )}
      <div className="container flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {back && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: ".." as never })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="truncate text-lg font-extrabold md:text-xl">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}