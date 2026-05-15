"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Register with updateViaCache: "none" so the browser always
    // byte-checks sw.js rather than serving a stale cached copy.
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => { /* non-fatal — app works without SW */ });
  }, []);
  return null;
}
