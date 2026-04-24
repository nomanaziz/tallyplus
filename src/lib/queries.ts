import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Products (per shop) ---------- */
export const productsListQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["products", "list", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,barcode,unit,cost_price,sale_price,stock,low_stock_alert,category_id,image_url")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* Lightweight product list for POS/Stock (smaller payload) */
export const productsLiteQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["products", "lite", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id,name,unit,cost_price,sale_price,stock,image_url")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Dashboard summary (single RPC) ---------- */
export type DashboardSummary = {
  sales: number;
  purchases: number;
  expenses: number;
  receivable: number;
  payable: number;
  stockValue: number;
  balance: number;
};

export const dashboardSummaryQuery = (
  shopId: string | null | undefined,
  sinceIso: string,
) =>
  queryOptions({
    queryKey: ["dashboard", "summary", shopId, sinceIso],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async (): Promise<DashboardSummary> => {
      if (!shopId) {
        return { sales: 0, purchases: 0, expenses: 0, receivable: 0, payable: 0, stockValue: 0, balance: 0 };
      }
      const { data, error } = await supabase.rpc("dashboard_summary", {
        _shop_id: shopId,
        _since: sinceIso,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | {
            sales: number | string;
            purchases: number | string;
            expenses: number | string;
            receivable: number | string;
            payable: number | string;
            stock_value: number | string;
            cash_in: number | string;
            cash_out: number | string;
          }
        | null;
      const n = (v: number | string | null | undefined) => Number(v ?? 0);
      return {
        sales: n(row?.sales),
        purchases: n(row?.purchases),
        expenses: n(row?.expenses),
        receivable: n(row?.receivable),
        payable: n(row?.payable),
        stockValue: n(row?.stock_value),
        balance: n(row?.cash_in) - n(row?.cash_out),
      };
    },
  });

/* ---------- Stock movements history ---------- */
export const stockHistoryQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["stock", "history", shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id,product_id,qty,type,note,created_at")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Access page (members) ---------- */
export const shopMembersQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["shop", "members", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return { ownerId: null as string | null, rows: [] as { id: string; user_id: string; role: string }[], profiles: {} as Record<string, { id: string; full_name: string | null; phone: string | null }> };
      const [{ data: shop }, { data: rows }] = await Promise.all([
        supabase.from("shops").select("owner_id").eq("id", shopId).maybeSingle(),
        supabase.from("shop_members").select("id,user_id,role").eq("shop_id", shopId),
      ]);
      const ownerId = shop?.owner_id ?? null;
      const ids = Array.from(new Set([...(ownerId ? [ownerId] : []), ...((rows ?? []).map((r) => r.user_id))]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };
      const profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return { ownerId, rows: rows ?? [], profiles };
    },
  });