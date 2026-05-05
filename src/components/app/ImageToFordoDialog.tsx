import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ParsedItem } from "@/lib/fordoTextParser";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (items: ParsedItem[]) => void;
};

// NOTE: image is intentionally NOT persisted anywhere — it's only sent once
// to the AI gateway for parsing and then dropped from memory.

async function compressImage(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const maxDim = 1600;
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const r = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * r);
    height = Math.round(height * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ImageToFordoDialog({ open, onOpenChange, onAdd }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview(null);
    setItems([]);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("শুধু ছবি upload করুন");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("ছবিটি অনেক বড় (১০MB এর কম দিন)");
      return;
    }
    setItems([]);
    setLoading(true);
    try {
      const dataUrl = await compressImage(f);
      setPreview(dataUrl);
      const { data, error } = await supabase.functions.invoke(
        "parse-fordo-image",
        { body: { image: dataUrl } },
      );
      if (error) throw error;
      const parsed = (data?.items ?? []) as ParsedItem[];
      if (parsed.length === 0) {
        toast.error("ছবি থেকে পণ্য খুঁজে পাওয়া যায়নি");
      }
      setItems(parsed);
    } catch (e) {
      const msg = (e as Error).message ?? "ছবি বিশ্লেষণে সমস্যা";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const removeRow = (i: number) => {
    setItems((cur) => cur.filter((_, j) => j !== i));
  };

  const handleAdd = () => {
    if (items.length === 0) return;
    onAdd(items);
    toast.success(`${items.length} টি পণ্য যোগ হয়েছে`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> ছবি থেকে ফর্দ
          </DialogTitle>
          <DialogDescription>
            খাতায় লেখা ফর্দের ছবি তুলুন বা upload করুন। অ্যাপ নিজে নিজে নাম, পরিমাণ ও একক বুঝে নেবে। ছবি কোথাও সংরক্ষণ করা হবে না।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => cameraRef.current?.click()}
              disabled={loading}
            >
              <Camera className="mr-1 h-4 w-4" /> ছবি তুলুন
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          </div>

          {preview && (
            <div className="overflow-hidden rounded-md border bg-muted/20">
              <img
                src={preview}
                alt="ফর্দের ছবি"
                className="mx-auto max-h-48 object-contain"
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/20 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> ছবি বিশ্লেষণ হচ্ছে…
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                প্রিভিউ — {items.length} টি পণ্য পাওয়া গেছে
              </div>
              <ScrollArea className="max-h-56">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-8 px-2 py-1.5 text-left">#</th>
                      <th className="px-2 py-1.5 text-left">নাম</th>
                      <th className="px-2 py-1.5 text-right">পরিমাণ</th>
                      <th className="px-2 py-1.5 text-left">একক</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1.5">{it.name}</td>
                        <td className="px-2 py-1.5 text-right">{it.qty ?? ""}</td>
                        <td className="px-2 py-1.5">{it.unit ?? ""}</td>
                        <td className="px-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeRow(i)}
                            aria-label="বাদ দিন"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button onClick={handleAdd} disabled={items.length === 0 || loading}>
            তালিকায় যোগ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}