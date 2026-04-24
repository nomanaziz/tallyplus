import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2, UserRound, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { contactsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Tab = "customers" | "suppliers";
type Contact = { id: string; name: string; phone: string | null; address: string | null; due_balance: number };

export const Route = createFileRoute("/app/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("customers");
  const { data: raw = [], refetch } = useQuery(contactsQuery(current?.id ?? null, tab));
  const contacts = raw as unknown as Contact[];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)) : contacts;
  }, [contacts, search]);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["contacts"] }); await refetch(); };

  const onDelete = async (c: Contact) => {
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete?")) return;
    const { error } = await supabase.from(tab).update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
    void refresh();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Contacts</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "যোগাযোগ" : "Contacts"}</h1>
        <Button className="h-10 gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          {lang === "bn" ? "নতুন" : "New"}
        </Button>
      </div>

      <div className="mt-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="customers" className="gap-2"><UserRound className="h-4 w-4" />{lang === "bn" ? "কাস্টমার" : "Customers"}</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2"><Truck className="h-4 w-4" />{lang === "bn" ? "সাপ্লায়ার" : "Suppliers"}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-3">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={refresh} placeholder={lang === "bn" ? "নাম/ফোন" : "Name / phone"} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<UserRound className="h-6 w-6" />} title={lang === "bn" ? "কোনো কন্ট্যাক্ট নেই" : "No contacts"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "নাম" : "Name"}</TableHead>
                <TableHead>{lang === "bn" ? "ফোন" : "Phone"}</TableHead>
                <TableHead>{lang === "bn" ? "ঠিকানা" : "Address"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "বাকি" : "Due"}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.address ?? "—"}</TableCell>
                  <TableCell className={`text-right font-semibold ${Number(c.due_balance) > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                    {fmtMoney(Number(c.due_balance), lang)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(c); setOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" /> {lang === "bn" ? "এডিট" : "Edit"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(c)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {lang === "bn" ? "ডিলিট" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ContactDialog open={open} onOpenChange={setOpen} editing={editing} table={tab} onSaved={refresh} />
    </div>
  );
}

function ContactDialog({ open, onOpenChange, editing, table, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Contact | null; table: Tab; onSaved: () => void }) {
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
          <DialogTitle>{editing ? (lang === "bn" ? "এডিট" : "Edit") : (lang === "bn" ? "নতুন" : "New")} — {table === "customers" ? (lang === "bn" ? "কাস্টমার" : "Customer") : (lang === "bn" ? "সাপ্লায়ার" : "Supplier")}</DialogTitle>
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
