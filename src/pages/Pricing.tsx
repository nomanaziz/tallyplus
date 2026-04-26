import { useEffect } from "react";
import { useNavigate } from "@/lib/router";

export default function Pricing() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/", hash: "pricing", replace: true });
  }, [navigate]);
  return null;
}
