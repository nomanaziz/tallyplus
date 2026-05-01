// Resolve a public shop by handle (wishlist_slug → username → slug).
// Used so that fordo links can be either /f/{wishlist_slug} (legacy)
// or /{username}/forward (clean) — and even /{shop-slug}/forward.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ShopHandleRow = {
  id: string;
  name: string;
  logo_url: string | null;
  shop_type_code: string | null;
  wishlist_slug: string | null;
  username: string | null;
  slug: string | null;
};

export async function resolveShopByHandle(
  admin: SupabaseClient,
  rawHandle: string,
): Promise<ShopHandleRow | null> {
  const handle = (rawHandle ?? "").trim();
  if (!handle) return null;
  const lower = handle.toLowerCase();

  // Try in priority order: wishlist_slug → username → slug.
  // Each is a unique-ish column so we can do separate small queries
  // and stop at the first hit. Avoids a complex .or() that may stumble on
  // case sensitivity or NULL semantics.
  const cols = "id, name, logo_url, shop_type_code, wishlist_slug, username, slug";

  const tries: Array<"wishlist_slug" | "username" | "slug"> = [
    "wishlist_slug",
    "username",
    "slug",
  ];
  for (const col of tries) {
    const { data } = await admin
      .from("shops")
      .select(cols)
      .ilike(col, lower)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (data) return data as ShopHandleRow;
  }
  return null;
}