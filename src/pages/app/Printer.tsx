import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Bluetooth, Usb, AlertTriangle, Download, Save, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { printerSettingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";



type PrinterType = "inkjet_laser" | "pos_bluetooth" | "pos_usb";

const TABS: { v: PrinterType; bn: string; en: string; Icon: typeof Printer }[] = [
  { v: "inkjet_laser", bn: "Inkjet/Laser", en: "Inkjet/Laser", Icon: Printer },
  { v: "pos_bluetooth", bn: "POS Bluetooth", en: "POS Bluetooth", Icon: Bluetooth },
  { v: "pos_usb", bn: "POS USB", en: "POS USB", Icon: Usb },
];

function PrinterPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const { data, refetch } = useQuery(printerSettingsQuery(current?.id ?? null));

  const [tab, setTab] = useState<PrinterType>("inkjet_laser");
  const [printerType, setPrinterType] = useState<PrinterType>("inkjet_laser");
  const [language, setLanguage] = useState("bn");
  const [paperSize, setPaperSize] = useState("");
  const [fontSize, setFontSize] = useState(14);
  const [footerText, setFooterText] = useState("");
  const [printQr, setPrintQr] = useState(false);
  const [printDiscount, setPrintDiscount] = useState(true);
  const [printVat, setPrintVat] = useState(true);
  const [printDelivery, setPrintDelivery] = useState(true);
  const [printPrevDue, setPrintPrevDue] = useState(true);
  const [printUnitColumn, setPrintUnitColumn] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPrinterType((data.printer_type as PrinterType) ?? "inkjet_laser");
    setTab((data.printer_type as PrinterType) ?? "inkjet_laser");
    setLanguage(data.language ?? "bn");
    setPaperSize(data.paper_size ?? "");
    setFontSize(data.font_size ?? 14);
    setFooterText(data.footer_text ?? "");
    setPrintQr(!!data.print_qr);
    setPrintDiscount(!!data.print_discount);
    setPrintVat(!!data.print_vat);
    setPrintDelivery(!!data.print_delivery);
    setPrintPrevDue(!!data.print_prev_due);
    setPrintUnitColumn(!!data.print_unit_column);
  }, [data]);

  const save = async () => {
    if (!current) return;
    setBusy(true);
    const payload = {
      shop_id: current.id,
      printer_type: printerType,
      language,
      paper_size: paperSize || null,
      font_size: fontSize,
      footer_text: footerText || null,
      print_qr: printQr,
      print_discount: printDiscount,
      print_vat: printVat,
      print_delivery: printDelivery,
      print_prev_due: printPrevDue,
      print_unit_column: printUnitColumn,
    };
    const { error } = await supabase.from("shop_printer_settings").upsert(payload, { onConflict: "shop_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(lang === "bn" ? "সেটিংস সেভ হয়েছে" : "Settings saved");
    refetch();
  };

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader breadcrumb="প্রিন্টার" title={lang === "bn" ? "প্রিন্টার সেটিংস" : "Printer Settings"} />
      <div className="container px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Left — settings form */}
          <div className="rounded-xl border bg-background p-4">
            <h2 className="mb-3 text-sm font-bold">{lang === "bn" ? "প্রিন্টার সেটিংস" : "Printer Settings"}</h2>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">{lang === "bn" ? "ডিফল্ট প্রিন্টারের ধরণ" : "Default printer type"}</Label>
                <Select value={printerType} onValueChange={(v) => setPrinterType(v as PrinterType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inkjet_laser">Inkjet/Laser</SelectItem>
                    <SelectItem value="pos_bluetooth">POS Bluetooth</SelectItem>
                    <SelectItem value="pos_usb">POS USB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{lang === "bn" ? "প্রিন্টার ভাষা" : "Printer language"}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{lang === "bn" ? "প্রিন্টার সাইজ" : "Printer size"}</Label>
                <Select value={paperSize || "_"} onValueChange={(v) => setPaperSize(v === "_" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A5">A5</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="58mm">58mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{lang === "bn" ? "প্রিন্টার ফন্ট সাইজ" : "Font size"}</Label>
                <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 15, 16, 18, 20].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{lang === "bn" ? "প্রিন্ট সর্বশেষ লেখা" : "Print footer text"}</Label>
                <Textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={3} placeholder="Enter last text..." />
              </div>

              <div className="mt-1 grid gap-2">
                {[
                  { l_bn: "প্রিন্ট অনলাইন স্টোর QR", l_en: "Print online store QR", v: printQr, set: setPrintQr },
                  { l_bn: "প্রিন্ট ডিসকাউন্ট", l_en: "Print discount", v: printDiscount, set: setPrintDiscount },
                  { l_bn: "প্রিন্ট ভ্যাট", l_en: "Print VAT", v: printVat, set: setPrintVat },
                  { l_bn: "প্রিন্ট ডেলিভারী চার্জ", l_en: "Print delivery charge", v: printDelivery, set: setPrintDelivery },
                  { l_bn: "কাস্টমারের পূর্ববর্তী বাকি প্রিন্ট করুন", l_en: "Print previous due", v: printPrevDue, set: setPrintPrevDue },
                  { l_bn: "পণ্যের ইউনিট কলাম প্রিন্ট করুন", l_en: "Print unit column", v: printUnitColumn, set: setPrintUnitColumn },
                ].map((row) => (
                  <div key={row.l_en} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-xs">{lang === "bn" ? row.l_bn : row.l_en}</span>
                    <Switch checked={row.v} onCheckedChange={row.set} />
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <Button variant="outline" className="h-10 flex-1" onClick={() => refetch()}>
                  <X className="h-4 w-4" /> {lang === "bn" ? "বাতিল করুন" : "Cancel"}
                </Button>
                <Button disabled={busy} className="h-10 flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={save}>
                  <Save className="h-4 w-4" /> {busy ? "..." : lang === "bn" ? "সেভ করুন" : "Save"}
                </Button>
              </div>
            </div>
          </div>

          {/* Right — setup guide */}
          <div className="rounded-xl border bg-background p-4">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {TABS.map((t) => {
                const active = tab === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={() => setTab(t.v)}
                    className={
                      "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition " +
                      (active ? "border-foreground bg-background shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted")
                    }
                  >
                    <t.Icon className="h-4 w-4" />
                    {lang === "bn" ? t.bn : t.en}
                  </button>
                );
              })}
            </div>

            {tab === "inkjet_laser" && <InkjetGuide lang={lang} />}
            {tab === "pos_bluetooth" && <BluetoothGuide lang={lang} />}
            {tab === "pos_usb" && <UsbGuide lang={lang} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ no, title, body }: { no: string; title: string; body: string }) {
  return (
    <div className="rounded-md border bg-background px-4 py-3">
      <div className="text-sm font-bold">{`ধাপ ${no}: ${title}`}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function Note({ children, color = "amber" }: { children: React.ReactNode; color?: "amber" }) {
  return (
    <div className={`flex gap-2 rounded-md border border-${color}-300 bg-${color}-50 px-3 py-2 text-xs text-${color}-900`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
      <div>{children}</div>
    </div>
  );
}

function InkjetGuide({ lang: _lang }: { lang: string }) {
  return (
    <div className="space-y-2">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold"><Printer className="h-4 w-4" /> প্রিন্টার সেটআপ গাইড</h3>
      <Step no="১" title="আনবক্সিং এবং পাওয়ার অন" body="প্রিন্টারটি বাক্স থেকে বের করুন, পাওয়ার কেবল সংযুক্ত করুন এবং চালু করার জন্য পাওয়ার বোতাম চাপুন।" />
      <Step no="২" title="কালি/টোনার কার্টিজ ইনস্টল" body="কার্টিজ অ্যাক্সেস ডোর খুলুন, ক্যারেজ নড়াচড়া শেষ হওয়া পর্যন্ত অপেক্ষা করুন, নতুন কার্টিজ খুলে সঠিক স্লটে প্রবেশ করান এবং ডোর বন্ধ করুন।" />
      <Step no="৩" title="কাগজ লোড" body="পেপার ট্রে টেনে বের করুন, A4 আকার অনুযায়ী গাইড সমন্বয় করুন, কাগজ রাখুন এবং ট্রেটি আবার ভেতরে ঠেলে দিন।" />
      <Step no="৪" title="কম্পিউটারে সংযোগ দিন" body="USB কেবল ব্যবহার করুন (প্লাগ অ্যান্ড প্লে) অথবা প্রিন্টারের ডিসপ্লের নির্দেশনা অনুসরণ করে Wi-Fi সেটআপ করুন।" />
      <Step no="৫" title="ড্রাইভার/সফটওয়্যার ইনস্টল করুন" body="বেশিরভাগ কম্পিউটার স্বয়ংক্রিয়ভাবে ড্রাইভার ইনস্টল করে। না হলে, প্রস্তুতকারকের ওয়েবসাইটে যান, আপনার মডেল অনুসন্ধান করুন, ড্রাইভার ডাউনলোড করুন এবং ইনস্টল করুন।" />
      <Step no="৬" title="টেস্ট প্রিন্ট" body="সবকিছু সঠিকভাবে কাজ করছে কিনা তা নিশ্চিত করতে একটি টেস্ট পেজ প্রিন্ট করুন।" />
    </div>
  );
}

function BluetoothGuide({ lang: _lang }: { lang: string }) {
  return (
    <div className="space-y-2">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold"><Bluetooth className="h-4 w-4" /> প্রিন্টার সেটআপ গাইড</h3>
      <Step no="১" title="পাওয়ার অন করুন এবং ব্লুটুথ চালু করুন" body="আপনার POS প্রিন্টার চালু করুন এবং ব্লুটুথ সক্রিয় করুন। প্রিন্টারের ব্লুটুথ ইন্ডিকেটর লাইট দেখুন।" />
      <Step no="২" title="ডিভাইসের সাথে পেয়ার করুন" body="আপনার ডিভাইসের ব্লুটুথ সেটিংস খুলুন, ডিভাইসগুলো স্ক্যান করুন এবং আপনার POS প্রিন্টার নির্বাচন করুন। প্রয়োজন হলে PIN কোড দিন (সাধারণত '0000' অথবা '1234')।" />
      <Step no="৩" title="প্রিন্টার সেটিংস কনফিগার করুন" body="Tally Plus Web App এ Printer Settings এ যান এবং প্রিন্টার টাইপ হিসেবে 'POS_BLUETOOTH' সেট করুন।" />
      <Step no="৪" title="টেস্ট প্রিন্ট" body="একটি নমুনা রসিদ প্রিন্ট করুন যাতে নিশ্চিত হওয়া যায় আপনার POS প্রিন্টার সঠিকভাবে কাজ করছে।" />
      <Note>নোট: POS প্রিন্টিং Web Serial API ব্যবহার করে, যা সব ব্রাউজারে সমর্থিত নয়। সেরা ফলাফলের জন্য ডেস্কটপে Chrome বা Edge এর সর্বশেষ সংস্করণ ব্যবহার করুন।</Note>
    </div>
  );
}

function UsbGuide({ lang: _lang }: { lang: string }) {
  return (
    <div className="space-y-2">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold"><Usb className="h-4 w-4" /> প্রিন্টার সেটআপ গাইড</h3>
      <Step no="১" title="USB কেবল সংযুক্ত করুন" body="আপনার POS প্রিন্টারের USB কেবল কম্পিউটার বা POS টার্মিনালে সংযুক্ত করুন।" />
      <Step no="২" title="ড্রাইভার ইনস্টল করুন" body="আপনার POS প্রিন্টারের মডেল অনুযায়ী ড্রাইভার ইনস্টল করুন। সর্বশেষ ড্রাইভার প্রস্তুতকারকের ওয়েবসাইট থেকে ডাউনলোড করুন।" />
      <div className="rounded-md border bg-background px-4 py-3">
        <div className="text-sm font-bold">ধাপ ৩: Tally Plus Print Manager ইনস্টল করুন</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Tally Plus Print Manager ডেস্কটপ অ্যাপ ডাউনলোড ও ইনস্টল করুন{" "}
          <a className="text-sky-600 underline" href="#"><Download className="inline h-3 w-3" /> Download Print Manager</a>। Print Manager ইনস্টল না করলে USB প্রিন্টিং কাজ করবে না।
        </div>
      </div>
      <Step no="৪" title="Tally Plus Web App-এ প্রিন্টার কনফিগার করুন" body="Tally Plus Web App-এ Printer Settings এ যান এবং প্রিন্টার টাইপ হিসেবে 'POS USB' (Usb Printer) সিলেক্ট করুন।" />
      <Step no="৫" title="কাগজের আকার সেট করুন" body="রশিদ কাগজের আকার অনুযায়ী (সাধারণত 54mm বা 80mm থার্মাল পেপার) সঠিকভাবে সেট করুন।" />
      <Step no="৬" title="টেস্ট কনফিগারেশন" body="একটি টেস্ট রসিদ প্রিন্ট করুন এবং নিশ্চিত করুন যে সবকিছু সঠিকভাবে কাজ করছে।" />
      <Note>নোট: POS USB প্রিন্টার ব্যবহার করার জন্য, আপনার Tally Plus Print Manager ইনস্টল করতে হবে। প্রিন্ট ম্যানেজার ইনস্টল না করলে, USB প্রিন্টিং কাজ করবে না। সেরা ফলাফলের জন্য ডেস্কটপে Chrome বা Edge এর সর্বশেষ সংস্করণ ব্যবহার করুন।</Note>
    </div>
  );
}
export default PrinterPage;
