import { Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { addToCart, setCartQty, useCartQty, type CartItem } from "@/lib/consumer-cart";
import { cn } from "@/lib/utils";

type Props = {
  item: Omit<CartItem, "qty">;
  minOrder?: number;
  maxStock?: number;
  className?: string;
  size?: "sm" | "md";
};

export function AddToListButton({ item, minOrder = 1, maxStock, className, size = "md" }: Props) {
  const qty = useCartQty(item.listing_id);
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const wrap = size === "sm" ? "h-8" : "h-9";

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (qty === 0) {
    return (
      <button
        type="button"
        aria-label="List-এ যোগ করুন"
        disabled={maxStock !== undefined && maxStock <= 0}
        onClick={(e) => {
          stop(e);
          addToCart({ ...item, qty: minOrder }, minOrder);
          toast.success("List-এ যোগ করা হয়েছে");
        }}
        className={cn(
          "inline-flex items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-md transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50",
          dim,
          className,
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground shadow-md",
        wrap,
        className,
      )}
      onClick={stop}
    >
      <button
        type="button"
        aria-label="কমান"
        onClick={(e) => {
          stop(e);
          setCartQty(item.listing_id, qty - 1);
        }}
        className={cn("inline-flex items-center justify-center rounded-full hover:bg-primary-foreground/15", dim)}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="বাড়ান"
        disabled={maxStock !== undefined && qty >= maxStock}
        onClick={(e) => {
          stop(e);
          addToCart(item, 1);
        }}
        className={cn("inline-flex items-center justify-center rounded-full hover:bg-primary-foreground/15 disabled:opacity-50", dim)}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}