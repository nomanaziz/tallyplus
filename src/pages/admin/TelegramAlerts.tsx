import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Send, Plus, Bot } from "lucide-react";
import { toast } from "sonner";

const EVENT_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "সব" },
  { key: "payment_paid", label: "💰 পেমেন্ট সফল" },
  { key: "payment_failed", label: "❌ পেমেন্ট ব্যর্থ" },
  { key: "sub_request", label: "📥 Subscription request" },
  { key: "transfer_request", label: "🏪 Shop transfer request" },
  { key: "transfer_proof", label: "💳 Transfer proof uploaded" },
  { key: "order", label: "🛒 নতুন অর্ডার" },
  { key: "fordo", label: "নতুন ফর্দ" },
  { key: "signup", label: "নতুন সাইনআপ" },
];

type Subscriber = {
  id: string;
  chat_id: string;
  label: string | null;
  is_active: boolean;
  events: string[];
  created_at: string;
};

export default function TelegramAlerts() {
  const qc = useQueryClient();
  const [chatId, setChatId] = useState("");
  const [label, setLabel] = useState("");
  const [events, setEvents] = useState<string[]>(["all"]);

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["admin_telegram_subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_telegram_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Subscriber[];
    },
  });

  const addSub = useMutation({
    mutationFn: async () => {
      if (!chatId.trim()) throw new Error("Chat ID দিন");
      const { error } = await supabase.from("admin_telegram_subscribers").insert({
        chat_id: chatId.trim(),
        label: label.trim() || null,
        events: events.length ? events : ["all"],
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("যোগ করা হয়েছে");
      setChatId(""); setLabel(""); setEvents(["all"]);
      qc.invalidateQueries({ queryKey: ["admin_telegram_subscribers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Subscriber) => {
      const { error } = await supabase
        .from("admin_telegram_subscribers")
        .update({ is_active: !s.is_active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_telegram_subscribers"] }),
  });

  const removeSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_telegram_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin_telegram_subscribers"] });
    },
  });

  const sendTest = useMutation({
    mutationFn: async (s: Subscriber) => {
      const { data, error } = await supabase.functions.invoke("telegram-notify", {
        body: {
          event_type: "test",
          title: "✅ Test Message",
          body: `TallyPlus admin alert test\nLabel: ${s.label ?? "—"}`,
          chat_id: s.chat_id,
        },
      });
      if (error) throw error;
      const r = (data as { results?: Array<{ ok: boolean; error?: string }> })?.results?.[0];
      if (r && !r.ok) throw new Error(r.error || "Telegram error");
    },
    onSuccess: () => toast.success("Test message পাঠানো হয়েছে"),
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleEvent(key: string) {
    setEvents((prev) => {
      if (key === "all") return ["all"];
      const next = prev.filter((e) => e !== "all");
      return next.includes(key) ? next.filter((e) => e !== key) : [...next, key];
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="size-6" /> Telegram Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          নতুন order, ফর্দ, signup হলে admin Telegram-এ instant notification পাবে।
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">কিভাবে chat ID পাবেন</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>১. Telegram-এ আমাদের bot search করুন এবং <code className="bg-muted px-1 rounded">/start</code> চাপুন।</p>
          <p>২. বা group বানিয়ে bot add করে group এ একটা message লিখুন।</p>
          <p>৩. নিচের link খুলুন (token সহ): <code className="bg-muted px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></p>
          <p>৪. Response থেকে <code className="bg-muted px-1 rounded">chat.id</code> copy করে এখানে paste করুন।</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4" /> নতুন subscriber
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Chat ID *</Label>
              <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="123456789 বা -100123456789" />
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="যেমন: Admin Group" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">কোন event পাবে</Label>
            <div className="flex flex-wrap gap-3">
              {EVENT_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={events.includes(opt.key)} onCheckedChange={() => toggleEvent(opt.key)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={() => addSub.mutate()} disabled={addSub.isPending || !chatId.trim()}>
            যোগ করুন
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">এখনো কোনো subscriber নেই।</p>
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm">{s.chat_id}</span>
                      {s.label && <span className="text-sm text-muted-foreground">— {s.label}</span>}
                      {!s.is_active && <Badge variant="secondary">Off</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.events.map((e) => (
                        <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={s.is_active} onCheckedChange={() => toggleActive.mutate(s)} />
                    <Button size="sm" variant="outline" onClick={() => sendTest.mutate(s)} disabled={sendTest.isPending}>
                      <Send className="size-4 mr-1" /> Test
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeSub.mutate(s.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}