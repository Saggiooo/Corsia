"use client";

import { useEffect } from "react";

/** Registra il service worker: serve a far funzionare la spesa senza rete. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registrazione fallita: l'app resta usabile, solo senza offline
    });
  }, []);

  return null;
}
