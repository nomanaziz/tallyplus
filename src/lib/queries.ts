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
        .select("id,name,sku,barcode,unit,cost_price,sale_price,stock,low_stock_alert,category_id,image_url,is_serialized,is_marketplace_published")
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
        .select("id,name,unit,cost_price,sale_price,stock,image_url,bulk_enabled,bulk_price,bulk_min_qty,is_serialized,barcode,sku")
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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
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

/* ---------- Dashboard overview (desktop wide widgets) ---------- */
export type DashboardOverview = {
  productsTotal: number;
  productsLowStock: number;
  productsPublished: number;
  warrantyActive: number;
  customersCount: number;
  suppliersCount: number;
  employeesCount: number;
  ordersPending: number;
  fordoNew: number;
  recentSales: Array<{ id: string; invoice_no: string | null; total: number; created_at: string; customer_name: string | null }>;
  recentWishlists: Array<{ id: string; customer_name: string | null; status: string; created_at: string }>;
  recentOrders: Array<{ id: string; customer_name: string | null; total: number; status: string; created_at: string }>;
  lowStockProducts: Array<{ id: string; name: string; stock: number; low_stock_alert: number | null }>;
  expiringWarranty: Array<{ id: string; name: string; warranty_end_date: string }>;
};

export const dashboardOverviewQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["dashboard", "overview", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<DashboardOverview> => {
      const empty: DashboardOverview = {
        productsTotal: 0, productsLowStock: 0, productsPublished: 0, warrantyActive: 0,
        customersCount: 0, suppliersCount: 0, employeesCount: 0, ordersPending: 0, fordoNew: 0,
        recentSales: [], recentWishlists: [], recentOrders: [], lowStockProducts: [], expiringWarranty: [],
      };
      if (!shopId) return empty;
      const nowIso = new Date().toISOString();
      const in30 = new Date(Date.now() + 30 * 86400_000).toISOString();

      const [
        productsAll, lowStock, published, warranty,
        customersC, suppliersC, members, ordersPending, fordoNew,
        recentSales, recentWishlists, recentOrders, lowStockList, expiringWarranty,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("products").select("id,name,stock,low_stock_alert").eq("shop_id", shopId).is("deleted_at", null).not("low_stock_alert", "is", null),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shopId).is("deleted_at", null).eq("is_marketplace_published", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shopId).is("deleted_at", null).gte("warranty_end_date", nowIso),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("shop_members").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("marketplace_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).in("status", ["pending", "processing"]),
        supabase.from("customer_wishlists").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "new"),
        supabase.from("sales").select("id,invoice_no,total,created_at,customers(name)").eq("shop_id", shopId).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("customer_wishlists").select("id,customer_name,status,created_at").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(5),
        supabase.from("marketplace_orders").select("id,customer_name,total,status,created_at").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id,name,stock,low_stock_alert").eq("shop_id", shopId).is("deleted_at", null).not("low_stock_alert", "is", null).order("stock", { ascending: true }).limit(5),
        supabase.from("products").select("id,name,warranty_end_date").eq("shop_id", shopId).is("deleted_at", null).gte("warranty_end_date", nowIso).lte("warranty_end_date", in30).order("warranty_end_date", { ascending: true }).limit(5),
      ]);

      const lowStockCount = ((lowStock.data ?? []) as Array<{ stock: number; low_stock_alert: number | null }>)
        .filter((p) => (p.low_stock_alert ?? 0) > 0 && Number(p.stock) <= Number(p.low_stock_alert)).length;

      return {
        productsTotal: productsAll.count ?? 0,
        productsLowStock: lowStockCount,
        productsPublished: published.count ?? 0,
        warrantyActive: warranty.count ?? 0,
        customersCount: customersC.count ?? 0,
        suppliersCount: suppliersC.count ?? 0,
        employeesCount: (members.count ?? 0) + 1,
        ordersPending: ordersPending.count ?? 0,
        fordoNew: fordoNew.count ?? 0,
        recentSales: ((recentSales.data ?? []) as Array<{ id: string; invoice_no: string | null; total: number; created_at: string; customers: { name: string } | null }>).map((r) => ({
          id: r.id, invoice_no: r.invoice_no, total: Number(r.total), created_at: r.created_at, customer_name: r.customers?.name ?? null,
        })),
        recentWishlists: ((recentWishlists.data ?? []) as Array<{ id: string; customer_name: string | null; status: string; created_at: string }>),
        recentOrders: ((recentOrders.data ?? []) as Array<{ id: string; customer_name: string | null; total: number; status: string; created_at: string }>).map((r) => ({ ...r, total: Number(r.total) })),
        lowStockProducts: ((lowStockList.data ?? []) as Array<{ id: string; name: string; stock: number; low_stock_alert: number | null }>)
          .filter((p) => (p.low_stock_alert ?? 0) > 0 && Number(p.stock) <= Number(p.low_stock_alert)),
        expiringWarranty: ((expiringWarranty.data ?? []) as Array<{ id: string; name: string; warranty_end_date: string }>),
      };
    },
  });

/* ---------- Cash movements ---------- */
export const cashMovementsQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["cash", "movements", shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("cash_movements")
        .select("id,direction,amount,note,ref_table,ref_id,created_at,denominations")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Sales list ---------- */
export const salesListQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["sales", "list", shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("id,invoice_no,customer_id,subtotal,discount,total,paid,due,payment_method,note,created_at")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Purchases list ---------- */
export const purchasesListQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["purchases", "list", shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("purchases")
        .select("id,invoice_no,supplier_id,subtotal,discount,total,paid,due,payment_method,note,created_at")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Expenses list ---------- */
export const expensesListQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["expenses", "list", shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("id,category,amount,note,paid_via,created_at")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Contacts (customers / suppliers) ---------- */
export const contactsQuery = (
  shopId: string | null | undefined,
  type: "customers" | "suppliers",
) =>
  queryOptions({
    queryKey: ["contacts", type, shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from(type)
        .select("id,name,phone,address,due_balance,created_at")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* ---------- Recycle bin (soft-deleted) ---------- */
export const recycleBinQuery = (
  shopId: string | null | undefined,
  table:
    | "products"
    | "customers"
    | "suppliers"
    | "sales"
    | "purchases"
    | "expenses"
    | "customer_wishlists",
) =>
  queryOptions({
    queryKey: ["recycle", table, shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId) return [];
      const cols =
        table === "products"
          ? "id,name,stock,sale_price,deleted_at"
          : table === "customers" || table === "suppliers"
            ? "id,name,phone,deleted_at"
            : table === "expenses"
              ? "id,category,amount,note,deleted_at,created_at"
              : table === "customer_wishlists"
                ? "id,customer_name,customer_phone,deleted_at,created_at"
                : "id,invoice_no,total,deleted_at,created_at";
      const { data, error } = await supabase
        .from(table)
        .select(cols)
        .eq("shop_id", shopId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(200);
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
      if (!shopId)
        return {
          ownerId: null as string | null,
          rows: [] as {
            id: string;
            user_id: string;
            role: string;
            full_name: string | null;
            email: string | null;
            address: string | null;
            avatar_url: string | null;
            permissions: Record<string, string[]> | null;
            custom_role_id: string | null;
          }[],
          profiles: {} as Record<string, { id: string; full_name: string | null; phone: string | null; avatar_url: string | null }>,
        };
      const [{ data: shop }, { data: rows }] = await Promise.all([
        supabase.from("shops").select("owner_id").eq("id", shopId).maybeSingle(),
        supabase
          .from("shop_members")
          .select("id,user_id,role,full_name,email,address,avatar_url,permissions,custom_role_id")
          .eq("shop_id", shopId),
      ]);
      const ownerId = shop?.owner_id ?? null;
      const ids = Array.from(new Set([...(ownerId ? [ownerId] : []), ...((rows ?? []).map((r) => r.user_id))]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone,avatar_url").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; phone: string | null; avatar_url: string | null }[] };
      const profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return { ownerId, rows: (rows ?? []) as any, profiles };
    },
  });

/* ---------- Custom roles (per shop) ---------- */
export const customRolesQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["shop", "custom_roles", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return [] as { id: string; name: string; permissions: Record<string, string[]> }[];
      const { data, error } = await supabase
        .from("shop_custom_roles")
        .select("id,name,permissions")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; permissions: Record<string, string[]> }[];
    },
  });

/* ---------- Contact transactions (sales/purchases for a contact) ---------- */
export const contactTransactionsQuery = (
  shopId: string | null | undefined,
  type: "customers" | "suppliers",
  contactId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["contact-tx", type, shopId, contactId],
    enabled: !!shopId && !!contactId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!shopId || !contactId) return [] as any[];
      if (type === "customers") {
        const { data, error } = await supabase
          .from("sales")
          .select("id,invoice_no,total,due,paid,created_at,payment_method")
          .eq("shop_id", shopId)
          .eq("customer_id", contactId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      }
      const { data, error } = await supabase
        .from("purchases")
        .select("id,invoice_no,total,due,paid,created_at,payment_method")
        .eq("shop_id", shopId)
        .eq("supplier_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
/* ---------- Reports ---------- */
export type ReportRange = { startIso: string; endIso: string };

function endOfDayIso(yyyymmdd: string) {
  const d = new Date(yyyymmdd + "T23:59:59.999");
  return d.toISOString();
}
function startOfDayIso(yyyymmdd: string) {
  const d = new Date(yyyymmdd + "T00:00:00.000");
  return d.toISOString();
}
export function rangeToIso(start: string, end: string): ReportRange {
  return { startIso: startOfDayIso(start), endIso: endOfDayIso(end) };
}

export type BusinessReportSummary = {
  totalSales: number;
  cashSales: number;
  dueReceived: number;
  cashPurchase: number;
  duePaid: number;
  otherIncome: number;
  otherExpense: number;
  receivable: number;
  payable: number;
  productProfit: number;
};

export const businessReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "summary", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    staleTime: 15_000,
    queryFn: async (): Promise<BusinessReportSummary> => {
      if (!shopId) {
        return {
          totalSales: 0, cashSales: 0, dueReceived: 0, cashPurchase: 0, duePaid: 0,
          otherIncome: 0, otherExpense: 0, receivable: 0, payable: 0, productProfit: 0,
        };
      }
      const inRange = (q: any) => q.eq("shop_id", shopId).gte("created_at", range.startIso).lte("created_at", range.endIso);

      const [sales, purchases, expenses, income, custReceipts, supPayments, productLine, recv, pay] = await Promise.all([
        inRange(supabase.from("sales").select("total,paid,due").is("deleted_at", null)),
        inRange(supabase.from("purchases").select("total,paid,due").is("deleted_at", null)),
        inRange(supabase.from("expenses").select("amount").is("deleted_at", null)),
        inRange(supabase.from("other_income").select("amount").is("deleted_at", null)),
        inRange(supabase.from("payments").select("amount").eq("direction", "in").not("customer_id", "is", null)),
        inRange(supabase.from("payments").select("amount").eq("direction", "out").not("supplier_id", "is", null)),
        // Profit = sum((sale_item.price - product.cost_price) * qty) for sales in range
        supabase.from("sale_items").select("qty,price,product_id,products(cost_price),sales!inner(shop_id,created_at,deleted_at)")
          .eq("sales.shop_id", shopId)
          .gte("sales.created_at", range.startIso)
          .lte("sales.created_at", range.endIso)
          .is("sales.deleted_at", null),
        supabase.from("customers").select("due_balance").eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("suppliers").select("due_balance").eq("shop_id", shopId).is("deleted_at", null),
      ]);

      const sum = (rows: any[] | null | undefined, key = "amount") =>
        (rows ?? []).reduce((a, r) => a + Number(r?.[key] ?? 0), 0);

      const totalSales = sum(sales.data ?? [], "total");
      const totalPaidSales = sum(sales.data ?? [], "paid");
      const totalDueSales = sum(sales.data ?? [], "due");
      // "নগদ বিক্রয় (কাস্টমার বাকি বাদে)" = paid amount on sales (cash portion received at sale time)
      const cashSales = totalPaidSales;
      const totalPurchases = sum(purchases.data ?? [], "total");
      const totalPaidPurchases = sum(purchases.data ?? [], "paid");
      const cashPurchase = totalPaidPurchases;

      let productProfit = 0;
      for (const r of (productLine.data ?? []) as any[]) {
        const cost = Number(r?.products?.cost_price ?? 0);
        const price = Number(r?.price ?? 0);
        const qty = Number(r?.qty ?? 0);
        productProfit += (price - cost) * qty;
      }

      // suppress unused warning
      void totalDueSales; void totalSales; void totalPurchases;

      return {
        totalSales,
        cashSales,
        dueReceived: sum(custReceipts.data ?? []),
        cashPurchase,
        duePaid: sum(supPayments.data ?? []),
        otherIncome: sum(income.data ?? []),
        otherExpense: sum(expenses.data ?? []),
        receivable: sum(recv.data ?? [], "due_balance"),
        payable: sum(pay.data ?? [], "due_balance"),
        productProfit,
      };
    },
  });

/* ---------- Combined (multi-shop) report ---------- */
export type CombinedReport = {
  perShop: Record<string, BusinessReportSummary>;
  totals: BusinessReportSummary;
};

async function fetchOneShopReport(shopId: string, range: ReportRange): Promise<BusinessReportSummary> {
  const inRange = (q: any) =>
    q.eq("shop_id", shopId).gte("created_at", range.startIso).lte("created_at", range.endIso);

  const [sales, purchases, expenses, income, custReceipts, supPayments, productLine, recv, pay] = await Promise.all([
    inRange(supabase.from("sales").select("total,paid,due").is("deleted_at", null)),
    inRange(supabase.from("purchases").select("total,paid,due").is("deleted_at", null)),
    inRange(supabase.from("expenses").select("amount").is("deleted_at", null)),
    inRange(supabase.from("other_income").select("amount").is("deleted_at", null)),
    inRange(supabase.from("payments").select("amount").eq("direction", "in").not("customer_id", "is", null)),
    inRange(supabase.from("payments").select("amount").eq("direction", "out").not("supplier_id", "is", null)),
    supabase
      .from("sale_items")
      .select("qty,price,product_id,products(cost_price),sales!inner(shop_id,created_at,deleted_at)")
      .eq("sales.shop_id", shopId)
      .gte("sales.created_at", range.startIso)
      .lte("sales.created_at", range.endIso)
      .is("sales.deleted_at", null),
    supabase.from("customers").select("due_balance").eq("shop_id", shopId).is("deleted_at", null),
    supabase.from("suppliers").select("due_balance").eq("shop_id", shopId).is("deleted_at", null),
  ]);

  const sum = (rows: any[] | null | undefined, key = "amount") =>
    (rows ?? []).reduce((a, r) => a + Number(r?.[key] ?? 0), 0);

  let productProfit = 0;
  for (const r of (productLine.data ?? []) as any[]) {
    const cost = Number(r?.products?.cost_price ?? 0);
    const price = Number(r?.price ?? 0);
    const qty = Number(r?.qty ?? 0);
    productProfit += (price - cost) * qty;
  }

  return {
    totalSales: sum(sales.data ?? [], "total"),
    cashSales: sum(sales.data ?? [], "paid"),
    dueReceived: sum(custReceipts.data ?? []),
    cashPurchase: sum(purchases.data ?? [], "paid"),
    duePaid: sum(supPayments.data ?? []),
    otherIncome: sum(income.data ?? []),
    otherExpense: sum(expenses.data ?? []),
    receivable: sum(recv.data ?? [], "due_balance"),
    payable: sum(pay.data ?? [], "due_balance"),
    productProfit,
  };
}

export const combinedReportQuery = (shopIds: string[], range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "combined", [...shopIds].sort().join(","), range.startIso, range.endIso],
    enabled: shopIds.length > 0,
    staleTime: 15_000,
    queryFn: async (): Promise<CombinedReport> => {
      const empty: BusinessReportSummary = {
        totalSales: 0, cashSales: 0, dueReceived: 0, cashPurchase: 0, duePaid: 0,
        otherIncome: 0, otherExpense: 0, receivable: 0, payable: 0, productProfit: 0,
      };
      if (shopIds.length === 0) return { perShop: {}, totals: empty };
      const results = await Promise.all(shopIds.map((id) => fetchOneShopReport(id, range)));
      const perShop: Record<string, BusinessReportSummary> = {};
      const totals: BusinessReportSummary = { ...empty };
      shopIds.forEach((id, i) => {
        perShop[id] = results[i];
        const r = results[i];
        totals.totalSales += r.totalSales;
        totals.cashSales += r.cashSales;
        totals.dueReceived += r.dueReceived;
        totals.cashPurchase += r.cashPurchase;
        totals.duePaid += r.duePaid;
        totals.otherIncome += r.otherIncome;
        totals.otherExpense += r.otherExpense;
        totals.receivable += r.receivable;
        totals.payable += r.payable;
        totals.productProfit += r.productProfit;
      });
      return { perShop, totals };
    },
  });

/* Sales report — invoices in range */
export const salesReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "sales", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("sales")
        .select("id,invoice_no,total,paid,due,payment_method,created_at,customer_id,customers(name)")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Also fetch item counts per sale
      const ids = (data ?? []).map((s: any) => s.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: items } = await supabase.from("sale_items").select("sale_id,qty").in("sale_id", ids);
        for (const it of items ?? []) counts[(it as any).sale_id] = (counts[(it as any).sale_id] ?? 0) + Number((it as any).qty ?? 0);
      }
      return (data ?? []).map((s: any) => ({ ...s, item_count: counts[s.id] ?? 0 }));
    },
  });

/* Purchase report */
export const purchaseReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "purchase", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("purchases")
        .select("id,invoice_no,total,paid,due,payment_method,created_at,supplier_id,suppliers(name)")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((s: any) => s.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: items } = await supabase.from("purchase_items").select("purchase_id,qty").in("purchase_id", ids);
        for (const it of items ?? []) counts[(it as any).purchase_id] = (counts[(it as any).purchase_id] ?? 0) + Number((it as any).qty ?? 0);
      }
      return (data ?? []).map((s: any) => ({ ...s, item_count: counts[s.id] ?? 0 }));
    },
  });

/* Stock report — stock movements aggregated per product within range */
export const stockReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "stock", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("stock_movements")
        .select("product_id,qty,type,products(name,cost_price,sale_price)")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso);
      if (error) throw error;
      const map: Record<string, { name: string; in_qty: number; in_amt: number; out_qty: number; out_amt: number }> = {};
      for (const m of (data ?? []) as any[]) {
        const pid = m.product_id as string;
        const name = m?.products?.name ?? "—";
        const cost = Number(m?.products?.cost_price ?? 0);
        const sale = Number(m?.products?.sale_price ?? 0);
        const qty = Number(m?.qty ?? 0);
        if (!map[pid]) map[pid] = { name, in_qty: 0, in_amt: 0, out_qty: 0, out_amt: 0 };
        if (qty >= 0) {
          map[pid].in_qty += qty;
          map[pid].in_amt += qty * cost;
        } else {
          map[pid].out_qty += qty;
          map[pid].out_amt += qty * sale;
        }
      }
      return Object.entries(map).map(([id, v]) => ({ id, ...v }));
    },
  });

/* Product report — sold qty / revenue / profit per product */
export const productReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "product", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("sale_items")
        .select("product_id,qty,price,products(name,cost_price),sales!inner(shop_id,created_at,deleted_at)")
        .eq("sales.shop_id", shopId)
        .gte("sales.created_at", range.startIso)
        .lte("sales.created_at", range.endIso)
        .is("sales.deleted_at", null);
      if (error) throw error;
      const map: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const pid = (r.product_id ?? "_") as string;
        const name = r?.products?.name ?? "—";
        const cost = Number(r?.products?.cost_price ?? 0);
        const price = Number(r?.price ?? 0);
        const qty = Number(r?.qty ?? 0);
        if (!map[pid]) map[pid] = { name, qty: 0, revenue: 0, profit: 0 };
        map[pid].qty += qty;
        map[pid].revenue += price * qty;
        map[pid].profit += (price - cost) * qty;
      }
      return Object.entries(map)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.revenue - a.revenue);
    },
  });

/* Top customers */
export const topCustomersQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "top-customers", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("sales")
        .select("customer_id,total,due,customers(name,phone,due_balance)")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null)
        .not("customer_id", "is", null);
      if (error) throw error;
      const map: Record<string, { name: string; phone: string; orders: number; total: number; due: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const cid = r.customer_id as string;
        if (!map[cid])
          map[cid] = { name: r?.customers?.name ?? "—", phone: r?.customers?.phone ?? "", orders: 0, total: 0, due: Number(r?.customers?.due_balance ?? 0) };
        map[cid].orders += 1;
        map[cid].total += Number(r?.total ?? 0);
      }
      return Object.entries(map)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.total - a.total);
    },
  });

/* Top employees (created_by) */
export const topEmployeesQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "top-employees", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("sales")
        .select("created_by,total")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null)
        .not("created_by", "is", null);
      if (error) throw error;
      const map: Record<string, { count: number; total: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const id = r.created_by as string;
        if (!map[id]) map[id] = { count: 0, total: 0 };
        map[id].count += 1;
        map[id].total += Number(r?.total ?? 0);
      }
      const ids = Object.keys(map);
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: members } = await supabase.from("shop_members").select("user_id,full_name").eq("shop_id", shopId).in("user_id", ids);
        for (const m of members ?? []) names[(m as any).user_id] = (m as any).full_name ?? "";
        const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
        for (const p of profs ?? []) if (!names[(p as any).id]) names[(p as any).id] = (p as any).full_name ?? "";
      }
      return Object.entries(map)
        .map(([id, v]) => ({ id, name: names[id] || "—", ...v }))
        .sort((a, b) => b.total - a.total);
    },
  });

/* Expense report — aggregated by category */
export const expenseReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "expense", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("expenses")
        .select("category,amount")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null);
      if (error) throw error;
      const map: Record<string, { count: number; amount: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const cat = (r.category ?? "অন্যান্য") as string;
        if (!map[cat]) map[cat] = { count: 0, amount: 0 };
        map[cat].count += 1;
        map[cat].amount += Number(r?.amount ?? 0);
      }
      return Object.entries(map)
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.amount - a.amount);
    },
  });

/* Supplier report */
export const supplierReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "supplier", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("purchases")
        .select("supplier_id,total,paid,due,suppliers(name,phone,due_balance)")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null)
        .not("supplier_id", "is", null);
      if (error) throw error;
      const map: Record<string, { name: string; phone: string; total: number; paid: number; due: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const sid = r.supplier_id as string;
        if (!map[sid])
          map[sid] = { name: r?.suppliers?.name ?? "—", phone: r?.suppliers?.phone ?? "", total: 0, paid: 0, due: Number(r?.suppliers?.due_balance ?? 0) };
        map[sid].total += Number(r?.total ?? 0);
        map[sid].paid += Number(r?.paid ?? 0);
      }
      return Object.entries(map)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.total - a.total);
    },
  });

/* Income report — other_income entries */
export const incomeReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["report", "income", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase
        .from("other_income")
        .select("id,source,amount,note,paid_via,created_at")
        .eq("shop_id", shopId)
        .gte("created_at", range.startIso)
        .lte("created_at", range.endIso)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/* Printer settings */
export const printerSettingsQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["printer-settings", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return null;
      const { data, error } = await supabase
        .from("shop_printer_settings")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/* ---------- Owner ledger (invest / withdraw) ---------- */
export type OwnerTxn = {
  id: string;
  shop_id: string;
  direction: "invest" | "withdraw";
  amount: number;
  note: string | null;
  paid_via: string;
  tx_date: string;
  created_at: string;
};

export const ownerTxnsQuery = (shopId: string | null | undefined, range?: ReportRange) =>
  queryOptions({
    queryKey: ["owner-txns", shopId, range?.startIso ?? null, range?.endIso ?? null],
    enabled: !!shopId,
    staleTime: 15_000,
    queryFn: async () => {
      if (!shopId) return [] as OwnerTxn[];
      let q = supabase
        .from("owner_transactions")
        .select("id,shop_id,direction,amount,note,paid_via,tx_date,created_at")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (range) q = q.gte("tx_date", range.startIso.slice(0, 10)).lte("tx_date", range.endIso.slice(0, 10));
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OwnerTxn[];
    },
  });

/* ---------- Assets register ---------- */
export type AssetRow = {
  id: string;
  shop_id: string;
  name: string;
  category: string | null;
  purchase_price: number;
  purchase_date: string;
  paid_via: string;
  quantity: number;
  status: "active" | "damaged" | "sold" | "disposed";
  disposed_at: string | null;
  disposed_value: number;
  note: string | null;
  image_url: string | null;
  created_at: string;
};

export const assetsListQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["assets", "list", shopId],
    enabled: !!shopId,
    staleTime: 15_000,
    queryFn: async () => {
      if (!shopId) return [] as AssetRow[];
      const { data, error } = await supabase
        .from("assets")
        .select("id,shop_id,name,category,purchase_price,purchase_date,paid_via,quantity,status,disposed_at,disposed_value,note,image_url,created_at")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssetRow[];
    },
  });

/* ---------- Owner business report (combined statement) ---------- */
export type OwnerReport = {
  totalInvest: number;
  totalWithdraw: number;
  netCapital: number;
  activeAssetValue: number;
  assetLoss: number;
  productProfit: number;
  otherIncome: number;
  otherExpense: number;
  netProfit: number;
  ownerEquity: number;
};

export const ownerReportQuery = (shopId: string | null | undefined, range: ReportRange) =>
  queryOptions({
    queryKey: ["owner-report", shopId, range.startIso, range.endIso],
    enabled: !!shopId,
    staleTime: 15_000,
    queryFn: async (): Promise<OwnerReport> => {
      const empty: OwnerReport = {
        totalInvest: 0, totalWithdraw: 0, netCapital: 0,
        activeAssetValue: 0, assetLoss: 0,
        productProfit: 0, otherIncome: 0, otherExpense: 0, netProfit: 0, ownerEquity: 0,
      };
      if (!shopId) return empty;
      const startDate = range.startIso.slice(0, 10);
      const endDate = range.endIso.slice(0, 10);

      const [ownerTx, assetsAll, expenses, income, productLine] = await Promise.all([
        supabase.from("owner_transactions").select("direction,amount")
          .eq("shop_id", shopId).is("deleted_at", null)
          .gte("tx_date", startDate).lte("tx_date", endDate),
        supabase.from("assets").select("purchase_price,disposed_value,status,disposed_at,purchase_date")
          .eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("expenses").select("amount").eq("shop_id", shopId).is("deleted_at", null)
          .gte("created_at", range.startIso).lte("created_at", range.endIso),
        supabase.from("other_income").select("amount").eq("shop_id", shopId).is("deleted_at", null)
          .gte("created_at", range.startIso).lte("created_at", range.endIso),
        supabase.from("sale_items")
          .select("qty,price,product_id,products(cost_price),sales!inner(shop_id,created_at,deleted_at)")
          .eq("sales.shop_id", shopId)
          .gte("sales.created_at", range.startIso)
          .lte("sales.created_at", range.endIso)
          .is("sales.deleted_at", null),
      ]);

      let totalInvest = 0, totalWithdraw = 0;
      for (const r of (ownerTx.data ?? []) as any[]) {
        const a = Number(r.amount ?? 0);
        if (r.direction === "invest") totalInvest += a;
        else if (r.direction === "withdraw") totalWithdraw += a;
      }
      let activeAssetValue = 0, assetLoss = 0;
      for (const r of (assetsAll.data ?? []) as any[]) {
        const price = Number(r.purchase_price ?? 0);
        if (r.status === "active") {
          activeAssetValue += price;
        } else {
          // damaged / sold / disposed
          assetLoss += Math.max(0, price - Number(r.disposed_value ?? 0));
        }
      }
      let productProfit = 0;
      for (const r of (productLine.data ?? []) as any[]) {
        const cost = Number(r?.products?.cost_price ?? 0);
        const price = Number(r?.price ?? 0);
        const qty = Number(r?.qty ?? 0);
        productProfit += (price - cost) * qty;
      }
      const sum = (rows: any[] | null | undefined) =>
        (rows ?? []).reduce((a, r) => a + Number(r?.amount ?? 0), 0);
      const otherIncome = sum(income.data);
      const otherExpense = sum(expenses.data);
      const netProfit = productProfit + otherIncome - otherExpense;
      const netCapital = totalInvest - totalWithdraw;
      const ownerEquity = netCapital + netProfit - assetLoss;
      return {
        totalInvest, totalWithdraw, netCapital,
        activeAssetValue, assetLoss,
        productProfit, otherIncome, otherExpense, netProfit, ownerEquity,
      };
    },
  });
