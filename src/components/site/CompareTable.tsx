import { useI18n } from "@/lib/i18n";
import { Check, X } from "lucide-react";

type Row = { f: string; us: string; paper: string | false; other: string | false };

export function CompareTable() {
  const { lang } = useI18n();
  const rows: Row[] = lang === "bn"
    ? [
        { f: "ভাষা সাপোর্ট", us: "বাংলা ও ইংরেজি", paper: false, other: "সীমিত / নেই" },
        { f: "বাড়তি আয়ের সুযোগ", us: "স্টক/মূলধন ছাড়াই আয়", paper: false, other: "সীমিত" },
        { f: "২৪/৭ সাপোর্ট", us: "দিনরাত সাপোর্ট", paper: false, other: "নির্দিষ্ট সময়" },
        { f: "ব্যবসা-ভিত্তিক ফিচার", us: "কাস্টমাইজড ও সহজ", paper: false, other: "জটিল" },
      ]
    : [
        { f: "Language Support", us: "Bangla & English", paper: false, other: "Limited or none" },
        { f: "Extra Income", us: "No-stock & no-capital income", paper: false, other: "Limited" },
        { f: "24/7 Support", us: "Day & night support", paper: false, other: "Limited time" },
        { f: "Business-specific features", us: "Customized and easy", paper: false, other: "Complicated" },
      ];

  const headers = lang === "bn"
    ? ["ফিচার", "টালি প্লাস", "খাতা-কলম", "অন্যান্য অ্যাপ"]
    : ["Feature", "Tally Plus", "Pen & Paper", "Other Apps"];

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <h2 className="text-center text-3xl font-extrabold md:text-4xl">
        {lang === "bn" ? <>টালি প্লাস <span className="text-primary">vs অন্যান্য</span></> : <>Tally Plus <span className="text-primary">vs others</span></>}
      </h2>
      <p className="mt-3 text-center text-muted-foreground">
        {lang === "bn" ? "কেন টালি প্লাস বেছে নেবেন?" : "Why should you choose Tally Plus?"}
      </p>
      <div className="mx-auto mt-10 max-w-4xl overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-foreground">
            <tr>
              {headers.map((h, i) => (
                <th key={h} className={`px-4 py-4 font-bold ${i === 1 ? "text-primary" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.f} className="border-t">
                <td className="px-4 py-4 font-semibold">{r.f}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{r.us}</div>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {r.paper === false ? <X className="h-4 w-4 text-destructive" /> : r.paper}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {r.other === false ? <X className="h-4 w-4 text-destructive" /> : (
                    <div className="flex items-center gap-2"><X className="h-4 w-4 text-destructive" />{r.other}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}