-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parent_id" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "content_json" TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateIndex (optional, for parent lookups)
CREATE INDEX "Page_parent_id_idx" ON "Page"("parent_id");

-- Foreign key
-- SQLite supports FK via PRAGMA foreign_keys=ON; application can enforce
