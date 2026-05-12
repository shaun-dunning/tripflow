"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FAMILY_INVITE_KEY, TRIP_ID } from "@/lib/tripConfig";
import type { User } from "@supabase/supabase-js";

// When a user signs in, link their auth account to the "is_me" traveler row
// so RLS policies and real name/avatar work correctly.
async function linkUserToTrip(user: User) {
  // Check if already linked
  const { data: existing } = await supabase
    .from("travelers")
    .select("id")
    .eq("trip_id", TRIP_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return; // already linked

  // Find the unlinked "is_me" traveler and claim it
  const { data: unlinked } = await supabase
    .from("travelers")
    .select("id")
    .eq("trip_id", TRIP_ID)
    .eq("is_me", true)
    .is("user_id", null)
    .maybeSingle();

  if (unlinked) {
    const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "You";
    await supabase
      .from("travelers")
      .update({
        user_id: user.id,
        name: displayName,
      })
      .eq("id", unlinked.id);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user && localStorage.getItem(FAMILY_INVITE_KEY) === "1") {
        localStorage.removeItem(FAMILY_INVITE_KEY);
        void linkUserToTrip(data.user);
      }
      setLoading(false);
    });

    // Listen for sign in / sign out
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u && localStorage.getItem(FAMILY_INVITE_KEY) === "1") {
        localStorage.removeItem(FAMILY_INVITE_KEY);
        void linkUserToTrip(u);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, loading, signOut };
}
