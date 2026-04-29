import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, ScanLine, X, Zap, ZapOff } from "lucide-react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

function beep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 1000;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(); o.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

export function BarcodeScannerButton({
  onDetected,
  size = "icon",
  variant = "outline",
  className,
  label,
}: {
  onDetected: (code: string) => void;
  size?: "icon" | "sm" | "default";
  variant?: "outline" | "default" | "ghost" | "secondary";
  className?: string;
  label?: string;
}) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);

  const handle = (code: string) => {
    beep();
    onDetected(code.trim());
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        aria-label={label || (lang === "bn" ? "বারকোড স্ক্যান" : "Scan barcode")}
        onClick={() => setOpen(true)}
      >
        <ScanLine className="h-4 w-4" />
        {size !== "icon" && (
          <span className="ml-1.5">{label || (lang === "bn" ? "স্ক্যান" : "Scan")}</span>
        )}
      </Button>
      <ScannerDialog open={open} onOpenChange={setOpen} onDetected={handle} />
    </>
  );
}

function ScannerDialog({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDetected: (code: string) => void;
}) {
  const { lang } = useI18n();
  const [tab, setTab] = useState<"camera" | "hardware">("camera");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "বারকোড স্ক্যানার" : "Barcode Scanner"}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">
              <Camera className="mr-1.5 h-4 w-4" />
              {lang === "bn" ? "ক্যামেরা" : "Camera"}
            </TabsTrigger>
            <TabsTrigger value="hardware">
              <Keyboard className="mr-1.5 h-4 w-4" />
              {lang === "bn" ? "হার্ডওয়্যার" : "Hardware"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="camera" className="mt-3">
            {open && tab === "camera" ? <CameraPane onDetected={onDetected} /> : null}
          </TabsContent>
          <TabsContent value="hardware" className="mt-3">
            <HardwarePane open={open && tab === "hardware"} onDetected={onDetected} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CameraPane({ onDetected }: { onDetected: (code: string) => void }) {
  const { lang } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    (async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        };
        const controls = await reader.decodeFromConstraints(constraints, videoRef.current!, (result) => {
          if (result && !cancelled) {
            onDetected(result.getText());
          }
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        // grab the underlying stream for torch control
        const stream = (videoRef.current?.srcObject as MediaStream) || null;
        streamRef.current = stream;
        const track = stream?.getVideoTracks?.()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        if (caps.torch) setTorchSupported(true);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.name === "NotAllowedError"
              ? lang === "bn"
                ? "ক্যামেরার অনুমতি দিন।"
                : "Camera permission denied."
              : (e?.message ?? "Camera error"),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onDetected, lang]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn((v) => !v);
    } catch {}
  };

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p className="font-medium text-destructive">{error}</p>
        <p className="mt-1 text-muted-foreground">
          {lang === "bn"
            ? "অথবা হার্ডওয়্যার ট্যাবে গিয়ে USB স্ক্যানার ব্যবহার করুন।"
            : "Or switch to the Hardware tab to use a USB scanner."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border bg-black">
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-1/2 w-3/4 rounded-md border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {lang === "bn" ? "বারকোড ক্যামেরার সামনে ধরুন" : "Hold a barcode in front of the camera"}
        </p>
        {torchSupported && (
          <Button type="button" variant="ghost" size="sm" onClick={toggleTorch}>
            {torchOn ? <ZapOff className="mr-1 h-4 w-4" /> : <Zap className="mr-1 h-4 w-4" />}
            {lang === "bn" ? "টর্চ" : "Torch"}
          </Button>
        )}
      </div>
    </div>
  );
}

function HardwarePane({ open, onDetected }: { open: boolean; onDetected: (code: string) => void }) {
  const { lang } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [val, setVal] = useState("");

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {lang === "bn"
          ? "USB স্ক্যানার সংযুক্ত করুন, তারপর বারকোডে ট্রিগার চাপুন। নিচের বক্সে ফোকাস থাকতে হবে।"
          : "Connect a USB scanner, then trigger a scan. Keep the field below focused."}
      </p>
      <Input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            e.preventDefault();
            onDetected(val.trim());
            setVal("");
          }
        }}
        placeholder={lang === "bn" ? "এখানে স্ক্যান করুন বা টাইপ করুন..." : "Scan or type here..."}
        autoFocus
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!val.trim()}
          onClick={() => {
            if (val.trim()) {
              onDetected(val.trim());
              setVal("");
            }
          }}
        >
          {lang === "bn" ? "ব্যবহার করুন" : "Use"}
        </Button>
      </div>
    </div>
  );
}