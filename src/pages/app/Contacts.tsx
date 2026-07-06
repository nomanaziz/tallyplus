import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UserRound, Truck, Users, RefreshCw, ChevronRight, Search, MessageCircle, BookUser, Wallet } from "lucide-react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { contactsQuery, contactTransactionsQuery, shopMembersQuery, customRolesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactActionsBar } from "@/components/app/ContactActionsBar";
import { NewUserAccessDialog } from "@/components/app/NewUserAccessDialog";
import { EmployeeEditDialog, type EmployeeEditData } from "@/components/app/EmployeeEditDialog";
import { DueReminderDialog } from "@/components/app/DueReminderDialog";
import { PhonebookPickerDialog, type PhonebookContact } from "@/components/app/PhonebookPickerDialog";
import { toast } from "sonner";

type Tab = "customers" | "suppliers" | "employees";
type Contact = { id: string; name: string; phone: string | null; address: string | null; due_balance: number; is_active?: boolean };
type StatusFilter = "all" | "due" | "settled" | "advance" | "active" | "inactive";
type Tx = { id: string; invoice_no: string | null; total: number; due: number; paid: number; created_at: string; payment_method: string };



function ContactsPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("customers");
  const isContactTable = tab === "customers" || tab === "suppliers";

  const { data: raw = [], refetch } = useQuery(
    contactsQuery(current?.id ?? null, isContactTable ? (tab as "customers" | "suppliers") : "customers"),
  );
  const contacts = isContactTable ? (raw as unknown as Contact[]) : [];

  const { data: membersRaw } = useQuery(shopMembersQuery(current?.id ?? null));
  const { data: customRoles = [] } = useQuery(customRolesQuery(current?.id ?? null));
  const employees: Contact[] = useMemo(() => {
    if (!membersRaw) return [];
    return membersRaw.rows
      .filter((r: any) => r.user_id !== membersRaw.ownerId)
      .map((r: any) => {
        const p = membersRaw.profiles[r.user_id];
        return {
          id: r.id,
          name: (r as any).full_name ?? p?.full_name ?? "—",
          phone: p?.phone ?? null,
          address: (r as any).address ?? null,
          due_balance: 0,
          is_active: (r as any).is_active !== false,
        } as Contact;
      });
  }, [membersRaw]);

  const list: Contact[] = tab === "employees" ? employees : contacts;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  useEffect(() => {
    setStatusFilter(tab === "employees" ? "active" : "all");
  }, [tab]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [openEmployee, setOpenEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeEditData | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (tab === "employees") {
        if (statusFilter === "active" && c.is_active === false) return false;
        if (statusFilter === "inactive" && c.is_active !== false) return false;
      } else {
        const bal = Number(c.due_balance) || 0;
        if (statusFilter === "due" && bal <= 0) return false;
        if (statusFilter === "settled" && bal !== 0) return false;
        if (statusFilter === "advance" && bal >= 0) return false;
      }
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
    });
  }, [list, search, statusFilter, tab]);

  const filteredKey = filtered.map((f) => f.id).join(",");
  useEffect(() => {
    setSelected((prev) => {
      if (prev && filtered.find((f) => f.id === prev.id)) return prev;
      return filtered[0] ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["contacts"] });
    await qc.invalidateQueries({ queryKey: ["shop", "members", current?.id] });
    await refetch();
  };

  const onDelete = async (c: Contact) => {
    if (!confirm(t("p2b_deleteQ"))) return;
    const { writeWithOffline } = await import("@/lib/useOfflineWrite");
    if (tab === "employees") {
      const res = await writeWithOffline({
        table: "shop_members", op: "delete", payload: { id: c.id },
      });
      if (res.error) { toast.error(res.error); return; }
    } else {
      const res = await writeWithOffline({
        table: tab, op: "update",
        payload: { set: { deleted_at: new Date().toISOString() }, match: { id: c.id } },
      });
      if (res.error) { toast.error(res.error); return; }
    }
    toast.success(t("p2b_deleted"));
    setSelected(null);
    void refresh();
  };

  const { data: txs = [] } = useQuery(
    contactTransactionsQuery(
      current?.id ?? null,
      tab === "suppliers" ? "suppliers" : "customers",
      isContactTable ? selected?.id ?? null : null,
    ),
  );
  const transactions = txs as Tx[];

  const initials = (name: string | null) =>
    (name || "U").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const tabBadge = (t: Tab) => {
    if (t === "employees") return employees.length;
    if (t === tab) return list.length;
    return null;
  };

  const tabs: { key: Tab; labelKey: string; icon: React.ReactNode }[] = [
    { key: "customers", labelKey: "p2b_customer", icon: <UserRound className="h-4 w-4" /> },
    { key: "suppliers", labelKey: "p2b_supplier", icon: <Truck className="h-4 w-4" /> },
    { key: "employees", labelKey: "p2b_employee", icon: <Users className="h-4 w-4" /> },
  ];

  const addBtnLabel =
    tab === "customers"
      ? t("p2b_addCustomer")
      : tab === "suppliers"
        ? t("p2b_addSupplier")
        : t("p2b_addEmployee");

  const handleAdd = () => {
    if (tab === "employees") {
      setOpenEmployee(true);
    } else {
      setEditing(null);
      setOpen(true);
    }
  };

  const handleBulkImport = async (picked: PhonebookContact[]) => {
    if (!current || tab === "employees") return;
    const table = tab as "customers" | "suppliers";
    setBulkBusy(true);
    try {
      // Normalize + dedupe within selection by phone
      const seen = new Set<string>();
      const cleaned = picked
        .map((c) => ({
          name: (c.name || c.phone || "").trim(),
          phone: (c.phone || "").replace(/\s+/g, "") || null,
        }))
        .filter((c) => c.name)
        .filter((c) => {
          const k = c.phone || `name:${c.name}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      if (cleaned.length === 0) {
        toast.error(t("p2b_nothingToAdd"));
        return;
      }
      // Pre-fetch existing phones in this shop to skip duplicates
      const phones = cleaned.map((c) => c.phone).filter((p): p is string => !!p);
      let existing = new Set<string>();
      if (phones.length > 0) {
        const { data: rows } = await supabase
          .from(table)
          .select("phone")
          .eq("shop_id", current.id)
          .is("deleted_at", null)
          .in("phone", phones);
        existing = new Set((rows ?? []).map((r: any) => r.phone).filter(Boolean));
      }
      const toInsert = cleaned
        .filter((c) => !c.phone || !existing.has(c.phone))
        .map((c) => ({ name: c.name, phone: c.phone, shop_id: current.id }));
      const skipped = cleaned.length - toInsert.length;
      if (toInsert.length === 0) {
        toast.info(t("p2b_allAlreadyExist"));
        return;
      }
      const { error } = await supabase.from(table).insert(toInsert);
      if (error) { toast.error(error.message); return; }
      toast.success(
        t("p2b_bulkAddedX", {
          n: lang === "bn" ? bnNum(toInsert.length) : toInsert.length,
          tail: skipped ? t("p2b_bulkSkippedTail", { n: lang === "bn" ? bnNum(skipped) : skipped }) : "",
        }),
      );
      void refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  const employeeRoleName = (id: string) => {
    const row = membersRaw?.rows.find((r: any) => r.id === id) as any;
    if (!row) return "EMPLOYEE";
    if (row.custom_role_id) {
      const cr = customRoles.find((c) => c.id === row.custom_role_id);
      if (cr) return cr.name.toUpperCase();
    }
    return (row.role || "cashier").toUpperCase();
  };

  return (
    <div className="container px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("p2b_customerStaff")}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/app/investors"><Wallet className="h-4 w-4" /> বিনিয়োগকারী</Link>
          </Button>
          {tab !== "employees" && (
            <Button
              variant="outline"
              onClick={() => setBulkPickerOpen(true)}
              disabled={bulkBusy}
              className="gap-1.5"
            >
              <BookUser className="h-4 w-4" />
              {t("p2b_bulkPhonebook")}
            </Button>
          )}
          <Button onClick={handleAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("p2b_add")}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* LEFT */}
        <div className="flex flex-col rounded-xl border bg-card">
          <div className="flex border-b">
            {tabs.map((tb) => {
              const active = tab === tb.key;
              const n = tabBadge(tb.key);
              return (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={
                    "relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition " +
                    (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {tb.icon}
                  <span>{t(tb.labelKey as never)}</span>
                  {n != null && n > 0 && (
                    <span className="text-[10px] text-muted-foreground">({lang === "bn" ? bnNum(n) : n})</span>
                  )}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-foreground" />}
                </button>
              );
            })}
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1 border-b p-2">
            {(tab === "employees"
              ? ([
                  { k: "active", bn: "সক্রিয়", en: "Active" },
                  { k: "inactive", bn: "নিষ্ক্রিয়", en: "Inactive" },
                  { k: "all", bn: "সবাই", en: "All" },
                ] as const)
              : ([
                  { k: "all", bn: "সবাই", en: "All" },
                  { k: "due", bn: tab === "customers" ? "বাকি আছে" : "পাব", en: "Due" },
                  { k: "settled", bn: "সমান", en: "Settled" },
                  { k: "advance", bn: "অগ্রিম", en: "Advance" },
                ] as const)
            ).map((chip) => (
              <button
                key={chip.k}
                onClick={() => setStatusFilter(chip.k as StatusFilter)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                  (statusFilter === chip.k
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent")
                }
              >
                {lang === "bn" ? chip.bn : chip.en}
              </button>
            ))}
          </div>
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("p2b_searchContacts")}
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="min-h-[260px] flex-1">
            {filtered.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title={t("p2b_noContacts")} />
            ) : (
              <div className="flex flex-col">
                {filtered.map((c) => {
                  const active = selected?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={
                        "flex items-center gap-3 border-b px-3 py-3 text-left transition " +
                        (active ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-accent")
                      }
                    >
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.phone ?? "—"}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <Button onClick={handleAdd} className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {addBtnLabel}
            </Button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-xl border bg-card">
          {!selected ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <EmptyState title={t("p2b_selectContact")} />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {initials(selected.name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold">{selected.name}</span>
                      <span className="text-xs text-muted-foreground">
                        |{" "}
                        {tab === "customers"
                          ? "Customer"
                          : tab === "suppliers"
                            ? "Supplier"
                            : employeeRoleName(selected.id)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.phone ?? "—"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ContactActionsBar
                    name={selected.name}
                    phone={selected.phone}
                    due={Number(selected.due_balance) || 0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (tab === "employees") {
                        const row = membersRaw?.rows.find((r: any) => r.id === selected.id) as any;
                        if (!row) return;
                        setEditingEmployee({
                          id: row.id,
                          full_name: row.full_name ?? selected.name,
                          address: row.address ?? null,
                          salary: row.salary ?? null,
                          nid: row.nid ?? null,
                          permanent_address: row.permanent_address ?? null,
                          father_name: row.father_name ?? null,
                          mother_name: row.mother_name ?? null,
                          emergency_phone: row.emergency_phone ?? null,
                          is_active: row.is_active !== false,
                        });
                      } else {
                        setEditing(selected);
                        setOpen(true);
                      }
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    {t("p2b_edit")}
                  </Button>
                  {tab === "customers" && Number(selected.due_balance) > 0 && selected.phone && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1fb558]"
                      onClick={() => setReminderOpen(true)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t("p2b_remind")}
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onDelete(selected)}>
                    <Trash2 className="h-4 w-4" />
                    {t("p2b_delete")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh}>
                    <RefreshCw className="h-4 w-4" />
                    {t("p2b_refresh")}
                  </Button>
                </div>
              </div>

              {isContactTable ? (
                <div className="p-3">
                  {transactions.length === 0 ? (
                    <EmptyState title={t("p2b_noTransactions")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tab === "customers" ? (t("p2b_saleHash")) : (t("p2b_purchaseHash"))}</TableHead>
                          <TableHead>{t("p2b_time")}</TableHead>
                          <TableHead>{t("p2b_info")}</TableHead>
                          <TableHead className="text-right">{t("p2b_txType")}</TableHead>
                          <TableHead className="text-right">{t("p2b_amount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => {
                          const isDue = Number(tx.due) > 0;
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-xs">{tx.invoice_no ?? tx.id.slice(0, 8)}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(tx.created_at).toLocaleString(t("p2b_localeFull"), {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </TableCell>
                              <TableCell className="text-xs">{selected.name}</TableCell>
                              <TableCell className="text-right">
                                <span className={
                                  "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold " +
                                  (isDue ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")
                                }>
                                  {isDue ? (t("p2b_due")) : (t("p2b_cash"))}
                                </span>
                              </TableCell>
                              <TableCell className={"text-right font-semibold " + (isDue ? "text-rose-600" : "")}>
                                {fmtMoney(Number(tx.total), lang)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <EmployeeBiodataPanel
                  row={membersRaw?.rows.find((r: any) => r.id === selected.id) as any}
                  lang={lang}
                />
              )}
            </>
          )}
        </div>
      </div>

      <ContactDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        table={tab === "employees" ? "customers" : (tab as "customers" | "suppliers")}
        onSaved={refresh}
      />

      <NewUserAccessDialog
        open={openEmployee}
        onOpenChange={setOpenEmployee}
        customRoles={customRoles}
        onCustomRoleCreated={() => qc.invalidateQueries({ queryKey: ["shop", "custom_roles", current?.id] })}
        onSaved={refresh}
      />

      <DueReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        customer={selected && tab === "customers" ? { id: selected.id, name: selected.name, phone: selected.phone, due_balance: Number(selected.due_balance || 0) } : null}
      />

      <PhonebookPickerDialog
        open={bulkPickerOpen}
        onOpenChange={setBulkPickerOpen}
        onPickMany={(cs) => { void handleBulkImport(cs); }}
      />

      <EmployeeEditDialog
        open={!!editingEmployee}
        onOpenChange={(v) => !v && setEditingEmployee(null)}
        employee={editingEmployee}
        onSaved={refresh}
      />
    </div>
  );
}

function EmployeeBiodataPanel({ row, lang }: { row: any; lang: string }) {
  const { t } = useI18n();
  if (!row) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("p2b_loadingDotsLong")}
      </div>
    );
  }
  const items: { labelKey: string; value: string | number | null | undefined }[] = [
    { labelKey: "p2b_emp_salary",   value: row.salary != null ? `৳ ${row.salary}` : null },
    { labelKey: "p2b_emp_nid",      value: row.nid },
    { labelKey: "p2b_emp_address",  value: row.address },
    { labelKey: "p2b_emp_permAddr", value: row.permanent_address },
    { labelKey: "p2b_emp_father",   value: row.father_name },
    { labelKey: "p2b_emp_mother",   value: row.mother_name },
    { labelKey: "p2b_emp_emerg",    value: row.emergency_phone },
  ];
  return (
    <div className="p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border bg-background p-3">
            <div className="text-xs text-muted-foreground">{t(it.labelKey as never)}</div>
            <div className="mt-0.5 text-sm font-medium">{it.value || "—"}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        {t("p2b_managePerms")}
      </div>
    </div>
  );
}

function ContactDialog({
  open,
  onOpenChange,
  editing,
  table,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Contact | null;
  table: "customers" | "suppliers";
  onSaved: () => void;
}) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
      setAddress(editing?.address ?? "");
      setPickerOpen(false);
    }
  }, [open, editing]);

  const save = async () => {
    if (!current) return;
    if (!name.trim()) { toast.error(t("p2b_nameRequired")); return; }
    setBusy(true);
    // Defensive: verify the active shop exists & is accessible to this user.
    const { data: shopRow, error: shopErr } = await supabase
      .from("shops").select("id").eq("id", current.id).maybeSingle();
    if (shopErr || !shopRow) {
      setBusy(false);
      toast.error(t("p2b_activeShopRefresh"));
      return;
    }
    const payload = { name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, shop_id: current.id };
    // Pre-insert duplicate check by phone within same shop
    if (!editing && payload.phone) {
      const { data: existing } = await supabase
        .from(table)
        .select("id, name")
        .eq("shop_id", current.id)
        .eq("phone", payload.phone)
        .is("deleted_at", null)
        .maybeSingle();
      if (existing) {
        setBusy(false);
        toast.error(
          t("p2b_contactExistsX", { name: (existing as { name: string }).name }),
        );
        return;
      }
    }
    const { writeWithOffline } = await import("@/lib/useOfflineWrite");
    const res = editing
      ? await writeWithOffline({
          table, op: "update",
          payload: { set: payload as Record<string, unknown>, match: { id: editing.id } },
        })
      : await writeWithOffline({
          table, op: "insert", payload: payload as Record<string, unknown>,
        });
    setBusy(false);
    if (res.error) {
      // Catch unique-index violation as a friendly message
      const msg = res.error.includes("customers_shop_phone_unique") || res.error.includes("suppliers_shop_phone_unique")
        ? (t("p2b_phoneExists"))
        : res.error;
      toast.error(msg);
      return;
    }
    if (!res.queued) toast.success(t("p2b_savedShort"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? (t("p2b_editShort")) : (t("p2b_new"))} —{" "}
            {table === "customers" ? (t("p2b_customer")) : (t("p2b_supplier"))}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!editing && (
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full gap-2 rounded-full"
              onClick={() => setPickerOpen(true)}
            >
              <BookUser className="h-4 w-4" />
              {t("p2b_addFromPhonebook")}
            </Button>
          )}
          <div className="grid gap-1.5">
            <Label>{t("p2b_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p2b_phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p2b_address")}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("p2b_cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : t("p2b_save")}</Button>
        </DialogFooter>
        <PhonebookPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(c) => {
            setName(c.name || "");
            setPhone((c.phone || "").replace(/\s+/g, ""));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ContactsPage;
