import { lazy, Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { MessageSquare, ShoppingCart, History, Send, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePermissions } from "@/lib/permissions-hook";

const BuySms = lazy(() => import("@/pages/app/BuySms"));
const Marketing = lazy(() => import("@/pages/app/Marketing"));
const SmsHistory = lazy(() => import("@/pages/app/SmsHistory"));
const SmsGateways = lazy(() => import("@/pages/admin/SmsGateways"));

const Fallback = () => (
  <div className="p-6 text-sm text-muted-foreground">লোড হচ্ছে...</div>
);

export default function SmsModule() {
  const { t } = useI18n();
  const { isAdmin, isOwner } = usePermissions();
  const [tab, setTab] = useState("send");

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">SMS Module</h1>
          <p className="text-xs text-muted-foreground">
            গ্রাহক/সরবরাহকারীকে SMS পাঠান, প্যাকেজ কিনুন এবং ইতিহাস দেখুন
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="send" className="gap-1.5">
            <Send className="h-4 w-4" /> পাঠান
          </TabsTrigger>
          <TabsTrigger value="buy" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" /> কিনুন
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> ইতিহাস
          </TabsTrigger>
          {(isAdmin || isOwner) && (
            <TabsTrigger value="admin" className="gap-1.5">
              <Shield className="h-4 w-4" /> অ্যাডমিন
            </TabsTrigger>
          )}
        </TabsList>

        <Card className="mt-4 overflow-hidden">
          <TabsContent value="send" className="m-0">
            <Suspense fallback={<Fallback />}><Marketing /></Suspense>
          </TabsContent>
          <TabsContent value="buy" className="m-0">
            <Suspense fallback={<Fallback />}><BuySms /></Suspense>
          </TabsContent>
          <TabsContent value="history" className="m-0">
            <Suspense fallback={<Fallback />}><SmsHistory /></Suspense>
          </TabsContent>
          {(isAdmin || isOwner) && (
            <TabsContent value="admin" className="m-0">
              <Suspense fallback={<Fallback />}><SmsGateways /></Suspense>
            </TabsContent>
          )}
        </Card>
      </Tabs>
    </div>
  );
}