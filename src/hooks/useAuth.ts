"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

let cachedUser: User | null = null;
let cachedLoading = true;
let initialized = false;
const subscribers = new Set<(state: { user: User | null; loading: boolean }) => void>();

function publish() {
  const state = { user: cachedUser, loading: cachedLoading };
  subscribers.forEach((subscriber) => subscriber(state));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(cachedLoading);

  useEffect(() => {
    const subscriber = (state: { user: User | null; loading: boolean }) => {
      setUser(state.user);
      setLoading(state.loading);
    };
    subscribers.add(subscriber);

    if (!initialized) {
      initialized = true;
      supabase.auth.getUser().then(({ data }) => {
        cachedUser = data.user;
        cachedLoading = false;
        publish();
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        cachedUser = session?.user ?? null;
        cachedLoading = false;
        publish();
      });
    }

    subscriber({ user: cachedUser, loading: cachedLoading });

    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, loading, signOut };
}
