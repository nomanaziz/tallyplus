import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type ConsumerProfile = {
  id: string;
  name: string | null;
  phone: string | null;
};

export function useConsumerSession(): {
  user: User | null;
  profile: ConsumerProfile | null;
  isConsumer: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ConsumerProfile | null>(null);
  const [isConsumer, setIsConsumer] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getUser();
    const u = sess?.user ?? null;
    setUser(u);
    if (!u) {
      setProfile(null);
      setIsConsumer(false);
      setLoading(false);
      return;
    }
    // Check consumer_profiles existence (proxy for consumer role)
    const { data: prof } = await supabase
      .from("consumer_profiles")
      .select("id, name, phone")
      .eq("id", u.id)
      .maybeSingle();
    setProfile((prof as ConsumerProfile | null) ?? null);
    setIsConsumer(!!prof);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, profile, isConsumer, loading, refresh: load };
}