"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PREVIEW_INVITE_KEY, TRIP_ID } from "@/lib/tripConfig";
import type { User } from "@supabase/supabase-js";

type MembershipStatus = "checking" | "member" | "preview" | "not-member";

export function useTripMembership(user: User | null) {
  const [status, setStatus] = useState<MembershipStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkMembership() {
      setError(null);

      if (typeof window !== "undefined" && localStorage.getItem(PREVIEW_INVITE_KEY) === "1") {
        setStatus("preview");
        return;
      }

      if (!user) {
        setStatus("checking");
        return;
      }

      const { data, error: membershipError } = await supabase
        .from("travelers")
        .select("id")
        .eq("trip_id", TRIP_ID)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError) {
        setError(membershipError.message);
        setStatus("not-member");
        return;
      }

      setStatus(data ? "member" : "not-member");
    }

    void checkMembership();
    return () => { cancelled = true; };
  }, [user]);

  return {
    status,
    error,
    isChecking: status === "checking",
    isMember: status === "member",
    isPreview: status === "preview",
    isNotMember: status === "not-member",
  };
}
