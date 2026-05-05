import { useEffect, useRef, useState } from "react";

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Returns a real-time normalized (0..1) mic input level while `active` is true.
 * Uses Web Audio API AnalyserNode.
 *
 * IMPORTANT: On mobile (Android Chrome especially), opening a SECOND
 * getUserMedia stream while SpeechRecognition is already using the mic
 * causes the recognizer to repeatedly stop/restart ("mic on/off flicker").
 * On mobile we therefore skip the analyzer and return a synthesized
 * pulsing level so the UI still animates without owning the microphone.
 */
export function useMicLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fakeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!active) {
      // teardown
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (fakeTimerRef.current) {
        window.clearInterval(fakeTimerRef.current);
        fakeTimerRef.current = null;
      }
      analyserRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      setLevel(0);
      return;
    }

    // Mobile: don't open a second mic stream — fake a gentle pulse so the
    // recording indicator still animates without conflicting with the
    // SpeechRecognition mic capture.
    if (isMobileUA()) {
      const start = Date.now();
      fakeTimerRef.current = window.setInterval(() => {
        const t = (Date.now() - start) / 1000;
        // smooth 0.25 .. 0.75 sine pulse
        const v = 0.5 + 0.25 * Math.sin(t * 3);
        setLevel(v);
      }, 80);
      return () => {
        if (fakeTimerRef.current) {
          window.clearInterval(fakeTimerRef.current);
          fakeTimerRef.current = null;
        }
      };
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        src.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length) / 255;
          setLevel(Math.min(1, rms * 1.6));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLevel(0);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      analyserRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active]);

  return level;
}
