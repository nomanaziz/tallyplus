import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Copy, Plus, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, bnNum } from "@/lib/i18n";
import { shopMembersQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/EmptyState";
import { toast } from "sonner";

type Member = {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  is_owner: boolean;
};

const FEATURE_GROUPS_BN: { title: string; items: string[] }[] = [
  { title: "কেনা", items: ["কেনা", "কার্ট এডিট", "ডিসকাউন্ট", "ডেলিভারী চার্জ", "কেনার খাতা", "এডিট করুন", "মুছে ফেলুন"] },
  { title: "বিক্রি", items: ["বিক্রি", "দ্রুত বিক্রি", "কার্ট এডিট", "ডিসকাউন্ট", "ডেলিভারী চার্জ", "বিক্রির খাতা", "এডিট করুন", "মুছে ফেলুন"] },
  { title: "বাকি", items: ["বাকি", "বাকির ইতিহাস", "বাকির বিস্তারিত", "যোগ করুন", "এডিট করুন", "মুছে ফেলুন"] },
  { title: "খরচ", items: ["খরচ", "খরচের তালিকা", "এডিট করুন", "মুছে ফেলুন", "যোগ করুন", "ক্যাটাগরি এডিট", "ক্যাটাগরি ডিলিট", "ক্যাটাগরি যোগ"] },
  { title: "যোগাযোগ", items: ["যোগাযোগ", "কাস্টমার", "সাপ্লায়ার", "কাস্টমার যোগ করা", "সাপ্লায়ার যোগ করা", "কাস্টমার এডিট", "কাস্টমার ডিলিট", "সাপ্লায়ার এডিট", "সাপ্লায়ার ডিলিট"] },
  { title: "প্রোডাক্ট লিস্ট", items: ["প্রোডাক্ট লিস্ট", "যোগ করুন", "বিস্তারিত", "এডিট করুন", "মুছে ফেলুন"] },
  { title: "স্টকের হিসাব", items: ["ইতিহাস", "আপডেট", "স্টকের হিসাব"] },
  { title: "ব্যবসার রিপোর্ট", items: ["ব্যবসার রিপোর্ট"] },
  { title: "অনলাইন শপ", items: ["অনলাইন শপ", "ম্যাসেজ", "স্টোর সেটিংস", "অনলাইন প্রোডাক্ট", "অর্ডার লিস্ট", "অর্ডারের বিস্তারিত", "থিম সেটিংস", "ডেলিভারি মাধ্যম"] },
  { title: "সেটিংস", items: ["বিকাশ/নগদ কিউআর", "রিসাইকেল বিন"] },
];

const FEATURE_GROUPS_EN: { title: string; items: string[] }[] = [
  { title: "Purchase", items: ["Purchase", "Cart edit", "Discount", "Delivery", "Ledger", "Edit", "Delete"] },
  { title: "Sell", items: ["Sell", "Quick sell", "Cart edit", "Discount", "Delivery", "Ledger", "Edit", "Delete"] },
  { title: "Due", items: ["Due", "History", "Details", "Add", "Edit", "Delete"] },
  { title: "Expense", items: ["Expense", "List", "Edit", "Delete", "Add", "Category edit", "Category delete", "Category add"] },
  { title: "Contacts", items: ["Contacts", "Customers", "Suppliers", "Add customer", "Add supplier", "Edit customer", "Delete customer", "Edit supplier", "Delete supplier"] },
  { title: "Products", items: ["Products", "Add", "Details", "Edit", "Delete"] },
  { title: "Stock", items: ["History", "Update", "Stock"] },
  { title: "Report", items: ["Business report"] },
  { title: "Online shop", items: ["Online shop", "Messages", "Store settings", "Products", "Orders", "Order details", "Theme", "Delivery"] },
  { title: "Settings", items: ["bKash/Nagad QR", "Recycle bin"] },
];

export const Route = createFileRoute("/app/access")({
  component: AccessPage,
});

function AccessPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: raw } = useQuery(shopMembersQuery(current?.id ?? null));
  const members: Member[] = useMemo(() => {
    if (!raw) return [];
    const list: Member[] = [];
    if (raw.ownerId) {
      const p = raw.profiles[raw.ownerId];
      list.push({
        id: "owner",
        user_id: raw.ownerId,
        role: "owner",
        full_name: p?.full_name ?? current?.name ?? null,
        phone: p?.phone ?? null,
        is_owner: true,
      });
    }
    for (const r of raw.rows) {
      if (r.user_id === raw.ownerId) continue;
      const p = raw.profiles[r.user_id];
      list.push({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        is_owner: false,
      });
    }
    return list;
  }, [raw, current?.name]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const groups = lang === "bn" ? FEATURE_GROUPS_BN : FEATURE_GROUPS_EN;

  const load = async () => {
    await qc.invalidateQueries({ queryKey: ["shop", "members", current?.id] });
  };

  useEffect(() => {
    setSelected((prev) => prev ?? members[0] ?? null);
  }, [members]);

  const initials = (name: string | null) =>
    (name || "U").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";

  const addMember = async () => {
    if (!current || !phone.trim()) return;
    setBusy(true);
    // Look up profile by phone
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone.trim())
      .maybeSingle();
    if (!prof) {
      setBusy(false);
      toast.error(lang === "bn" ? "এই ফোনে কোনো ইউজার নেই" : "No user with this phone");
      return;
    }
    const { error } = await supabase
      .from("shop_members")
      .insert({ shop_id: current.id, user_id: prof.id, role: "cashier" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "এক্সেস দেওয়া হয়েছে" : "Access granted");
    setOpenAdd(false);
    setPhone("");
    void load();
  };

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "এক্সেস ম্যানেজমেন্ট" : "Access Management"}</h1>

      <div className="mt-4 grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Left: members list */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold">
            <span>{lang === "bn" ? `এক্সেস পদবী (${bnNum(members.length)}) টি` : `Roles (${members.length})`}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {members.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title={lang === "bn" ? "এখনো কেউ নেই" : "No members yet"} />
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={
                    "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition " +
                    (selected?.id === m.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent")
                  }
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initials(m.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{m.full_name ?? (lang === "bn" ? "অজানা" : "Unknown")}</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        {m.is_owner ? "OWNER" : m.role}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.phone ?? "—"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="border-t p-3">
            <Button className="h-11 w-full gap-2 bg-foreground text-background hover:bg-foreground/90" onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4" />
              {lang === "bn" ? "নতুন ইউজারকে এক্সেস দিন" : "Grant new access"}
            </Button>
          </div>
        </div>

        {/* Right: details */}
        <div className="rounded-xl border bg-card p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initials(selected.full_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{selected.full_name ?? "—"}</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        {selected.is_owner ? "OWNER" : selected.role}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.phone ?? "—"}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{lang === "bn" ? "অ্যাপ এর লিংক পাঠান" : "Send app link"}</div>
                    <div className="text-xs text-muted-foreground">{lang === "bn" ? "ইউজারের মোবাইল নাম্বার দিয়ে লগ ইন করলে অ্যাপ এর পাবে" : "User can log in with their phone"}</div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { void navigator.clipboard.writeText(inviteLink); toast.success(lang === "bn" ? "কপি হয়েছে" : "Copied"); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold">{lang === "bn" ? "যেসব ফিচারে এক্সেস পাবে" : "Feature access"}</div>
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div key={g.title}>
                      <div className="mb-1.5 text-xs font-bold text-muted-foreground">{g.title}</div>
                      <div className="flex flex-wrap gap-2">
                        {g.items.map((it) => (
                          <label
                            key={it}
                            className="inline-flex items-center gap-1.5 rounded border bg-emerald-50 px-2 py-1 text-xs text-emerald-900"
                          >
                            <Checkbox defaultChecked className="h-3.5 w-3.5" />
                            <span>{it}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState title={lang === "bn" ? "একজন সদস্য নির্বাচন করুন" : "Select a member"} />
          )}
        </div>
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "নতুন ইউজারকে এক্সেস দিন" : "Grant access"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ফোন নাম্বার" : "Phone"}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              <p className="text-xs text-muted-foreground">
                {lang === "bn" ? "ইউজারটি আগে অ্যাপে রেজিস্টার করা থাকতে হবে।" : "User must already be registered."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenAdd(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
            <Button onClick={addMember} disabled={busy || !phone.trim()}>{busy ? "..." : (lang === "bn" ? "এক্সেস দিন" : "Grant")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}