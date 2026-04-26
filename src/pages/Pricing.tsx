import { redirect } from "@/lib/router";
({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "pricing" });
  },
  component: () => null,
});
export default Pricing;
