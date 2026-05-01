import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart, clearShopCart } from "@/lib/consumer-cart";
import { useConsumerSession } from "@/lib/consumer-session";
import { ConsumerAuthPanel } from "@/components/shop/ConsumerAuthPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingBag } from "lucide-react";

type Zone = { id: string; name: string; charge: number; free_shipping_min: number | null; sort_order: number };

export default function CheckoutPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const cart = useCart();
  const { user, profile, isConsumer, loading: sessLoading, refresh } = useConsumerSession();

  const items = useMemo(() => cart.filter((c) => c.shop_id === shopId), [cart, shopId]);
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shopName = items[0]?.shop_name ?? "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");

  useEffect(() => {
    if (profile) {
      if (profile.name && !name) setName(profile.name);
      if (profile.phone && !phone) setPhone(profile.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!shopId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.functions.invoke("marketplace-public", {
        body: { action: "delivery-zones", shop_id: shopId },
      });
      if (!alive) return;
      const zs = ((data as { zones?: Zone[] } | null)?.zones ?? []) as Zone[];
      setZones(zs);
      if (zs[0]) setZoneId(zs[0].id);
    })();
    return () => { alive = false; };
  }, [shopId]);

  const selectedZone = zones.find((z) => z.id === zoneId) ?? null;
  const deliveryCharge = selectedZone
    ? selectedZone.free_shipping_min !== null && subtotal >= Number(selectedZone.free_shipping_min)
      ? 0
      : Number(selectedZone.charge)
    : 0;
  const total = subtotal + deliveryCharge;

  if (items.length === 0 && !submitting) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Cart-এ এই দোকানের পণ্য নেই।</p>
          <Button asChild className="mt-3"><Link to="/cart">Cart-এ ফিরুন</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const placeOrder = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("নাম, ফোন ও ঠিকানা পূরণ করুন");
      return;
    }
    if (zones.length > 0 && !zoneId) {
      toast.error("ডেলিভারি এলাকা select করুন");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("marketplace-public", {
      body: {
        action: "place-order",
        shop_id: shopId,
        items: items.map((it) => ({ listing_id: it.listing_id, qty: it.qty })),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        note: note.trim(),
        payment_method: "cod",
        delivery_zone_id: zoneId || null,
      },
    });
    setSubmitting(false);
    if (error || !data || (data as { error?: string }).error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Order failed");
      return;
    }
    const d = data as { order_no: string };
    clearShopCart(shopId!);
    toast.success("অর্ডার confirm হয়েছে");
    navigate(`/orders/${d.order_no}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-xl font-bold">Checkout — {shopName}</h1>
            <p className="text-sm text-muted-foreground">ক্রয় সম্পন্ন করতে নিচের তথ্য দিন।</p>
          </div>

          {sessLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !user || !isConsumer ? (
            <ConsumerAuthPanel onAuthed={() => void refresh()} />
          ) : (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div>
                <Label>নাম *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>ফোন *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              </div>
              <div>
                <Label>ঠিকানা *</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
              </div>
              {zones.length > 0 && (
                <div>
                  <Label className="mb-2 block">ডেলিভারি এলাকা *</Label>
                  <RadioGroup value={zoneId} onValueChange={setZoneId} className="space-y-2">
                    {zones.map((z) => {
                      const isFree = z.free_shipping_min !== null && subtotal >= Number(z.free_shipping_min);
                      return (
                        <label
                          key={z.id}
                          htmlFor={`zone-${z.id}`}
                          className="flex cursor-pointer items-center justify-between rounded-md border p-3 hover:bg-accent/40"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem id={`zone-${z.id}`} value={z.id} />
                            <span className="font-medium">{z.name}</span>
                          </div>
                          <span className="text-sm font-semibold">
                            {isFree ? "ফ্রি" : `৳${Number(z.charge).toFixed(0)}`}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}
              <div>
                <Label>নোট (ঐচ্ছিক)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-semibold">Payment: Cash on Delivery</div>
                <div className="text-xs text-muted-foreground">পণ্য পেয়ে নগদ পরিশোধ করুন।</div>
              </div>
              <Button onClick={placeOrder} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Order Confirm করুন (৳{total.toFixed(0)})
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Order Summary</h3>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.listing_id} className="flex justify-between text-sm">
                  <span className="truncate">{it.name} × {it.qty}</span>
                  <span>৳{(it.price * it.qty).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t pt-2 text-sm">
              <span>Subtotal</span><span>৳{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery {selectedZone ? `(${selectedZone.name})` : ""}</span>
              <span>{deliveryCharge === 0 ? (selectedZone ? "ফ্রি" : "৳0") : `৳${deliveryCharge.toFixed(0)}`}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span><span>৳{total.toFixed(0)}</span>
            </div>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}