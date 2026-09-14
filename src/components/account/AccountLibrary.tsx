"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import { accountRequest } from "@/lib/account-client";
import type { AccountBracket } from "@/lib/bracket-document";
import { getCurrentBracket, getSavedBrackets } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export function AccountLibrary() {
  const { userId } = useAuth();
  return <Library key={userId ?? "signed-out"} />;
}

function Library() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(0, Math.min(10000, Number(params.get("page")) || 0));
  const [data, setData] = useState<{ brackets: AccountBracket[]; hasMore: boolean } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    accountRequest<{ brackets: AccountBracket[]; hasMore: boolean }>(
      `/api/brackets?page=${page}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [page, refresh]);

  async function importBrowser() {
    if (
      !window.confirm(
        "Import this browser’s guest brackets into your account? Only import picks that belong to you. Existing account saves will not be overwritten.",
      )
    )
      return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const current = getCurrentBracket();
      const saves = getSavedBrackets().map((saved) => saved.state);
      if (current) saves.push(current);
      const unique = new Map(saves.map((state) => [state.id, state]));
      let imported = 0;
      let failed = 0;
      for (const state of unique.values()) {
        try {
          await accountRequest(
            "/api/brackets",
            "POST",
            { seasonYear: PLAYOFF_SEASON_YEAR, state },
            undefined,
            userId,
          );
          imported++;
        } catch {
          failed++;
        }
      }
      setNotice(
        `${imported} bracket${imported === 1 ? "" : "s"} imported or already saved.${failed ? ` ${failed} could not be imported. Retry after checking the connection and season.` : ""} Browser originals were kept.`,
      );
      setRefresh((value) => value + 1);
    } catch {
      setError("Unable to read this browser’s saved brackets. Your account saves are unchanged.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(saved: AccountBracket) {
    if (
      !window.confirm(
        `Delete “${saved.state.name || "Untitled bracket"}”? Any shared link will stop working. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await accountRequest(
        `/api/brackets/${saved.id}`,
        "DELETE",
        { revision: saved.revision },
        undefined,
        userId,
      );
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delete failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button asChild className="min-h-11">
          <Link href="/brackets/new">New playoff bracket</Link>
        </Button>
        <Button variant="outline" className="min-h-11" disabled={busy} onClick={importBrowser}>
          {busy && (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}{" "}
          Import browser saves
        </Button>
      </div>
      <p className="text-sm text-gray-400">
        Private by default. Saved to your account across devices. The editor currently supports the{" "}
        {PLAYOFF_SEASON_YEAR} postseason.
      </p>
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-green-900 bg-green-950/30 p-4 text-green-200"
        >
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-900 p-4 text-red-200">
          <p>{error}</p>
          <Button className="mt-2 min-h-11" onClick={() => setRefresh((value) => value + 1)}>
            Retry
          </Button>
        </div>
      )}
      {!data && !error && <p role="status">Loading saved brackets…</p>}
      {data?.brackets.length === 0 && (
        <div className="rounded-xl border border-gray-800 p-8">
          <h2 className="text-xl font-semibold">Your picks start here</h2>
          <p className="mt-2 text-gray-400">
            Create a bracket, or import picks you saved in this browser before signing in.
          </p>
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {data?.brackets.map((saved) => (
          <li key={saved.id} className="min-w-0 rounded-xl border border-gray-800 bg-gray-950 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 break-words text-lg font-semibold">
                {saved.state.name || "Untitled bracket"}
              </h2>
              <span className="shrink-0 text-xs text-gray-400">
                {saved.shareToken ? "Shared" : "Private"}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {saved.seasonYear} playoffs · {saved.state.isComplete ? "Complete" : "In progress"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(saved.updatedAt))}
            </p>
            <div className="mt-4 flex gap-3">
              <Button asChild className="min-h-11">
                <Link href={`/brackets/${saved.id}/edit`}>Open bracket</Link>
              </Button>
              <Button
                variant="ghost"
                className="min-h-11 text-red-300"
                disabled={busy}
                onClick={() => remove(saved)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <nav aria-label="Saved bracket pages" className="flex items-center gap-4">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={page === 0 || !data}
          onClick={() => router.push(`/brackets?page=${page - 1}`)}
        >
          Previous
        </Button>
        <span className="text-sm tabular-nums">Page {page + 1}</span>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={!data?.hasMore}
          onClick={() => router.push(`/brackets?page=${page + 1}`)}
        >
          Next
        </Button>
      </nav>
    </div>
  );
}
