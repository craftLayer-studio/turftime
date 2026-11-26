"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Fetch JSON from `url` now and every `intervalMs` while the tab is visible. `refresh` reloads at once. */
export function usePoll<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!alive) return;
        if (res.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (res.ok) {
          setData(json as T);
          setError(null);
        } else {
          setError(json.error ?? "Request failed");
        }
      } catch {
        if (alive) setError("Connection lost. Retrying...");
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, intervalMs, tick, router]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, refresh };
}
