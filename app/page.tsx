"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "empty" | "redirect">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pages?flat=1", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setStatus("empty");
          return;
        }
        const pages = await res.json();
        const list = Array.isArray(pages) ? pages : [];
        if (list.length > 0) {
          router.replace(`/page/${list[0].id}`);
          return;
        }
        setStatus("empty");
      } catch {
        if (!cancelled) setStatus("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const createFirst = async () => {
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to create");
      const page = (await res.json()) as { id: string };
      router.push(`/page/${page.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">No pages yet.</p>
          <button
            type="button"
            onClick={createFirst}
            className="px-4 py-2 rounded bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:opacity-90"
          >
            New page
          </button>
        </div>
      </div>
    );
  }

  return null;
}
