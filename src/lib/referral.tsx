import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "tp_aff_ref";
const KEY_TS = "tp_aff_ref_ts";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type Ctx = {
  code: string | null;
  setCode: (c: string | null) => void;
  validate: (code: string) => Promise<{ ok: boolean; affiliate_id?: string; full_name?: string }>;
};

const RefCtx = createContext<Ctx>({
  code: null,
  setCode: () => {},
  validate: async () => ({ ok: false }),
});

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ts = Number(localStorage.getItem(KEY_TS) || 0);
    if (!ts || Date.now() - ts > TTL_MS) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY_TS);
      return null;
    }
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function RefCaptureProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) {
      const norm = ref.trim().toUpperCase();
      try {
        localStorage.setItem(KEY, norm);
        localStorage.setItem(KEY_TS, String(Date.now()));
      } catch (err) { void err; }
      setCodeState(norm);
    } else {
      setCodeState(readStored());
    }
  }, []);

  const setCode = (c: string | null) => {
    if (typeof window === "undefined") return;
    if (c) {
      const norm = c.trim().toUpperCase();
      try {
        localStorage.setItem(KEY, norm);
        localStorage.setItem(KEY_TS, String(Date.now()));
      } catch (err) { void err; }
      setCodeState(norm);
    } else {
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(KEY_TS);
      } catch (err) { void err; }
      setCodeState(null);
    }
  };

  const validate = async (c: string) => {
    const norm = c.trim().toUpperCase();
    if (!norm) return { ok: false };
    const { data } = await supabase
      .from("affiliates")
      .select("id,full_name,status")
      .eq("referral_code", norm)
      .maybeSingle();
    if (!data || data.status !== "active") return { ok: false };
    return { ok: true, affiliate_id: data.id, full_name: data.full_name };
  };

  return <RefCtx.Provider value={{ code, setCode, validate }}>{children}</RefCtx.Provider>;
}

export function useReferral() { return useContext(RefCtx); }

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}