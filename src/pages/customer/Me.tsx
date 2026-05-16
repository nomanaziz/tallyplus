import { Link, useNavigate } from "@/lib/router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  User as UserIcon, Crown, StickyNote, GraduationCap, History,
  BookOpen, LogOut, ChevronRight,
} from "lucide-react";

type Item = { to: string; label: string; desc: string; Icon: typeof UserIcon; color: string };

const ITEMS: Item[] = [
  { to: "/customer/profile", label: "প্রোফাইল", desc: "নাম, ফোন, ছবি",
    Icon: UserIcon, color: "bg-blue-500/10 text-blue-600" },
  { to: "/customer/subscription", label: "সাবস্ক্রিপশন", desc: "প্ল্যান ও বিলিং",
    Icon: Crown, color: "bg-amber-500/10 text-amber-600" },
  { to: "/customer/history", label: "ইতিহাস", desc: "পুরোনো মাসের আয়-ব্যয়",
    Icon: History, color: "bg-violet-500/10 text-violet-600" },
  { to: "/customer/cash-book", label: "ক্যাশবুক", desc: "প্রিন্ট-যোগ্য খাতা",
    Icon: BookOpen, color: "bg-emerald-500/10 text-emerald-600" },
  { to: "/customer/notes", label: "নোট", desc: "ব্যক্তিগত নোট",
    Icon: StickyNote, color: "bg-yellow-500/10 text-yellow-700" },
  { to: "/customer/training", label: "ট্রেনিং", desc: "ব্যবহার শেখার গাইড",
    Icon: GraduationCap, color: "bg-pink-500/10 text-pink-600" },
];

export default function CustomerMe() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">আমি</h1>
      <div className="grid gap-2 sm:grid-cols-2">
        {ITEMS.map(({ to, label, desc, Icon, color }) => (
          <Link key={to} to={to}>
            <Card className="flex items-center gap-3 p-3 transition hover:shadow-md">
              <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{label}</div>
                <div className="truncate text-xs text-muted-foreground">{desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
      >
        <LogOut className="mr-2 h-4 w-4" /> লগআউট
      </Button>
    </div>
  );
}