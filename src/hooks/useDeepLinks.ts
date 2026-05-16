"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isNativeApp } from "@/lib/tripConfig";

// Handles deep links on iOS so that Supabase auth email redirects (magic links,
// password reset, sign-up confirmation) open back into the app instead of a browser.
// Only active when running inside the Capacitor native shell.
export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appUrlOpen", async ({ url }) => {
          // Supabase auth links carry tokens in the hash or code in the query string.
          if (!url.includes("access_token=") && !url.includes("code=") && !url.includes("type=")) return;

          // Normalize the custom scheme into a parseable HTTPS URL.
          const normalized = url
            .replace(/^app\.daywave:\/\//, "https://app.daywave/")
            .replace(/^app\.daywave:\//, "https://app.daywave/");

          try {
            const parsed = new URL(normalized);
            const hashParams = new URLSearchParams(parsed.hash.slice(1));
            const type = parsed.searchParams.get("type") ?? hashParams.get("type");
            const accessToken = parsed.searchParams.get("access_token") ?? hashParams.get("access_token");
            const refreshToken = parsed.searchParams.get("refresh_token") ?? hashParams.get("refresh_token");

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (!error) {
                if (type === "recovery") {
                  router.replace("/auth");
                } else {
                  router.replace("/");
                }
              }
            }
          } catch {
            // Malformed URL — ignore.
          }
        });
        cleanup = () => handle.remove();
      } catch {
        // @capacitor/app not available in web context.
      }
    }

    void setup();
    return () => { cleanup?.(); };
  }, [router]);
}
