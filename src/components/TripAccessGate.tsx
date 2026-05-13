"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FAMILY_INVITE_KEY, INVITE_CODE, PREVIEW_INVITE_KEY } from "@/lib/tripConfig";

type TripAccessGateProps = {
  mode?: "not-member" | "preview";
  title?: string;
  message?: string;
  detail?: string | null;
  showJoinAction?: boolean;
};

export default function TripAccessGate({
  mode = "not-member",
  title,
  message,
  detail,
  showJoinAction = false,
}: TripAccessGateProps) {
  const router = useRouter();
  const isPreview = mode === "preview";

  async function signOut() {
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(FAMILY_INVITE_KEY);
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-2xl">
          {isPreview ? "✨" : "🔗"}
        </div>
        <h1 className="text-lg font-black text-slate-900">
          {title ?? (isPreview ? "Preview mode" : "Join this trip first")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {message ?? (isPreview
            ? "This profile is previewing TripFlow without joining Shaun's family trip."
            : "You are signed in, but this profile is not a traveler on the Maui family trip yet.")}
        </p>
        {detail && (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-400">
            {detail}
          </p>
        )}
        {showJoinAction ? (
          <button
            onClick={() => router.push(`/join/${INVITE_CODE}`)}
            className="mt-5 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white"
          >
            Join Maui Family Trip
          </button>
        ) : (
          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Invite required</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Ask the trip organizer for their invite link or code to join a private trip.
            </p>
          </div>
        )}
        <button
          onClick={signOut}
          className={`${showJoinAction ? "mt-2" : "mt-4"} w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600`}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
