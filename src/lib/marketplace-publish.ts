import { supabase } from "@/integrations/supabase/client";

export type ProductPublishInput = {
  id: string;
  shop_id: string;
  sale_price: number;
  stock: number;
  unit: string | null;
  warranty_enabled?: boolean;
  warranty_value?: number | null;
};

/**
 * Publishes (or unpublishes) a product to the public marketplace.
 *
 * On publish:
 *  1. Ensures the parent shop has marketplace_enabled=true.
 *     (Without this, the marketplace-public edge function silently filters
 *      out the listing — which is the root cause of "online product not
 *      visible in marketplace".)
 *  2. Upserts a row in marketplace_listings (one per product) with current
 *     price/stock/unit/warranty.
 *  3. Sets products.is_marketplace_published.
 *
 * On unpublish: marks the listing as is_published=false (kept as a row so
 * historical orders still resolve) and clears the product flag.
 */
export async function publishProductToMarketplace(
  product: ProductPublishInput,
  publish: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    if (publish) {
      // 1) Make sure shop is on the marketplace. Owner-only column update,
      //    but we silently ignore errors here because non-owner staff may
      //    not have permission and we still want the listing to be saved.
      await supabase
        .from("shops")
        .update({ marketplace_enabled: true })
        .eq("id", product.shop_id);
    }

    // 2) Upsert listing row
    const { data: existing } = await supabase
      .from("marketplace_listings")
      .select("id")
      .eq("shop_id", product.shop_id)
      .eq("product_id", product.id)
      .maybeSingle();

    const listingPayload = {
      shop_id: product.shop_id,
      product_id: product.id,
      seller_id: user.id,
      price: product.sale_price,
      stock: product.stock,
      unit: product.unit,
      warranty_months: product.warranty_enabled ? product.warranty_value ?? null : null,
      is_published: publish,
    };

    if (existing) {
      const { error } = await supabase
        .from("marketplace_listings")
        .update(listingPayload)
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else if (publish) {
      const { error } = await supabase
        .from("marketplace_listings")
        .insert(listingPayload);
      if (error) return { ok: false, error: error.message };
    }

    // 3) Sync product flag
    await supabase
      .from("products")
      .update({ is_marketplace_published: publish })
      .eq("id", product.id);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
