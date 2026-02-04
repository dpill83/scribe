"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid password");
        return;
      }
      router.refresh();
      router.push("/");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow"
      >
        <h1 className="text-xl font-semibold mb-4">Scribe</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Enter the shared password to edit.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 mb-2"
          autoFocus
          disabled={loading}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
        )}
        <button
          type="submit"
          className="w-full py-2 rounded bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
