import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p>{title}</p>
      {action}
    </div>
  );
}