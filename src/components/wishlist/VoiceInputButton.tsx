import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  onLines: (lines: string[]) => void;
  className?: string;
};

/**
 * Bangla voice → ফর্দ lines.
 * 1. Tries Web Speech API (Chrome / Android) for live transcription.
 * 2. Falls back to MediaRecorder + edge function (`voice-to-fordo`) for
 *    iOS Safari / Firefox where SpeechRecognition is missing.
 * The transcript is always sent to `voice-to-fordo` so Gemini can split it
 * into clean ফর্দ lines.
 */
export function VoiceInputButton({ onLines, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>("");
  const usingWebSpeechRef = useRef(false);

  useEffect(() => {
    return () => {
      try {
        const r = recognitionRef.current as { stop?: () => void } | null;
        r?.stop?.();
      } catch {
        /* ignore */
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
    };
  }, []);

  const parseTranscript = async (text: string) => {
    const t = text.trim();
    if (!t) {
      toast.error("কিছু শোনা যায়নি, আবার চেষ্টা করুন");
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-to-fordo", {
        body: { transcript: t },
      });
      if (error || !data) {
        toast.error(error?.message ?? "ফর্দ তৈরি করা যায়নি");
        return;
      }
      const lines = ((data as { lines?: string[] }).lines ?? []).filter((x) => x && x.trim());
      if (lines.length === 0) {
        toast.error("ফর্দে কোন পণ্য খুঁজে পাওয়া যায়নি");
        return;
      }
      onLines(lines);
      toast.success(`${lines.length} টি পণ্য যোগ হয়েছে`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const startWebSpeech = (): boolean => {
    type SR = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: (e: { error?: string }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return false;
    try {
      const rec = new Ctor();
      rec.lang = "bn-BD";
      rec.continuous = true;
      rec.interimResults = false;
      transcriptRef.current = "";
      rec.onresult = (e) => {
        for (let i = 0; i < e.results.length; i++) {
          const alt = e.results[i][0];
          if (alt?.transcript) transcriptRef.current += alt.transcript + " ";
        }
      };
      rec.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          toast.error(`Voice error: ${e.error ?? "unknown"}`);
        }
      };
      rec.onend = () => {
        setRecording(false);
        const t = transcriptRef.current.trim();
        if (t) void parseTranscript(t);
      };
      rec.start();
      recognitionRef.current = rec;
      usingWebSpeechRef.current = true;
      setRecording(true);
      return true;
    } catch {
      return false;
    }
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        setProcessing(true);
        try {
          // base64 encode
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const { data, error } = await supabase.functions.invoke("voice-to-fordo", {
            body: { audio_base64: b64, mime_type: blob.type },
          });
          if (error || !data) {
            toast.error(error?.message ?? "Audio process failed");
            return;
          }
          const lines = ((data as { lines?: string[] }).lines ?? []).filter((x) => x && x.trim());
          if (lines.length === 0) {
            toast.error("ফর্দে কোন পণ্য খুঁজে পাওয়া যায়নি");
            return;
          }
          onLines(lines);
          toast.success(`${lines.length} টি পণ্য যোগ হয়েছে`);
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setProcessing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      usingWebSpeechRef.current = false;
      setRecording(true);
    } catch (e) {
      toast.error("মাইক্রোফোন অনুমতি প্রয়োজন");
      console.error(e);
    }
  };

  const start = async () => {
    if (recording || processing) return;
    if (startWebSpeech()) return;
    await startMediaRecorder();
  };

  const stop = () => {
    if (usingWebSpeechRef.current) {
      try {
        (recognitionRef.current as { stop?: () => void } | null)?.stop?.();
      } catch {
        /* ignore */
      }
    } else {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <Button
      type="button"
      onClick={recording ? stop : start}
      disabled={processing}
      variant={recording ? "destructive" : "default"}
      className={`h-12 w-full text-base font-semibold ${className ?? ""}`}
    >
      {processing ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> ফর্দ তৈরি হচ্ছে…
        </>
      ) : recording ? (
        <>
          <Square className="mr-2 h-5 w-5 animate-pulse" /> থামান (কথা শেষ)
        </>
      ) : (
        <>
          <Mic className="mr-2 h-5 w-5" /> 🎤 কথা বলে ফর্দ বানান
        </>
      )}
    </Button>
  );
}