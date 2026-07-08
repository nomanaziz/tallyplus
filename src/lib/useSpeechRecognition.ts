import { getSpeechLocale } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

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

/** Mobile Chrome on Android stops the SpeechRecognition session every few
 * seconds regardless of `continuous`. Restarting too eagerly causes the
 * "mic on / off / on / off" flicker. We rate-limit restarts so the user
 * sees a single steady "listening" state. */
const MOBILE_RESTART_MIN_MS = 1200;

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function useSpeechRecognition(opts: Options = {}) {
  const {
    lang = getSpeechLocale(),
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
  const lastRestartAtRef = useRef<number>(0);
  const restartTimerRef = useRef<number | null>(null);
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
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
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
    // Pre-flight mic permission so mobile Chrome reliably shows the prompt.
    // IMPORTANT: stop the stream tracks BEFORE starting SpeechRecognition,
    // otherwise on Android the two getUserMedia owners conflict and the
    // recognizer keeps stopping ("mic on/off/on/off" flicker).
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      setError("Microphone permission নেই — অনুমতি দিন");
      return;
    }
    setError(null);
    setTranscript("");
    finalTextRef.current = "";
    manuallyStoppedRef.current = false;
    restartingRef.current = false;
    lastRestartAtRef.current = 0;

    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    // Mobile Chrome ignores `continuous` after a few seconds; we restart
    // ourselves on `onend`. Setting it false on mobile actually behaves
    // more predictably (single segment per session, then we restart).
    r.continuous = isMobileUA() ? false : continuous;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setListening(true);
      if (noSpeechTimeoutMs > 0) {
        noSpeechTimerRef.current = window.setTimeout(() => {
          stop();
        }, noSpeechTimeoutMs);
      }
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
      if (silenceTimeoutMs > 0) {
        silenceTimerRef.current = window.setTimeout(() => {
          stop();
        }, silenceTimeoutMs);
      }
    };

    r.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "no-speech") {
        if (!keepAlive) {
          setError("কথা শোনা যায়নি — আরেকটু স্পষ্ট করে বলুন");
        }
        // In keepAlive mode, "no-speech" is normal between phrases — just
        // let onend restart us.
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission নেই — ব্রাউজার সেটিংসে অনুমতি দিন");
        manuallyStoppedRef.current = true;
      } else if (code === "audio-capture") {
        setError("Microphone পাওয়া যাচ্ছে না — অন্য app microphone ব্যবহার করছে কি না দেখুন");
        manuallyStoppedRef.current = true;
      } else if (code === "network") {
        setError("ভয়েস সার্ভিসে সংযোগ সমস্যা — ইন্টারনেট চেক করুন");
      } else if (code === "aborted") {
        // benign — stop() was called
      } else {
        setError(`Voice error: ${code}`);
      }
    };

    r.onend = () => {
      clearTimers();
      if (keepAlive && !manuallyStoppedRef.current) {
        // Keep UI in "listening" state across the brief restart gap so the
        // user does NOT see the mic button flicker on mobile.
        restartingRef.current = true;
        const since = Date.now() - lastRestartAtRef.current;
        const minGap = isMobileUA() ? MOBILE_RESTART_MIN_MS : 200;
        const delay = Math.max(minGap - since, isMobileUA() ? 400 : 160);
        if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          restartingRef.current = false;
          if (manuallyStoppedRef.current) {
            setListening(false);
            const final = finalTextRef.current.trim();
            if (final && onFinalRef.current) onFinalRef.current(final);
            if (onCloseRef.current) onCloseRef.current();
            return;
          }
          lastRestartAtRef.current = Date.now();
          try {
            r.start();
          } catch {
            // start() throws if already running — safe to ignore.
          }
        }, delay);
        return;
      }
      setListening(false);
      const final = finalTextRef.current.trim();
      if (final && onFinalRef.current) onFinalRef.current(final);
      if (onCloseRef.current) onCloseRef.current();
    };

    recognitionRef.current = r;
    try {
      lastRestartAtRef.current = Date.now();
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
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
