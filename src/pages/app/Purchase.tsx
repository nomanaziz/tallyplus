import { POSPage } from "@/components/app/POSPage";
import { useSearch } from "@/lib/router";

export default function PurchasePage() {
  const { payment } = useSearch<{ payment?: string }>();
  return <POSPage mode="purchase" autoOpenDue={payment === "due"} />;
}
