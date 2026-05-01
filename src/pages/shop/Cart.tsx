import { useMemo } from "react";
import { Link, useNavigate } from "@/lib/router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { useCart, setCartQty, removeFromCart } from "@/lib/consumer-cart";
import { Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";

export default function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const m: Record<string, { shop_name: string; items: typeof cart }> = {};
    for (const it of cart) {
      if (!m[it.shop_id]) m[it.shop_id] = { shop_name: it.shop_name, items: [] };
      m[it.shop_id].items.push(it);
    }
    return m;
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-semibold">আপনার Cart খালি</h1>
          <p className="mt-1 text-sm text-muted-foreground">কেনাকাটা শুরু করতে মার্কেটপ্লেসে যান।</p>
          <Button asChild className="mt-4">
            <Link to="/shop">মার্কেটপ্লেসে যান</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">আপনার Cart</h1>
        <div className="space-y-6">
          {Object.entries(grouped).map(([shopId, g]) => {
            const subtotal = g.items.reduce((s, it) => s + it.price * it.qty, 0);
            return (
              <div key={shopId} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                  <div className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 shrink-0" />
                    <span className="truncate">{g.shop_name}</span>
                  </div>
                  <Button size="sm" className="shrink-0" onClick={() => navigate(`/checkout/${shopId}`)}>
                    Checkout (৳{subtotal.toFixed(0)})
                  </Button>
                </div>
                <div className="divide-y">
                  {g.items.map((it) => (
                    <div key={it.listing_id} className="flex gap-3 p-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {it.image_url && (
                          <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Full product name on top */}
                        <div className="line-clamp-2 text-sm font-medium leading-snug">{it.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          ৳{it.price}
                          {it.unit ? ` / ${it.unit}` : ""}
                        </div>
                        {/* Compact controls + line-total + delete in one row below */}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-md border">
                            <button
                              type="button"
                              onClick={() => setCartQty(it.listing_id, it.qty - 1)}
                              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
                              aria-label="কমান"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold">{it.qty}</span>
                            <button
                              type="button"
                              onClick={() => setCartQty(it.listing_id, it.qty + 1)}
                              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
                              aria-label="বাড়ান"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold">৳{(it.price * it.qty).toFixed(0)}</div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(it.listing_id)}
                              className="text-destructive/80 hover:text-destructive"
                              aria-label="মুছুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
