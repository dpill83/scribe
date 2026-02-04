"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@/components/Editor";

export const runtime = "edge";

interface PageData {
  id: string;
  title: string;
  contentJson: string;
}

export default function PageView() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : null;
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || id === "new") {
      setLoading(false);
      if (id === "new") {
        (async () => {
          try {
            const res = await fetch("/api/pages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Untitled" }),
            });
            if (res.status === 401) {
              router.replace("/login");
              return;
            }
            if (!res.ok) throw new Error("Failed to create");
            const created = (await res.json()) as { id: string };
            router.replace(`/page/${created.id}`);
          } catch (e) {
            console.error(e);
            setLoading(false);
          }
        })();
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pages/${id}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setPage(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as { id: string; title?: string; contentJson?: string };
        setPage({
          id: data.id,
          title: data.title ?? "Untitled",
          contentJson: data.contentJson ?? '{"type":"doc","content":[]}',
        });
      } catch (e) {
        console.error(e);
        setPage(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const handleSave = useCallback(
    async (data: { title: string; contentJson: string }) => {
      if (!page?.id) return;
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to save");
      setPage((prev) =>
        prev ? { ...prev, title: data.title, contentJson: data.contentJson } : null
      );
    },
    [page?.id, router]
  );

  if (id === "new" || (id && loading && !page)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (notFound || (id && !loading && !page)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Page not found.</p>
      </div>
    );
  }

  if (!page) return null;

  return (
    <Editor
      pageId={page.id}
      initialTitle={page.title}
      initialContent={page.contentJson}
      onSave={handleSave}
    />
  );
}
