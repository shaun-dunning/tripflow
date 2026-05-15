"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FAMILY_INVITE_KEY, PREVIEW_INVITE_KEY, TRIP_ID } from "@/lib/tripConfig";
import type { User } from "@supabase/supabase-js";

type MembershipStatus = "checking" | "member" | "preview" | "not-member";

export function useTripMembership(user: User | null, tripId = TRIP_ID) {
  const [status, setStatus] = useState<MembershipStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [hasFamilyInvite, setHasFamilyInvite] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkMembership() {
      setError(null);
      setHasFamilyInvite(typeof window !== "undefined" && localStorage.getItem(FAMILY_INVITE_KEY) === "1");

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
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .limit(1);

      if (cancelled) return;

      if (membershipError) {
        setError(membershipError.message);
        setStatus("not-member");
        return;
      }

      setStatus(data?.[0] ? "member" : "not-member");
    }

    void checkMembership();
    return () => { cancelled = true; };
  }, [user, tripId]);

  return {
    status,
    error,
    isChecking: status === "checking",
    isMember: status === "member",
    isPreview: status === "preview",
    isNotMember: status === "not-member",
    hasFamilyInvite,
  };
}
