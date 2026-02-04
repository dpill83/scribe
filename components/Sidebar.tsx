"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

function useAuthRedirect() {
  const router = useRouter();
  return useCallback(
    (res: Response) => {
      if (res.status === 401) router.push("/login");
    },
    [router]
  );
}

export interface PageNode {
  id: string;
  parentId: string | null;
  title: string;
  contentJson: string;
  sortOrder: number;
  children: PageNode[];
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const onAuthRequired = useAuthRedirect();
  const [tree, setTree] = useState<PageNode[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PageNode[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const selectedId = pathname?.startsWith("/page/")
    ? pathname.replace("/page/", "").split("/")[0]
    : null;

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `/api/pages?search=${encodeURIComponent(search.trim())}&flat=1`
        : "/api/pages";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (search.trim()) {
        setSearchResults(Array.isArray(data) ? data : []);
        setTree([]);
      } else {
        setTree(Array.isArray(data) ? data : []);
        setSearchResults(null);
      }
    } catch (e) {
      console.error(e);
      setTree([]);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const createPage = async (parentId?: string) => {
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          parentId ? { parentId, title: "Untitled" } : { title: "Untitled" }
        ),
      });
      onAuthRequired(res);
      if (!res.ok) throw new Error("Failed to create");
      const page = (await res.json()) as { id: string };
      await fetchTree();
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      router.push(`/page/${page.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goToPage = (id: string) => {
    router.push(`/page/${id}`);
  };

  function TreeNode({ node, depth = 0 }: { node: PageNode; depth?: number }) {
    const hasChildren = node.children?.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className="flex items-center gap-1 group min-h-8 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <button
            type="button"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className="w-5 h-5 shrink-0 flex items-center justify-center text-neutral-500"
            onClick={() => hasChildren && toggleExpand(node.id)}
          >
            {hasChildren ? (isExpanded ? "−" : "+") : " "}
          </button>
          <button
            type="button"
            className={`flex-1 text-left truncate text-sm py-1 px-1 rounded ${isSelected ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100" : ""}`}
            onClick={() => goToPage(node.id)}
          >
            {node.title || "Untitled"}
          </button>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 w-6 h-6 shrink-0 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-xs"
            onClick={() => createPage(node.id)}
            aria-label="Add subpage"
          >
            +
          </button>
        </div>
        {hasChildren && isExpanded &&
          node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-900 min-h-0">
      <div className="p-2 border-b border-neutral-200 dark:border-neutral-800">
        <input
          type="search"
          placeholder="Search pages..."
          className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="mt-2 w-full py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => createPage()}
        >
          New page
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <p className="text-sm text-neutral-500 p-2">Loading…</p>
        ) : searchResults !== null ? (
          <ul className="space-y-0.5">
            {searchResults.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  className="w-full text-left text-sm py-1.5 px-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 truncate"
                  onClick={() => {
                    goToPage(node.id);
                    setSearch("");
                  }}
                >
                  {node.title || "Untitled"}
                </button>
              </li>
            ))}
            {searchResults.length === 0 && (
              <p className="text-sm text-neutral-500 p-2">No pages found.</p>
            )}
          </ul>
        ) : (
          tree.map((node) => <TreeNode key={node.id} node={node} />)
        )}
        {!loading && tree.length === 0 && searchResults === null && (
          <p className="text-sm text-neutral-500 p-2">No pages yet.</p>
        )}
      </div>
    </aside>
  );
}
