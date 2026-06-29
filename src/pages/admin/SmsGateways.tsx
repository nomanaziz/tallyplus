import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Mail,
  CheckCircle2,
  Hourglass,
  XCircle,
  CheckCircle,
  MessageSquare,
  User,
  KeyRound,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";

// ============================================================
// Provider options shown in the SMS Settings dropdown
// ============================================================
type ProviderOption = {
  key: string;            // unique key e.g. "reve:masking"
  label: string;          // shown in dropdown + as display_name
  provider: "reve" | "whatsapp" | "telegram";
  masking: "masking" | "non-masking";
  comingSoon?: boolean;
};

const PROVIDER_OPTIONS: ProviderOption[] = [
  { key: "reve:masking", label: "REVE SMS (Masking)", provider: "reve", masking: "masking" },
  { key: "reve:non-masking", label: "REVE SMS (Non-masking)", provider: "reve", masking: "non-masking" },
  { key: "whatsapp:non-masking", label: "WhatsApp (coming soon)", provider: "whatsapp", masking: "non-masking", comingSoon: true },
  { key: "telegram:non-masking", label: "Telegram (coming soon)", provider: "telegram", masking: "non-masking", comingSoon: true },
];

function defaultBaseUrl(provider: string) {
  if (provider === "reve") return "http://smpp.revesms.com:7788";
  return "";
}

type Gateway = {
  id: string;
  provider: string;
  display_name: string;
  is_active: boolean;
  is_primary: boolean;
  sort_order: number;
  config: Record<string, any>;
};
type Pkg = { id: string; name_bn: string; name_en: string; sms_count: number; price_bdt: number; is_active: boolean; sort_order: number };
type Template = { id: string; code: string; name_bn: string; name_en: string; body_template: string; is_active: boolean; sort_order: number };
type SmsRequest = {
  id: string;
  shop_id: string;
  sms_count: number;
  amount_bdt: number;
  payment_status: string;
  payment_method: string | null;
  txn_id: string | null;
  admin_note: string | null;
  created_at: string;
  shops?: { name: string | null } | null;
  sms_packages?: { name_bn: string | null; name_en: string | null } | null;
};

// ============================================================
// Stat card
// ============================================================
function StatCard({
  color, icon: Icon, label, value, footer,
}: { color: string; icon: any; label: string; value: string | number; footer: string }) {
  return (
    <div className={`rounded-md text-white shadow-sm ${color}`}>
      <div className="flex items-center gap-4 p-5">
        <Icon className="h-12 w-12 opacity-90" strokeWidth={1.5} />
        <div className="min-w-0">
          <div className="text-sm font-medium opacity-90">{label}</div>
          <div className="text-3xl font-extrabold leading-tight">{value}</div>
        </div>
      </div>
      <div className="border-t border-white/20 px-4 py-1.5 text-center text-[11px] font-medium opacity-90">
        {footer}
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================
export default function AdminSmsGateways() {
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({ balance: 0, today: 0, month: 0, failed: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsMeta, setStatsMeta] = useState<{ source?: string; provider_error?: string | null; gateway_configured?: boolean } | null>(null);

  // Gateways (full list, but only the primary/selected one is edited inline)
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [providerKey, setProviderKey] = useState<string>("reve:non-masking");
  const [sender, setSender] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test SMS
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string>("");
  const [statusChecking, setStatusChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<string>("");

  const sendTestSms = async () => {
    if (!testPhone.trim()) { toast.error("Mobile number দিন (country code সহ)"); return; }
    setTesting(true); setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-test-sms", {
        body: { phone: testPhone.trim(), message: testMsg.trim() || undefined },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Test SMS sent → ${data.phone}`);
        setTestResult({ ok: true, text: `Sent to ${data.phone} from ${data.sender}. Provider: ${data.provider_response ?? ""}` });
        if (data.provider_id) setLastMessageId(String(data.provider_id));
        setStatusResult("");
      } else {
        const msg = data?.error || data?.provider_response || "Unknown error";
        toast.error(`Failed: ${msg}`);
        setTestResult({ ok: false, text: typeof msg === "string" ? msg : JSON.stringify(msg) });
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg);
      setTestResult({ ok: false, text: msg });
    } finally { setTesting(false); }
  };

  const checkStatus = async () => {
    if (!lastMessageId.trim()) { toast.error("Message ID দিন"); return; }
    setStatusChecking(true); setStatusResult("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-sms-status", {
        body: { message_id: lastMessageId.trim() },
      });
      if (error) throw error;
      setStatusResult(data?.provider_response ?? JSON.stringify(data));
    } catch (e) {
      setStatusResult((e as Error).message);
    } finally { setStatusChecking(false); }
  };

  // Secondary tabs
  const [tab, setTab] = useState<"gateway" | "requests" | "packages" | "templates">("gateway");

  // Packages & Templates
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [editingPkg, setEditingPkg] = useState<(Omit<Pkg, "id"> & { id?: string }) | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTpl, setEditingTpl] = useState<(Omit<Template, "id"> & { id?: string }) | null>(null);
  const [smsRequests, setSmsRequests] = useState<SmsRequest[]>([]);
  const [requestBusy, setRequestBusy] = useState<string | null>(null);
  const [pkgSearch, setPkgSearch] = useState("");
  const [tplSearch, setTplSearch] = useState("");
  const filteredPackages = useMemo(
    () => packages.filter((p) => matches(pkgSearch, p.name_bn, p.name_en, String(p.sms_count), String(p.price_bdt))),
    [packages, pkgSearch],
  );
  const filteredTemplates = useMemo(
    () => templates.filter((t) => matches(tplSearch, t.name_bn, t.code, t.body_template)),
    [templates, tplSearch],
  );

  // ========== Load ==========
  const loadAll = async () => {
    setLoading(true);
    const [
      { data: g },
      { data: p },
      { data: t },
      { data: r },
    ] = await Promise.all([
      supabase.from("sms_gateways").select("*").order("sort_order").order("created_at"),
      supabase.from("sms_packages").select("*").order("sort_order").order("sms_count"),
      supabase.from("sms_templates").select("*").order("sort_order").order("code"),
      supabase.from("sms_purchase_requests").select("*, shops(name), sms_packages(name_bn, name_en)").order("created_at", { ascending: false }).limit(50),
    ]);

    const gws = (g as Gateway[]) ?? [];
    setGateways(gws);
    setPackages((p as Pkg[]) ?? []);
    setTemplates((t as Template[]) ?? []);
    setSmsRequests((r as SmsRequest[]) ?? []);

    // Pick primary gateway as the inline-form value
    const primary =
      gws.find((x) => x.is_primary && x.is_active) ||
      gws.find((x) => x.is_active) ||
      gws[0];
    if (primary) {
      const masking = (primary.config?.masking as string) === "masking" ? "masking" : "non-masking";
      const key = `${primary.provider}:${masking}`;
      setProviderKey(PROVIDER_OPTIONS.find((o) => o.key === key)?.key ?? "reve:non-masking");
      setSender(primary.config?.sender_id ?? "");
      setUserName(primary.config?.api_key ?? primary.config?.username ?? "");
      setPassword(primary.config?.secret_key ?? primary.config?.password ?? "");
      setClientId(primary.config?.client_id ?? "");
      setActive(primary.is_active);
    }
    setLoading(false);
    // Fetch live stats (REVE balance + local usage)
    refreshStats();
  };
  useEffect(() => { loadAll(); }, []);

  const refreshStats = async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-gateway-stats", { body: {} });
      if (error) throw error;
      setStats({
        balance: Number(data?.balance ?? 0),
        today: Number(data?.today ?? 0),
        month: Number(data?.month ?? 0),
        failed: Number(data?.failed ?? 0),
      });
      setStatsMeta({
        source: data?.source,
        provider_error: data?.provider_error,
        gateway_configured: data?.gateway_configured,
      });
    } catch (e) {
      setStatsMeta({ source: "local", provider_error: (e as Error).message });
    } finally {
      setStatsLoading(false);
    }
  };

  // ========== Save settings (single primary gateway) ==========
  const opt = useMemo(() => PROVIDER_OPTIONS.find((o) => o.key === providerKey)!, [providerKey]);

  const saveSettings = async () => {
    if (opt.comingSoon) {
      toast.error(`${opt.label} এখনো support করা হচ্ছে না`);
      return;
    }
    setSaving(true);
    try {
      // Find existing row for this provider+masking, or create new
      const existing = gateways.find(
        (g) => g.provider === opt.provider && (g.config?.masking ?? "non-masking") === opt.masking
      );
      const config = {
        base_url: existing?.config?.base_url || defaultBaseUrl(opt.provider),
        sender_id: sender.trim(),
        masking: opt.masking,
        // Mirror creds in both shapes so REVE works either way
        api_key: userName.trim(),
        secret_key: password,
        username: userName.trim(),
        password,
        client_id: clientId.trim(),
      };
      const payload = {
        provider: opt.provider,
        display_name: opt.label,
        is_active: active,
        is_primary: true,
        sort_order: 0,
        config,
      };
      let err;
      if (existing) {
        ({ error: err } = await supabase.from("sms_gateways").update(payload).eq("id", existing.id));
      } else {
        ({ error: err } = await supabase.from("sms_gateways").insert(payload));
      }
      if (err) throw err;

      // Demote others from primary
      const otherIds = gateways.filter((g) => g.id !== existing?.id).map((g) => g.id);
      if (otherIds.length) {
        await supabase.from("sms_gateways").update({ is_primary: false }).in("id", otherIds);
      }

      toast.success("Company information updated");
      loadAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSmsRequest = async (requestId: string, action: "approve" | "reject") => {
    setRequestBusy(`${action}:${requestId}`);
    try {
      const { data, error } = await supabase.functions.invoke("admin-approve-sms-purchase", {
        body: { request_id: requestId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(action === "approve" ? "SMS balance credited" : "SMS request rejected");
      await loadAll();
      await refreshStats();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRequestBusy(null);
    }
  };

  // ========== Packages ==========
  const savePkg = async () => {
    if (!editingPkg) return;
    let err;
    if (editingPkg.id) {
      const { id, ...rest } = editingPkg;
      ({ error: err } = await supabase.from("sms_packages").update(rest).eq("id", id!));
    } else {
      ({ error: err } = await supabase.from("sms_packages").insert(editingPkg));
    }
    if (err) { toast.error(err.message); return; }
    toast.success("Saved"); setEditingPkg(null); loadAll();
  };
  const delPkg = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("sms_packages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadAll();
  };

  // ========== Templates ==========
  const saveTpl = async () => {
    if (!editingTpl) return;
    let err;
    if (editingTpl.id) {
      const { id, ...rest } = editingTpl;
      ({ error: err } = await supabase.from("sms_templates").update(rest).eq("id", id!));
    } else {
      ({ error: err } = await supabase.from("sms_templates").insert(editingTpl));
    }
    if (err) { toast.error(err.message); return; }
    toast.success("Saved"); setEditingTpl(null); loadAll();
  };

  if (loading)
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-full bg-muted/30">
      {/* Breadcrumb header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-5 w-5 text-sky-600" />
          <span className="text-base font-bold text-sky-700">SMS Service</span>
          <span className="text-xs text-muted-foreground">SMS Gateway Setup</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" /> SMS Service
          <span className="mx-1">›</span>
          SMS Gateway Setup
        </div>
      </div>

      <div className="container max-w-7xl px-3 py-4 sm:px-4">
        {/* ============== Stat cards ============== */}
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {statsLoading ? "Live data refresh হচ্ছে..." : (
              statsMeta?.source === "reve" || statsMeta?.source === "mixed"
                ? <span className="text-emerald-600">● Live REVE balance</span>
                : <span className="text-amber-600">● App local records</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={refreshStats} disabled={statsLoading} className="h-8 gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard color="bg-emerald-500" icon={Mail} label="SMS Balance" value={stats.balance.toLocaleString()} footer="Total SMS Remaining Balance" />
          <StatCard color="bg-sky-500" icon={CheckCircle2} label="Todays Send" value={stats.today.toLocaleString()} footer="Total SMS Send Today" />
          <StatCard color="bg-amber-500" icon={Hourglass} label="This Month Send" value={stats.month.toLocaleString()} footer="Total SMS Send in This Month" />
          <StatCard color="bg-rose-500" icon={XCircle} label="This Month Failed" value={stats.failed.toLocaleString()} footer="Total SMS Sending failed in This Month" />
        </div>
        {statsMeta?.provider_error && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <strong>Live API issue:</strong> {statsMeta.provider_error}
              <div className="opacity-75">Balance card local DB থেকে দেখাচ্ছে। API key/secret check করুন বা Edge Function logs দেখুন।</div>
            </div>
          </div>
        )}

        {/* ============== Secondary tabs ============== */}
        <div className="mt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="gateway">Gateway Setup</TabsTrigger>
              <TabsTrigger value="requests">SMS Requests</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            {/* ===== Gateway Setup form ===== */}
            <TabsContent value="gateway" className="mt-3">
              <div className="overflow-hidden rounded-md border bg-background shadow-sm">
                <div className="flex items-center gap-2 bg-slate-700 px-4 py-3 text-white">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-semibold">SMS Settings</span>
                </div>
                <div className="p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sms Provider</Label>
                      <div className="relative">
                        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Select value={providerKey} onValueChange={setProviderKey}>
                          <SelectTrigger className="h-11 pl-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PROVIDER_OPTIONS.map((o) => (
                              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SMS User Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-11 pl-9" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="API key or Username" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SMS Sender</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-11 pl-9" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="e.g. nomask_GalaxyNet or 8809612xxxxx" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SMS Password</Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" className="h-11 pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Secret key or Password" />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">REVE Client ID (balance এর জন্য)</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-11 pl-9" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="REVE portal এর client ID" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        REVE balance API: <code>smsClientBalance.jsp?client=CLIENT_ID</code> — এই ID টা REVE portal থেকে নিন।
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={active} onCheckedChange={setActive} />
                      <Label className="text-sm">Active</Label>
                    </div>
                    <Button
                      onClick={saveSettings}
                      disabled={saving || opt.comingSoon}
                      className="h-11 gap-2 bg-slate-700 px-5 text-white hover:bg-slate-800"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Update Company Information
                    </Button>
                  </div>

                  {opt.comingSoon && (
                    <div className="mt-3 rounded-md border bg-amber-50 p-3 text-xs text-amber-800">
                      {opt.label} — এখনো support করা হচ্ছে না, শীঘ্রই আসছে।
                    </div>
                  )}
                </div>
              </div>

              {/* ===== Test SMS panel ===== */}
              <div className="mt-4 overflow-hidden rounded-md border bg-background shadow-sm">
                <div className="flex items-center gap-2 bg-emerald-700 px-4 py-3 text-white">
                  <Send className="h-4 w-4" />
                  <span className="text-sm font-semibold">Test SMS — নিজের নম্বরে পাঠিয়ে যাচাই করুন</span>
                </div>
                <div className="space-y-3 p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Mobile number (country code সহ)
                      </Label>
                      <Input
                        className="h-11"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="e.g. 8801712345678"
                        inputMode="tel"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Bangladesh: 88 + 11-digit। শুধু 01XXXXXXXXX দিলেও auto-prefix হবে।
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Message (optional)
                      </Label>
                      <Input
                        className="h-11"
                        value={testMsg}
                        onChange={(e) => setTestMsg(e.target.value)}
                        placeholder="খালি রাখলে default test message যাবে"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      Primary active gateway ({opt.label}) ব্যবহার করে পাঠানো হবে।
                    </div>
                    <Button
                      onClick={sendTestSms}
                      disabled={testing}
                      className="h-11 gap-2 bg-emerald-600 px-5 text-white hover:bg-emerald-700"
                    >
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Test SMS
                    </Button>
                  </div>
                  {testResult && (
                    <div className={`rounded-md border p-3 text-xs ${testResult.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-rose-300 bg-rose-50 text-rose-800"}`}>
                      <strong>{testResult.ok ? "Success:" : "Failed:"}</strong>{" "}
                      <span className="break-all">{testResult.text}</span>
                    </div>
                  )}

                  {/* ===== Check Delivery Status ===== */}
                  <div className="rounded-md border bg-muted/30 p-3">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Check Delivery Status (REVE getstatus)
                    </Label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        className="h-10 flex-1 min-w-[180px]"
                        value={lastMessageId}
                        onChange={(e) => setLastMessageId(e.target.value)}
                        placeholder="Message ID (test পাঠালে auto-fill হবে)"
                      />
                      <Button
                        onClick={checkStatus}
                        disabled={statusChecking || !lastMessageId.trim()}
                        variant="outline"
                        className="h-10 gap-2"
                      >
                        {statusChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Check Status
                      </Button>
                    </div>
                    {statusResult && (
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 text-[11px]">
{statusResult}
                      </pre>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      DELIVRD = পৌঁছেছে · ACCEPTD/ENROUTE = queue-এ · REJECTD/UNDELIV = fail (sender ID বা route issue)
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== SMS purchase requests ===== */}
            <TabsContent value="requests" className="mt-3 space-y-3">
              <div className="rounded-xl border bg-background">
                {smsRequests.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No SMS purchase requests yet.</div>
                ) : smsRequests.map((r) => {
                  const busyApprove = requestBusy === `approve:${r.id}`;
                  const busyReject = requestBusy === `reject:${r.id}`;
                  const isPending = r.payment_status === "pending";
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{r.shops?.name ?? "Shop"}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.payment_status}</span>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-BD")}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {(r.sms_packages?.name_bn || r.sms_packages?.name_en || "SMS Package")} • {Number(r.sms_count).toLocaleString()} SMS • ৳{Number(r.amount_bdt).toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Method: {r.payment_method ?? "—"} {r.txn_id ? `• TXN: ${r.txn_id}` : ""} {r.admin_note ? `• ${r.admin_note}` : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={!isPending || !!requestBusy}
                        onClick={() => handleSmsRequest(r.id, "approve")}
                      >
                        {busyApprove ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-rose-600"
                        disabled={!isPending || !!requestBusy}
                        onClick={() => handleSmsRequest(r.id, "reject")}
                      >
                        {busyReject ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Reject
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ===== Packages ===== */}
            <TabsContent value="packages" className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminSearchBar value={pkgSearch} onChange={setPkgSearch} count={filteredPackages.length} placeholder="Package name" />
                <Button onClick={() => setEditingPkg({ name_bn: "", name_en: "", sms_count: 100, price_bdt: 100, is_active: true, sort_order: 0 })} className="gap-1">
                  <Plus className="h-4 w-4" /> Add Package
                </Button>
              </div>
              <div className="rounded-xl border bg-background">
                {filteredPackages.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">{pkgSearch ? "কোনো ফলাফল নেই" : "No packages yet."}</div>
                ) : filteredPackages.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{p.name_bn} <span className="text-xs text-muted-foreground">({p.name_en})</span></div>
                      <div className="text-sm text-muted-foreground">{p.sms_count} SMS • ৳{p.price_bdt}{!p.is_active && <span className="ml-2 rounded bg-rose-100 px-1.5 text-xs text-rose-700">Disabled</span>}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditingPkg(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => delPkg(p.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ===== Templates ===== */}
            <TabsContent value="templates" className="mt-3 space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Placeholders: <code>{"{name}"}</code>, <code>{"{amount}"}</code>, <code>{"{due}"}</code>. Shop signature is appended automatically.
              </div>
              <AdminSearchBar value={tplSearch} onChange={setTplSearch} count={filteredTemplates.length} placeholder="Template name বা code" />
              <div className="rounded-xl border bg-background">
                {filteredTemplates.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">{tplSearch ? "কোনো ফলাফল নেই" : "No templates"}</div>
                ) : filteredTemplates.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-start gap-3 border-b p-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{t.name_bn} <span className="text-xs text-muted-foreground">({t.code})</span></div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.body_template}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditingTpl(t)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Package dialog */}
      <Dialog open={!!editingPkg} onOpenChange={(o) => !o && setEditingPkg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingPkg?.id ? "Edit" : "Add"} Package</DialogTitle></DialogHeader>
          {editingPkg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name (Bangla)</Label><Input value={editingPkg.name_bn} onChange={(e) => setEditingPkg({ ...editingPkg, name_bn: e.target.value })} /></div>
                <div><Label>Name (English)</Label><Input value={editingPkg.name_en} onChange={(e) => setEditingPkg({ ...editingPkg, name_en: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>SMS Count</Label><Input type="number" min={1} value={editingPkg.sms_count} onChange={(e) => setEditingPkg({ ...editingPkg, sms_count: Number(e.target.value) })} /></div>
                <div><Label>Price (৳)</Label><Input type="number" min={0} step="0.01" value={editingPkg.price_bdt} onChange={(e) => setEditingPkg({ ...editingPkg, price_bdt: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editingPkg.is_active} onCheckedChange={(v) => setEditingPkg({ ...editingPkg, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPkg(null)}>Cancel</Button>
            <Button onClick={savePkg} className="gap-1"><Save className="h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template dialog */}
      <Dialog open={!!editingTpl} onOpenChange={(o) => !o && setEditingTpl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          {editingTpl && (
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={editingTpl.code} disabled /></div>
              <div><Label>Name (Bangla)</Label><Input value={editingTpl.name_bn} onChange={(e) => setEditingTpl({ ...editingTpl, name_bn: e.target.value })} /></div>
              <div><Label>Body</Label><Textarea rows={4} value={editingTpl.body_template} onChange={(e) => setEditingTpl({ ...editingTpl, body_template: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editingTpl.is_active} onCheckedChange={(v) => setEditingTpl({ ...editingTpl, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTpl(null)}>Cancel</Button>
            <Button onClick={saveTpl} className="gap-1"><Save className="h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}