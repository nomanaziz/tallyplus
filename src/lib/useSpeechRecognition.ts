import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

type Options = {
  lang?: string;
  silenceTimeoutMs?: number; // close after this much silence (after speech started)
  noSpeechTimeoutMs?: number; // close if no speech ever detected
  onFinal?: (text: string) => void;
  onClose?: () => void;
};

export function useSpeechRecognition(opts: Options = {}) {
  const {
    lang = "bn-BD",
    silenceTimeoutMs = 12000,
    noSpeechTimeoutMs = 15000,
    onFinal,
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
  const onCloseRef = useRef(onClose);
  onFinalRef.current = onFinal;
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
    clearTimers();
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Browser এ voice support নেই");
      return;
    }
    setError(null);
    setTranscript("");
    finalTextRef.current = "";

    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
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
          finalTextRef.current += (finalTextRef.current ? " " : "") + txt.trim();
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
        // expected; just stop
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission নেই");
      } else if (code !== "aborted") {
        setError(`Voice error: ${code}`);
      }
    };

    r.onend = () => {
      clearTimers();
      setListening(false);
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
  }, [lang, silenceTimeoutMs, noSpeechTimeoutMs, stop]);

  useEffect(() => {
    return () => {
      clearTimers();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
