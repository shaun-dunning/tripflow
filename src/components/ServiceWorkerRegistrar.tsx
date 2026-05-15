"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      })
      .catch(() => { /* non-fatal */ });

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("daywave-"))
              .map((key) => caches.delete(key))
          )
        )
        .catch(() => { /* non-fatal */ });
    }
  }, []);
  return null;
}
