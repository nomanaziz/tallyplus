import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, ShoppingBag, Store, ShieldCheck } from "lucide-react";
import { AddToListButton } from "./AddToListButton";
import { QuickViewDialog } from "./QuickViewDialog";
import { cn } from "@/lib/utils";

export type CardListing = {
  id: string;
  shop_id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  min_order: number | null;
  warranty_months?: number | null;
};

export type CardProduct = {
  id: string;
  name: string;
  image_url: string | null;
  unit: string | null;
};

export type CardShop = {
  id: string;
  name: string;
  username?: string | null;
  slug: string | null;
  logo_url: string | null;
};

type Props = {
  listing: CardListing;
  product: CardProduct;
  shop: CardShop;
  showShopChip?: boolean;
};

export function MarketplaceProductCard({ listing, product, shop, showShopChip = true }: Props) {
  const [quickOpen, setQuickOpen] = useState(false);
  const unit = listing.unit ?? product.unit;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <div className="group relative rounded-xl border bg-card p-2.5 transition-shadow hover:shadow-md">
        <Link
          to="/shop/p/$id"
          params={{ id: listing.id }}
          className="block"
        >
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-10 w-10" />
              </div>
            )}
            {/* Quick view */}
            <button
              type="button"
              aria-label="দ্রুত দেখুন"
              onClick={(e) => {
                stop(e);
                setQuickOpen(true);
              }}
              className={cn(
                "absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm",
                "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {listing.stock === 0 && (
              <div className="absolute left-1.5 top-1.5 rounded-md bg-destructive/90 px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                স্টক নেই
              </div>
            )}
          </div>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-base font-bold text-primary">৳{listing.price}</span>
            {listing.warranty_months ? (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-primary">
                <ShieldCheck className="h-3 w-3" />{listing.warranty_months}মা
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 line-clamp-2 min-h-[2.25rem] text-xs font-medium leading-snug">{product.name}</div>
          {unit && <div className="mt-0.5 text-[11px] text-muted-foreground">{unit}</div>}
        </Link>

        {/* Floating + button */}
        <div className="absolute bottom-[5.25rem] right-3 sm:bottom-[5.5rem]">
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
            size="sm"
          />
        </div>

        {showShopChip && (
          <Link
            to={shop.username ? "/vendor/$username" : "/shop/s/$slug"}
            params={shop.username ? ({ username: shop.username } as never) : ({ slug: shop.slug ?? "" } as never)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1.5 flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
            ) : (
              <Store className="h-3 w-3" />
            )}
            <span className="truncate">{shop.name}</span>
          </Link>
        )}
      </div>

      <QuickViewDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        listing={listing}
        product={product}
        shop={shop}
      />
    </>
  );
}