import { useEffect, useMemo, useRef, useState } from "react";
import { Search, BookUser, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export type PhonebookContact = { name: string; phone: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (c: PhonebookContact) => void;
};

// Detect Contact Picker API support (Android Chrome / Edge).
function hasContactPickerApi(): boolean {
  if (typeof navigator === "undefined") return false;
  // @ts-expect-error - Contact Picker API is not in standard TS lib
  return !!(navigator.contacts && typeof navigator.contacts.select === "function");
}

// Parse vCard (.vcf) text into contact list.
function parseVCards(text: string): PhonebookContact[] {
  const out: PhonebookContact[] = [];
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  for (const raw of cards) {
    const body = raw.split(/END:VCARD/i)[0];
    if (!body) continue;
    const lines = body.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
    let name = "";
    let phone = "";
    for (const ln of lines) {
      if (/^FN[:;]/i.test(ln)) {
        name = ln.split(":").slice(1).join(":").trim();
      } else if (!name && /^N[:;]/i.test(ln)) {
        const parts = ln.split(":").slice(1).join(":").split(";");
        name = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
      } else if (!phone && /^TEL/i.test(ln)) {
        phone = ln.split(":").slice(1).join(":").trim();
      }
    }
    if (name || phone) out.push({ name: name || phone, phone });
  }
  return out;
}

function initials(name: string) {
  return (name || "U").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function PhonebookPickerDialog({ open, onOpenChange, onPick }: Props) {
  const { lang } = useI18n();
  const [list, setList] = useState<PhonebookContact[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supportsApi = useMemo(() => hasContactPickerApi(), []);

  useEffect(() => {
    if (!open) {
      setList([]);
      setSearch("");
    }
  }, [open]);

  // Auto-trigger native picker on open if supported.
  useEffect(() => {
    if (!open || !supportsApi || list.length > 0) return;
    void pickFromDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supportsApi]);

  const pickFromDevice = async () => {
    if (!supportsApi) {
      toast.error(
        lang === "bn"
          ? "এই ব্রাউজারে ফোনবুক সরাসরি অ্যাক্সেস করা যায় না — .vcf ফাইল আপলোড করুন"
          : "This browser cannot access contacts directly — upload a .vcf file",
      );
      return;
    }
    setBusy(true);
    try {
      // @ts-expect-error - Contact Picker API
      const selected: Array<{ name?: string[]; tel?: string[] }> = await navigator.contacts.select(
        ["name", "tel"],
        { multiple: true },
      );
      const mapped: PhonebookContact[] = selected.map((c) => ({
        name: (c.name?.[0] ?? "").trim() || (c.tel?.[0] ?? ""),
        phone: (c.tel?.[0] ?? "").replace(/\s+/g, ""),
      })).filter((c) => c.name || c.phone);
      if (mapped.length === 1) {
        onPick(mapped[0]);
        onOpenChange(false);
        return;
      }
      setList(mapped);
    } catch (e) {
      // user cancelled or denied
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const text = await f.text();
      const parsed = parseVCards(text);
      if (parsed.length === 0) {
        toast.error(lang === "bn" ? "কোনো কন্ট্যাক্ট পাওয়া যায়নি" : "No contacts found");
        return;
      }
      setList(parsed);
    } catch {
      toast.error(lang === "bn" ? "ফাইল পড়া যায়নি" : "Could not read file");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [list, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookUser className="h-5 w-5 text-primary" />
            {lang === "bn" ? "ফোনবুক থেকে যোগ করি" : "Add from phonebook"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "bn" ? "খোঁজ" : "Search"}
              className="h-11 rounded-full bg-muted pl-9"
            />
          </div>
        </div>

        <div className="max-h-[55vh] min-h-[260px] overflow-y-auto px-2">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookUser className="h-7 w-7" />
              </div>
              <div className="text-sm text-muted-foreground">
                {supportsApi
                  ? lang === "bn"
                    ? "মোবাইলের কন্ট্যাক্ট থেকে নির্বাচন করুন"
                    : "Pick a contact from your phone"
                  : lang === "bn"
                    ? "ফোন থেকে .vcf ফাইল আপলোড করুন (কন্ট্যাক্ট অ্যাপ → এক্সপোর্ট)"
                    : "Upload a .vcf file from your phone (Contacts app → Export)"}
              </div>
              <div className="flex flex-col gap-2 w-full">
                {supportsApi && (
                  <Button onClick={pickFromDevice} disabled={busy} className="h-11 w-full gap-2">
                    <BookUser className="h-4 w-4" />
                    {lang === "bn" ? "কন্ট্যাক্ট নির্বাচন" : "Select contact"}
                  </Button>
                )}
                <Button
                  variant={supportsApi ? "outline" : "default"}
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="h-11 w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {lang === "bn" ? ".vcf ফাইল আপলোড" : "Upload .vcf file"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".vcf,text/vcard,text/x-vcard"
                  className="hidden"
                  onChange={(e) => {
                    void onFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title={lang === "bn" ? "কিছু পাওয়া যায়নি" : "No matches"} />
          ) : (
            <div className="flex flex-col">
              {filtered.map((c, i) => (
                <button
                  key={`${c.phone}-${i}`}
                  onClick={() => {
                    onPick(c);
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-3 border-b px-3 py-3 text-left transition hover:bg-accent"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-orange-400 text-xs font-bold text-white">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.phone || "—"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {list.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <Button variant="ghost" size="sm" onClick={() => setList([])} className="gap-1.5">
              <X className="h-4 w-4" />
              {lang === "bn" ? "পরিষ্কার" : "Clear"}
            </Button>
            {!supportsApi && (
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" />
                {lang === "bn" ? "অন্য ফাইল" : "Another file"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}