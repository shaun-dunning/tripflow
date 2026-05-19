"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound, Waves } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useActiveTrip } from "@/hooks/useActiveTrip";
import { registerPushNotifications, unregisterPushToken } from "@/lib/pushNotifications";
import {
  ACTIVE_TRIP_KEY,
  DEMO_TRIP_ID,
  FAMILY_INVITE_KEY,
  PREVIEW_INVITE_KEY,
  START_OWN_TRIP_KEY,
} from "@/lib/tripConfig";

type AppSessionControlsProps = {
  user: User;
};

export function firstName(user: User) {
  return user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "You";
}

export function initials(user: User) {
  const source = user.user_metadata?.full_name ?? user.email ?? "Y";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppSessionControls({ user }: AppSessionControlsProps) {
  const router = useRouter();
  const activeTrip = useActiveTrip(user);
  const [open, setOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isDemo = activeTrip.activeTripId === DEMO_TRIP_ID;

  useEffect(() => {
    if (activeTrip.activeTripId && !isDemo) {
      void registerPushNotifications(user.id, activeTrip.activeTripId);
    }
  }, [user.id, activeTrip.activeTripId, isDemo]);

  async function signOut(toAuth = true) {
    await unregisterPushToken(user.id);
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(FAMILY_INVITE_KEY);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    localStorage.removeItem(START_OWN_TRIP_KEY);
    await supabase.auth.signOut();
    if (toAuth) window.location.replace("/auth/");
  }

  async function startOwnTrip() {
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(FAMILY_INVITE_KEY);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    localStorage.setItem(START_OWN_TRIP_KEY, "1");
    setOpen(false);
    window.location.replace("/");
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      localStorage.clear();
      window.location.replace("/auth/");
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  function editTripProfile() {
    localStorage.setItem("daywave-open-profile", "1");
    setOpen(false);
    router.push("/chat");
  }

  return (
    <>
      {/* Demo mode indicator — left side, never conflicts with Ask AI */}
      {isDemo && (
        <button
          onClick={() => router.push("/join/DEMO")}
          className="fixed left-4 bottom-[calc(max(10px,env(safe-area-inset-bottom))+5.8rem)] z-40 flex items-center gap-1.5 rounded-full border border-white/70 bg-white/86 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        >
          <Waves className="size-3.5 text-sky-600" />
          <span>Sample trip</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/28 px-3 pb-3 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-5 pt-4">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                  {initials(user)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">{firstName(user)}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                </div>
                {isDemo && (
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-sky-700">
                    Sample
                  </span>
                )}
              </div>

              {isDemo && (
                <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                  <p className="text-xs font-black text-slate-900">You&apos;re exploring a sample trip.</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Your profile can look around without affecting the organizer&apos;s real trip.
                  </p>
                  <button
                    onClick={startOwnTrip}
                    className="mt-3 w-full rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white"
                  >
                    Start my own trip
                  </button>
                </div>
              )}

              <button
                onClick={editTripProfile}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white"
              >
                <UserRound className="size-4" />
                Edit trip profile
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => void signOut(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700"
                >
                  <UserRound className="size-4" />
                  Switch account
                </button>
                <button
                  onClick={() => void signOut(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-500"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>

              <button
                onClick={() => setDeleteConfirm(true)}
                className="mt-2 w-full rounded-2xl border border-red-100 bg-white py-3 text-sm font-bold text-red-400"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/28 px-3 pb-3 backdrop-blur-[2px]"
          onClick={() => { if (!deleting) setDeleteConfirm(false); }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-6 pt-5">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-center text-base font-black text-slate-900">Delete your account?</h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
                This permanently deletes your profile, all trip data, messages, and cannot be undone.
              </p>
              <button
                onClick={() => void deleteAccount()}
                disabled={deleting}
                className="mt-5 w-full rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
