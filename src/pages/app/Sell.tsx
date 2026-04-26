import { POSPage } from "@/components/app/POSPage";
import { useSearch } from "@/lib/router";

export default function SellPage() {
  const { payment } = useSearch<{ payment?: string }>();
  return <POSPage mode="sell" autoOpenDue={payment === "due"} />;
}
