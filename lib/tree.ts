import type { Page } from "@prisma/client/edge";

export interface PageNode extends Page {
  children: PageNode[];
}

export function buildTree(pages: Page[]): PageNode[] {
  const byId = new Map<string, PageNode>();
  for (const p of pages) {
    byId.set(p.id, { ...p, children: [] });
  }
  const roots: PageNode[] = [];
  for (const p of Array.from(byId.values())) {
    const node = p;
    if (p.parentId == null) {
      roots.push(node);
    } else {
      const parent = byId.get(p.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  for (const r of roots) {
    r.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  return roots;
}
