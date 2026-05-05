import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardPaste, ListChecks } from "lucide-react";
import { parseFordoText, type ParsedItem } from "@/lib/fordoTextParser";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (items: ParsedItem[]) => void;
};

const PLACEHOLDER = `উদাহরণ:
গৌরী হুইল পাউডার ৪ কেজি, নিম সাবান ২ টা।
ম্যাগি নুডুলস ৮ প্যাকেট, ড্রাই কেক ২ টা।
নিডো দুধ (৩+) ১ টা, ডিপ্লোমা ১ কেজি+১/২ কেজি।
টয়লেট টিস্যু ১ ডজন, সয়াবিন তেল ৫ লিটার।`;

export function BulkTextToFordoDialog({ open, onOpenChange, onAdd }: Props) {
  const [text, setText] = useState("");

  const parsed = useMemo<ParsedItem[]>(() => parseFordoText(text), [text]);

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText((cur) => (cur ? `${cur}\n${t}` : t));
    } catch {
      toast.error("ক্লিপবোর্ড পড়া যায়নি — হাতে paste করুন");
    }
  };

  const handleAdd = () => {
    if (parsed.length === 0) {
      toast.error("কোনো পণ্য পাওয়া যায়নি");
      return;
    }
    onAdd(parsed);
    setText("");
    onOpenChange(false);
    toast.success(`${parsed.length} টি পণ্য যোগ হয়েছে`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> টেক্সট থেকে তালিকা
          </DialogTitle>
          <DialogDescription>
            একসাথে পুরো ফর্দ লিখুন বা paste করুন। কমা, দাঁড়ি (।) বা নতুন লাইন
            দিয়ে আলাদা করুন। অ্যাপ নিজে নিজে নাম, পরিমাণ ও একক আলাদা করে দেবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePaste}
            >
              <ClipboardPaste className="mr-1 h-4 w-4" /> Paste
            </Button>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={PLACEHOLDER}
            className="font-[inherit]"
          />
        </div>

        {parsed.length > 0 && (
          <div className="rounded-md border">
            <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              প্রিভিউ — {parsed.length} টি পণ্য পাওয়া গেছে
            </div>
            <ScrollArea className="max-h-56">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-8 px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">নাম</th>
                    <th className="px-2 py-1.5 text-right">পরিমাণ</th>
                    <th className="px-2 py-1.5 text-left">একক</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1.5">{it.name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-1.5 text-right">{it.qty ?? ""}</td>
                      <td className="px-2 py-1.5">{it.unit ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button onClick={handleAdd} disabled={parsed.length === 0}>
            তালিকায় যোগ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}