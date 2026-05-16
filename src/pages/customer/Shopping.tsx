import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingBag, Heart, Wrench } from "lucide-react";
import MyOrdersPage from "./MyOrders";
import FavoriteShopsPage from "./FavoriteShops";
import MyServicesPage from "./MyServices";

export default function CustomerShopping() {
  const [tab, setTab] = useState<"orders" | "favorites" | "services">("orders");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">শপিং</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingBag className="h-4 w-4" /> অর্ডার
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 text-xs sm:text-sm">
            <Heart className="h-4 w-4" /> প্রিয় দোকান
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm">
            <Wrench className="h-4 w-4" /> সার্ভিস
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4"><MyOrdersPage /></TabsContent>
        <TabsContent value="favorites" className="mt-4"><FavoriteShopsPage /></TabsContent>
        <TabsContent value="services" className="mt-4"><MyServicesPage /></TabsContent>
      </Tabs>
    </div>
  );
}