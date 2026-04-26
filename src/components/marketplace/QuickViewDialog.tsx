import { Link } from "@/lib/router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Store, ShieldCheck } from "lucide-react";
import { AddToListButton } from "./AddToListButton";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listing: {
    id: string;
    shop_id: string;
    price: number;
    stock: number;
    unit: string | null;
    min_order: number | null;
    warranty_months?: number | null;
  };
  product: { id: string; name: string; image_url: string | null; unit: string | null };
  shop: { id: string; name: string; username?: string | null; slug: string | null; logo_url: string | null };
};

export function QuickViewDialog({ open, onOpenChange, listing, product, shop }: Props) {
  const unit = listing.unit ?? product.unit;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="line-clamp-2 text-left">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary">৳ {listing.price}</span>
              {unit && <span className="text-sm text-muted-foreground">/ {unit}</span>}
            </div>
            {listing.stock < 0 ? (
              <div className="text-sm text-primary">সবসময় অর্ডারযোগ্য</div>
            ) : listing.stock > 0 ? (
              <div className="text-sm text-muted-foreground">স্টক: {listing.stock} {unit ?? ""}</div>
            ) : (
              <div className="text-sm font-semibold text-destructive">এখন স্টক নেই</div>
            )}
            {listing.warranty_months ? (
              <div className="inline-flex items-center gap-1 text-sm text-primary">
                <ShieldCheck className="h-4 w-4" /> {listing.warranty_months} মাস ওয়ারেন্টি
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <AddToListButton
                item={{
                  listing_id: listing.id,
                  shop_id: shop.id,
                  shop_name: shop.name,
                  name: product.name,
                  price: listing.price,
                  unit,
                  image_url: product.image_url,
                }}
                minOrder={Number(listing.min_order ?? 1)}
                maxStock={listing.stock < 0 ? undefined : listing.stock}
              />
              <Button asChild variant="outline" size="sm">
                <Link to="/shop/p/$id" params={{ id: listing.id }}>
                  বিস্তারিত দেখুন
                </Link>
              </Button>
            </div>

            <Link
              to={shop.username ? "/vendor/$username" : "/shop/s/$slug"}
              params={shop.username ? ({ username: shop.username } as never) : ({ slug: shop.slug ?? "" } as never)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border bg-card p-2 text-sm hover:bg-accent"
            >
              {shop.logo_url ? (
                <img src={shop.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted"><Store className="h-4 w-4" /></div>
              )}
              <span className="truncate font-medium">{shop.name}</span>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}