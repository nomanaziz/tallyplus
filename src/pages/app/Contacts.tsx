import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UserRound, Truck, Users, RefreshCw, ChevronRight, Search, MessageCircle } from "lucide-react";
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
import { DueReminderDialog } from "@/components/app/DueReminderDialog";
import { toast } from "sonner";

type Tab = "customers" | "suppliers" | "employees";
type Contact = { id: string; name: string; phone: string | null; address: string | null; due_balance: number };
type Tx = { id: string; invoice_no: string | null; total: number; due: number; paid: number; created_at: string; payment_method: string };



function ContactsPage() {
  const { lang } = useI18n();
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
        } as Contact;
      });
  }, [membersRaw]);

  const list: Contact[] = tab === "employees" ? employees : contacts;

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [openEmployee, setOpenEmployee] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)) : list;
  }, [list, search]);

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
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete?")) return;
    if (tab === "employees") {
      const { error } = await supabase.from("shop_members").delete().eq("id", c.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from(tab).update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
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

  const tabs: { key: Tab; label_bn: string; label_en: string; icon: React.ReactNode }[] = [
    { key: "customers", label_bn: "কাস্টমার", label_en: "Customer", icon: <UserRound className="h-4 w-4" /> },
    { key: "suppliers", label_bn: "সাপ্লায়ার", label_en: "Supplier", icon: <Truck className="h-4 w-4" /> },
    { key: "employees", label_bn: "কর্মচারী", label_en: "Employee", icon: <Users className="h-4 w-4" /> },
  ];

  const addBtnLabel =
    tab === "customers"
      ? lang === "bn" ? "কাস্টমার যুক্ত করুন" : "Add customer"
      : tab === "suppliers"
        ? lang === "bn" ? "সাপ্লায়ার যুক্ত করুন" : "Add supplier"
        : lang === "bn" ? "কর্মচারী যুক্ত করুন" : "Add employee";

  const handleAdd = () => {
    if (tab === "employees") {
      setOpenEmployee(true);
    } else {
      setEditing(null);
      setOpen(true);
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
        <h1 className="text-2xl font-extrabold">{lang === "bn" ? "যোগাযোগ" : "Contacts"}</h1>
        <Button onClick={handleAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {lang === "bn" ? "যুক্ত করুন" : "Add"}
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* LEFT */}
        <div className="flex flex-col rounded-xl border bg-card">
          <div className="flex border-b">
            {tabs.map((t) => {
              const active = tab === t.key;
              const n = tabBadge(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={
                    "relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition " +
                    (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t.icon}
                  <span>{lang === "bn" ? t.label_bn : t.label_en}</span>
                  {n != null && n > 0 && (
                    <span className="text-[10px] text-muted-foreground">({lang === "bn" ? bnNum(n) : n})</span>
                  )}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-foreground" />}
                </button>
              );
            })}
          </div>

          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "bn" ? "কন্ট্যাক্ট খোঁজ করুন" : "Search contacts"}
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="min-h-[260px] flex-1">
            {filtered.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title={lang === "bn" ? "কোনো কন্ট্যাক্ট নেই" : "No contacts"} />
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
              <EmptyState title={lang === "bn" ? "একজন নির্বাচন করুন" : "Select a contact"} />
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
                  {tab !== "employees" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { setEditing(selected); setOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                      {lang === "bn" ? "এডিট করুন" : "Edit"}
                    </Button>
                  )}
                  {tab === "customers" && Number(selected.due_balance) > 0 && selected.phone && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1fb558]"
                      onClick={() => setReminderOpen(true)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {lang === "bn" ? "রিমাইন্ডার" : "Remind"}
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onDelete(selected)}>
                    <Trash2 className="h-4 w-4" />
                    {lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh}>
                    <RefreshCw className="h-4 w-4" />
                    {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
                  </Button>
                </div>
              </div>

              {isContactTable ? (
                <div className="p-3">
                  {transactions.length === 0 ? (
                    <EmptyState title={lang === "bn" ? "কোনো লেনদেন নেই" : "No transactions"} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tab === "customers" ? (lang === "bn" ? "বিক্রির রিপোর্ট" : "Sale #") : (lang === "bn" ? "কেনার রিপোর্ট" : "Purchase #")}</TableHead>
                          <TableHead>{lang === "bn" ? "সময়" : "Time"}</TableHead>
                          <TableHead>{lang === "bn" ? "তথ্য" : "Info"}</TableHead>
                          <TableHead className="text-right">{lang === "bn" ? "লেনদেনের ধরন" : "Type"}</TableHead>
                          <TableHead className="text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => {
                          const isDue = Number(t.due) > 0;
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-mono text-xs">{t.invoice_no ?? t.id.slice(0, 8)}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(t.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
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
                                  {isDue ? (lang === "bn" ? "বাকি" : "Due") : (lang === "bn" ? "ক্যাশ" : "Cash")}
                                </span>
                              </TableCell>
                              <TableCell className={"text-right font-semibold " + (isDue ? "text-rose-600" : "")}>
                                {fmtMoney(Number(t.total), lang)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  {lang === "bn"
                    ? "এই কর্মচারীর এক্সেস এডিট করতে এক্সেস ম্যানেজমেন্ট পেজে যান।"
                    : "Manage this employee's access from the Access Management page."}
                </div>
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
  const { lang } = useI18n();
  const { current } = useShop();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
      setAddress(editing?.address ?? "");
    }
  }, [open, editing]);

  const save = async () => {
    if (!current) return;
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Name required"); return; }
    setBusy(true);
    // Defensive: verify the active shop exists & is accessible to this user.
    const { data: shopRow, error: shopErr } = await supabase
      .from("shops").select("id").eq("id", current.id).maybeSingle();
    if (shopErr || !shopRow) {
      setBusy(false);
      toast.error(lang === "bn"
        ? "এই দোকানে এক্সেস নেই — পেজ রিফ্রেশ করুন"
        : "Active shop not accessible — please refresh");
      return;
    }
    const payload = { name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, shop_id: current.id };
    const { error } = editing
      ? await supabase.from(table).update(payload).eq("id", editing.id)
      : await supabase.from(table).insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? (lang === "bn" ? "এডিট" : "Edit") : (lang === "bn" ? "নতুন" : "New")} —{" "}
            {table === "customers" ? (lang === "bn" ? "কাস্টমার" : "Customer") : (lang === "bn" ? "সাপ্লায়ার" : "Supplier")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নাম" : "Name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "ফোন" : "Phone"}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : lang === "bn" ? "সেভ" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ContactsPage;
