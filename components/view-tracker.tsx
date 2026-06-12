"use client";

import { useEffect, useRef } from "react";

export function ViewTracker({ movieId }: { movieId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `mil:view:${movieId}:${todayKey}`;

    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        return;
      }
    } catch {
      // Ignore storage access errors and fall back to request dedupe on the server.
    }

    // Small delay so we don't block immediate rendering or track instant bounces
    const timer = setTimeout(() => {
      fetch("/api/analytics/view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movieId }),
      })
        .then((response) => {
          if (response.ok) {
            try {
              sessionStorage.setItem(storageKey, "1");
            } catch {
              // Ignore storage access errors and rely on cookie dedupe.
            }
          }
        })
        .catch((err) => console.error("Failed to track view:", err));
    }, 1500);

    return () => clearTimeout(timer);
  }, [movieId]);

  return null;
}
