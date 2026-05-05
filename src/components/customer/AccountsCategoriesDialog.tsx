import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Archive, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ACCOUNT_KIND_LABEL, type ConsumerAccount, type ConsumerCategory } from "@/lib/consumer-finance";

export function AccountsCategoriesDialog({
  open, onOpenChange, onChanged,
}: { open: boolean; onOpenChange: (v: boolean) => void; onChanged?: () => void }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConsumerAccount[]>([]);
  const [cats, setCats] = useState<ConsumerCategory[]>([]);

  // account form
  const [aName, setAName] = useState("");
  const [aKind, setAKind] = useState<ConsumerAccount["kind"]>("cash");
  const [aOpening, setAOpening] = useState("");

  // category form
  const [cName, setCName] = useState("");
  const [cKind, setCKind] = useState<"income" | "expense">("expense");
  const [cParent, setCParent] = useState<string>("");

  const load = async () => {
    if (!user) return;
    const [a, c] = await Promise.all([
      supabase.from("consumer_accounts").select("*").eq("user_id", user.id).order("name"),
      supabase.from("consumer_categories").select("*").eq("user_id", user.id).order("kind").order("sort_order").order("name"),
    ]);
    setAccounts((a.data ?? []) as ConsumerAccount[]);
    setCats((c.data ?? []) as ConsumerCategory[]);
  };
  useEffect(() => { if (open) void load(); }, [open, user]);

  const addAccount = async () => {
    if (!user || !aName.trim()) return;
    const { error } = await supabase.from("consumer_accounts").insert({
      user_id: user.id, name: aName.trim(), kind: aKind, opening_balance: Number(aOpening) || 0,
    });
    if (error) return toast.error(error.message);
    setAName(""); setAOpening(""); setAKind("cash");
    await load(); onChanged?.();
  };

  const archiveAccount = async (id: string, archived: boolean) => {
    const { error } = await supabase.from("consumer_accounts").update({ is_archived: !archived }).eq("id", id);
    if (error) return toast.error(error.message);
    await load(); onChanged?.();
  };

  const addCat = async () => {
    if (!user || !cName.trim()) return;
    const parent = cats.find((x) => x.id === cParent);
    const { error } = await supabase.from("consumer_categories").insert({
      user_id: user.id, name: cName.trim(),
      kind: parent ? parent.kind : cKind,
      parent_id: cParent || null,
    });
    if (error) return toast.error(error.message);
    setCName(""); setCParent("");
    await load(); onChanged?.();
  };

  const archiveCat = async (id: string, archived: boolean) => {
    const { error } = await supabase.from("consumer_categories").update({ is_archived: !archived }).eq("id", id);
    if (error) return toast.error(error.message);
    await load(); onChanged?.();
  };

  const parents = cats.filter((c) => !c.parent_id && !c.is_archived);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>অ্যাকাউন্ট ও ক্যাটাগরি</DialogTitle></DialogHeader>
        <Tabs defaultValue="accounts" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounts">অ্যাকাউন্ট</TabsTrigger>
            <TabsTrigger value="cats">ক্যাটাগরি</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_120px_auto] items-end rounded-lg border p-3">
              <div>
                <label className="text-xs text-muted-foreground">নাম</label>
                <Input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="যেমন: বিকাশ" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ধরন</label>
                <Select value={aKind} onValueChange={(v) => setAKind(v as ConsumerAccount["kind"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">শুরুতে ব্যালেন্স</label>
                <Input inputMode="decimal" value={aOpening} onChange={(e) => setAOpening(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
              </div>
              <Button onClick={addAccount}><Plus className="h-4 w-4 mr-1" /> যোগ</Button>
            </div>
            <ul className="divide-y rounded-lg border">
              {accounts.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">কোনো অ্যাকাউন্ট নেই</li>}
              {accounts.map((a) => (
                <li key={a.id} className={`flex items-center gap-3 px-3 py-2 ${a.is_archived ? "opacity-50" : ""}`}>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{ACCOUNT_KIND_LABEL[a.kind] ?? a.kind}</span>
                  <span className="flex-1 text-sm font-medium">{a.name}</span>
                  <span className="text-xs text-muted-foreground">শুরু: {Number(a.opening_balance).toLocaleString("bn-BD")} ৳</span>
                  <button onClick={() => archiveAccount(a.id, a.is_archived)} className="rounded p-1 text-muted-foreground hover:bg-accent" title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="cats" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_180px_auto] items-end rounded-lg border p-3">
              <div>
                <label className="text-xs text-muted-foreground">নাম</label>
                <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="যেমন: রেস্টুরেন্ট" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ধরন</label>
                <Select value={cKind} onValueChange={(v) => setCKind(v as "income" | "expense")} disabled={!!cParent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">আয়</SelectItem>
                    <SelectItem value="expense">ব্যয়</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">প্যারেন্ট (ঐচ্ছিক)</label>
                <Select value={cParent || "__none__"} onValueChange={(v) => setCParent(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="নেই" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">নেই (টপ-লেভেল)</SelectItem>
                    {parents.filter((p) => p.kind === cKind).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addCat}><Plus className="h-4 w-4 mr-1" /> যোগ</Button>
            </div>

            {(["expense", "income"] as const).map((kind) => (
              <div key={kind} className="rounded-lg border">
                <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold">
                  {kind === "income" ? "আয়" : "ব্যয়"}
                </div>
                <ul className="divide-y">
                  {parents.filter((p) => p.kind === kind).map((p) => (
                    <li key={p.id}>
                      <div className={`flex items-center gap-2 px-3 py-2 ${p.is_archived ? "opacity-50" : ""}`}>
                        <span className="flex-1 text-sm font-medium">{p.name}</span>
                        <button onClick={() => archiveCat(p.id, p.is_archived)} className="rounded p-1 text-muted-foreground hover:bg-accent">
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {childrenOf(p.id).map((sub) => (
                        <div key={sub.id} className={`flex items-center gap-2 px-3 py-1.5 pl-8 text-sm ${sub.is_archived ? "opacity-50" : ""}`}>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="flex-1">{sub.name}</span>
                          <button onClick={() => archiveCat(sub.id, sub.is_archived)} className="rounded p-1 text-muted-foreground hover:bg-accent">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </li>
                  ))}
                  {parents.filter((p) => p.kind === kind).length === 0 && (
                    <li className="p-3 text-center text-xs text-muted-foreground">কিছু নেই</li>
                  )}
                </ul>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}