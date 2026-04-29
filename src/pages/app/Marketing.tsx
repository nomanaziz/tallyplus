import { useNavigate } from "@/lib/router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  X,
  History,
  Phone,
  MessageSquareText,
  Send,
  Plus,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/PageHeader";
import { toast } from "sonner";



type ContactTab = "customer" | "supplier" | "employee";

type Contact = { id: string; name: string; phone: string | null };

const SMS_PER_SEGMENT = 160;

function MarketingPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [tab, setTab] = useState<ContactTab>("customer");
  const [q, setQ] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const minuteBalance = 3;
  const smsBalance = 30;

  const signature = current?.name && current?.phone ? `\n- ${current.name}(${current.phone})` : "";
  const fullMessage = (message || "") + signature;
  const charCount = fullMessage.length;
  const smsCount = Math.max(1, Math.ceil(charCount / SMS_PER_SEGMENT));

  const { data: contacts = [], isFetching, refetch } = useQuery({
    queryKey: ["marketing", "contacts", tab, current?.id],
    enabled: !!current?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Contact[]> => {
      if (!current?.id) return [];
      if (tab === "customer") {
        const { data, error } = await supabase
          .from("customers")
          .select("id,name,phone")
          .eq("shop_id", current.id)
          .is("deleted_at", null)
          .order("name");
        if (error) throw error;
        return (data ?? []) as Contact[];
      }
      if (tab === "supplier") {
        const { data, error } = await supabase
          .from("suppliers")
          .select("id,name,phone")
          .eq("shop_id", current.id)
          .is("deleted_at", null)
          .order("name");
        if (error) throw error;
        return (data ?? []) as Contact[];
      }
      const { data, error } = await supabase
        .from("shop_members")
        .select("id,full_name,user_id")
        .eq("shop_id", current.id);
      if (error) throw error;
      // Look up phones from profiles for members.
      const userIds = (data ?? []).map((m: { user_id: string }) => m.user_id);
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,phone,full_name")
        .in("id", userIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((m: { id: string; full_name: string | null; user_id: string }) => ({
        id: m.id,
        name: m.full_name || byId.get(m.user_id)?.full_name || "Member",
        phone: byId.get(m.user_id)?.phone ?? null,
      }));
    },
  });

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return contacts.filter((c) => !ql || c.name.toLowerCase().includes(ql) || (c.phone ?? "").includes(ql));
  }, [contacts, q]);

  const normalizePhone = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("01")) return digits;
    if (digits.length === 13 && digits.startsWith("8801")) return digits.slice(2);
    return null;
  };

  const addRecipient = (phoneRaw: string | null | undefined) => {
    if (!phoneRaw) {
      toast.error(lang === "bn" ? "ফোন নম্বর নেই" : "No phone number");
      return;
    }
    const norm = normalizePhone(phoneRaw);
    if (!norm) {
      toast.error(lang === "bn" ? "সঠিক BD নম্বর দিন (11 digit)" : "Enter a valid BD number");
      return;
    }
    setRecipients((prev) => (prev.includes(norm) ? prev : [...prev, norm]));
  };

  const addManualPhone = () => {
    const norm = normalizePhone(phoneInput);
    if (!norm) {
      toast.error(lang === "bn" ? "সঠিক 11 digit নম্বর দিন" : "Enter valid 11-digit number");
      return;
    }
    setRecipients((prev) => (prev.includes(norm) ? prev : [...prev, norm]));
    setPhoneInput("");
  };

  const removeRecipient = (p: string) => setRecipients((prev) => prev.filter((x) => x !== p));

  const selectAll = () => {
    const phones = filtered
      .map((c) => normalizePhone(c.phone ?? ""))
      .filter((x): x is string => !!x);
    const uniq = Array.from(new Set([...recipients, ...phones]));
    setRecipients(uniq);
    toast.success(
      lang === "bn" ? `${phones.length}টি নম্বর যোগ হয়েছে` : `${phones.length} numbers added`,
    );
  };

  const sendSms = () => {
    if (recipients.length === 0) {
      toast.error(lang === "bn" ? "কোনো প্রাপক নেই" : "No recipients");
      return;
    }
    if (!message.trim()) {
      toast.error(lang === "bn" ? "বার্তা লিখুন" : "Type a message");
      return;
    }
    if (smsCount > smsBalance) {
      toast.error(
        lang === "bn"
          ? "SMS balance কম। কিনুন → Buy SMS"
          : "Insufficient SMS balance. Please Buy SMS.",
      );
      return;
    }
    // No SMS gateway integrated yet — open device sms: link with all recipients.
    const numbers = recipients.map((p) => `+88${p}`).join(",");
    const body = encodeURIComponent(fullMessage);
    window.open(`sms:${numbers}?body=${body}`, "_blank");
    toast.success(lang === "bn" ? "SMS পাঠানোর জন্য খোলা হলো" : "Opened SMS app");
  };

  const sendVoice = () => {
    if (recipients.length === 0) {
      toast.error(lang === "bn" ? "কোনো প্রাপক নেই" : "No recipients");
      return;
    }
    if (minuteBalance <= 0) {
      toast.error(
        lang === "bn"
          ? "Minute balance কম। কিনুন → Buy Minutes"
          : "Insufficient minutes. Please Buy Minutes.",
      );
      return;
    }
    toast.info(
      lang === "bn"
        ? "Voice message ফিচারটি শীঘ্রই আসছে"
        : "Voice message coming soon",
    );
  };

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "মার্কেটিং" : "Marketing"}
        title={
          <span className="flex items-center gap-2">
            <button
              onClick={() => nav({ to: "/app/dashboard" })}
              className="-ml-1 flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {lang === "bn" ? "মার্কেটিং" : "Marketing"}
          </span>
        }
        actions={
          <Button className="h-10 gap-2">
            <History className="h-4 w-4" />
            {lang === "bn" ? "SMS হিস্টোরি" : "SMS History"}
          </Button>
        }
      />

      <div className="container px-3 py-4 sm:px-4">
        <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
          {/* Contacts panel */}
          <div className="rounded-xl border bg-background p-3">
            <div className="mb-3 flex items-center gap-3 border-b text-sm">
              {(["customer", "supplier", "employee"] as ContactTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "relative pb-2 font-semibold capitalize transition " +
                    (tab === t
                      ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "customer"
                    ? lang === "bn" ? "কাস্টমার" : "Customer"
                    : t === "supplier"
                      ? lang === "bn" ? "সাপ্লায়ার" : "Supplier"
                      : lang === "bn" ? "কর্মচারী" : "Employee"}
                  {tab === t && (
                    <span className="ml-1 align-super text-[10px] text-muted-foreground">
                      ({filtered.length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={lang === "bn" ? "নাম দিয়ে খুঁজুন" : "Search by name"}
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="h-9 bg-foreground text-background hover:bg-foreground/90"
                onClick={selectAll}
              >
                {lang === "bn" ? "সব যোগ" : "Select All"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh"
              >
                <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
              </Button>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {lang === "bn" ? "কোনো কন্টাক্ট নেই" : "No contacts"}
                </div>
              ) : (
                filtered.map((c) => {
                  const norm = normalizePhone(c.phone ?? "");
                  const added = norm && recipients.includes(norm);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg border p-2"
                    >
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.phone ? `+88 ${c.phone}` : (lang === "bn" ? "ফোন নেই" : "no phone")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "outline" : "default"}
                        className={
                          "h-7 px-3 text-xs " +
                          (added ? "" : "bg-foreground text-background hover:bg-foreground/90")
                        }
                        onClick={() => (added ? removeRecipient(norm!) : addRecipient(c.phone))}
                        disabled={!c.phone}
                      >
                        {added ? (lang === "bn" ? "আনডু" : "Added") : (lang === "bn" ? "যোগ" : "Add")}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Compose panel */}
          <div className="space-y-4">
            {/* Top: phone + balances */}
            <div className="grid gap-3 lg:grid-cols-[1fr,auto]">
              <div>
                <label className="mb-1 block text-xs font-semibold">
                  {lang === "bn" ? "ফোন নম্বর" : "Phone Number"} <span className="text-rose-500">*</span>
                </label>
                <div className="flex h-10 items-center overflow-hidden rounded-md border bg-background">
                  <span className="flex h-full items-center gap-1 border-r bg-muted/40 px-3 text-xs font-medium">
                    +88
                  </span>
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01XXXXXXXXX"
                    inputMode="numeric"
                    className="h-full border-0 text-sm focus-visible:ring-0"
                  />
                  <Button
                    onClick={addManualPhone}
                    className="h-full rounded-none bg-foreground text-background hover:bg-foreground/90"
                    aria-label="Add"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Phone className="h-3 w-3" />
                    {lang === "bn" ? "মিনিট ব্যালেন্স" : "MINUTE BALANCE"} {minuteBalance}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <MessageSquareText className="h-3 w-3" />
                    {lang === "bn" ? "SMS ব্যালেন্স" : "SMS BALANCE"} {smsBalance}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {lang === "bn" ? "মিনিট কিনুন" : "Buy Minutes"}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-amber-500 text-white hover:bg-amber-600"
                  >
                    {lang === "bn" ? "SMS কিনুন" : "Buy SMS"}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <div className="mb-1 text-xs font-semibold">
                {lang === "bn" ? "যাদের পাঠানো হবে" : "SMS Sending to"}
                <span className="ml-1 text-muted-foreground">({recipients.length})</span>
              </div>
              <div className="min-h-[44px] rounded-lg border bg-background p-2">
                {recipients.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {lang === "bn" ? "কাস্টমার তালিকা থেকে যোগ করুন" : "Add from contact list"}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {recipients.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                      >
                        {p}
                        <button
                          onClick={() => removeRecipient(p)}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600"
                          aria-label="Remove"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="rounded-xl border bg-background p-4">
              <label className="mb-2 block text-sm font-semibold">
                {lang === "bn" ? "বার্তা লিখুন" : "Write your message"}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: আমাদের নতুন অফার..." : "e.g. Our new offer..."}
                className="min-h-[140px] resize-none"
                maxLength={1000}
              />
              {signature && (
                <div className="mt-1 text-right text-xs text-muted-foreground whitespace-pre">
                  {signature.trim()}
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                {charCount} {lang === "bn" ? "অক্ষর" : "Character"} | {smsCount} SMS (160 Character/SMS)
              </div>
            </div>

            {/* Send buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={sendSms}
                className="h-11 border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                {lang === "bn" ? "SMS পাঠান" : "Send SMS"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={sendVoice}
                className="h-11 bg-blue-600 text-white hover:bg-blue-700"
              >
                {lang === "bn" ? "ভয়েস পাঠান" : "Send Voice Message"}
                <Phone className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketingPage;
