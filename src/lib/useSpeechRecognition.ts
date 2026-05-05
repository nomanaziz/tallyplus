import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

type Options = {
  lang?: string;
  silenceTimeoutMs?: number; // close after this much silence (after speech started)
  noSpeechTimeoutMs?: number; // close if no speech ever detected
  continuous?: boolean;
  keepAlive?: boolean;
  onFinal?: (text: string) => void;
  /** Called every time the recognizer commits a final segment, in real time. */
  onSegment?: (text: string) => void;
  onClose?: () => void;
};

export function useSpeechRecognition(opts: Options = {}) {
  const {
    lang = "bn-BD",
    silenceTimeoutMs = 12000,
    noSpeechTimeoutMs = 15000,
    continuous = true,
    keepAlive = false,
    onFinal,
    onSegment,
    onClose,
  } = opts;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef<string>("");
  const silenceTimerRef = useRef<number | null>(null);
  const noSpeechTimerRef = useRef<number | null>(null);
  const onFinalRef = useRef(onFinal);
  const onSegmentRef = useRef(onSegment);
  const onCloseRef = useRef(onClose);
  const restartingRef = useRef(false);
  const manuallyStoppedRef = useRef(false);
  onFinalRef.current = onFinal;
  onSegmentRef.current = onSegment;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const clearTimers = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (noSpeechTimerRef.current) {
      window.clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    manuallyStoppedRef.current = true;
    clearTimers();
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("এই device-এ voice support নেই — Chrome (Android) ব্যবহার করুন");
      return;
    }
    // Pre-flight mic permission so mobile Chrome reliably shows the prompt
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      setError("Microphone permission নেই — অনুমতি দিন");
      return;
    }
    setError(null);
    setTranscript("");
    finalTextRef.current = "";
    manuallyStoppedRef.current = false;
    restartingRef.current = false;

    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = continuous;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setListening(true);
      // 10s no-speech timeout
      noSpeechTimerRef.current = window.setTimeout(() => {
        stop();
      }, noSpeechTimeoutMs);
    };

    r.onresult = (event: any) => {
      // clear no-speech timer once we have any audio result
      if (noSpeechTimerRef.current) {
        window.clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const seg = txt.trim();
          if (seg) {
            finalTextRef.current += (finalTextRef.current ? " " : "") + seg;
            if (onSegmentRef.current) onSegmentRef.current(seg);
          }
        } else {
          interim += txt;
        }
      }
      const combined = (finalTextRef.current + " " + interim).trim();
      setTranscript(combined);

      // reset silence timer — close after silence
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        stop();
      }, silenceTimeoutMs);
    };

    r.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "no-speech") {
        if (!keepAlive) {
          setError("কথা শোনা যায়নি — আরেকটু স্পষ্ট করে বলুন");
        }
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission নেই");
      } else if (code === "audio-capture") {
        setError("Microphone পাওয়া যাচ্ছে না — অন্য app microphone ব্যবহার করছে কি না দেখুন");
      } else if (code === "network") {
        setError("ভয়েস সার্ভিসে সংযোগ সমস্যা হচ্ছে — ইন্টারনেট বা Chrome speech service চেক করুন");
      } else if (code !== "aborted") {
        setError(`Voice error: ${code}`);
      }
    };

    r.onend = () => {
      clearTimers();
      setListening(false);
      if (keepAlive && !manuallyStoppedRef.current && !restartingRef.current) {
        restartingRef.current = true;
        window.setTimeout(() => {
          restartingRef.current = false;
          try {
            r.start();
          } catch {
            // ignore restart failure
          }
        }, 160);
        return;
      }
      const final = finalTextRef.current.trim();
      if (final && onFinalRef.current) onFinalRef.current(final);
      if (onCloseRef.current) onCloseRef.current();
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch (e) {
      setError((e as Error).message);
      setListening(false);
    }
  }, [continuous, keepAlive, lang, silenceTimeoutMs, noSpeechTimeoutMs, stop]);

  useEffect(() => {
    return () => {
      clearTimers();
      manuallyStoppedRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
