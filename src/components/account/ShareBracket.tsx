"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountRequest } from "@/lib/account-client";
import type { AccountBracket } from "@/lib/bracket-document";

export function ShareBracket({
  saved,
  dirty,
  saving,
  onChange,
  onBusyChange,
}: {
  saved: AccountBracket;
  dirty: boolean;
  saving: boolean;
  onBusyChange: (busy: boolean) => void;
  onChange: (saved: AccountBracket) => void;
}) {
  const { userId } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const path = saved.shareToken ? `/s/${saved.shareToken}` : null;
  const url = path && typeof window !== "undefined" ? `${window.location.origin}${path}` : "";
  async function changeSharing(remove = false) {
    if (busy || saving) return;
    if (
      !window.confirm(
        remove
          ? "Stop sharing? Anyone with this link will lose access. A future shared link will have a new address."
          : "Publish these saved picks, bracket name, subtitle, and display name? Anyone with the link can view them. You can revoke access later.",
      )
    )
      return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setMessage("");
    try {
      const result = await accountRequest<AccountBracket>(
        `/api/brackets/${saved.id}/share`,
        remove ? "DELETE" : "POST",
        { revision: saved.revision },
        undefined,
        userId,
      );
      onChange(result);
      setMessage(
        remove
          ? "Sharing stopped. The old link is no longer available."
          : "Your saved picks are published. Copy the link below.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sharing failed. Please retry.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage("Select and copy the link below.");
    }
  }
  return (
    <section
      aria-labelledby="share-heading"
      className="mb-8 space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-5"
    >
      <h2 id="share-heading" className="text-lg font-semibold">
        Share with friends
      </h2>
      <p className="text-sm text-gray-400">
        {path
          ? "Your link shows the last published snapshot. Private edits stay private until you publish again."
          : "This bracket is private. Publish a read-only snapshot when you’re ready."}
      </p>
      {dirty && <p className="text-sm text-amber-200">Save your changes before publishing.</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={busy || saving || dirty}
          className="min-h-11"
          onClick={() => changeSharing()}
        >
          {busy && (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {path ? "Publish saved changes" : "Create share link"}
        </Button>
        {path && (
          <>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={path}>View shared bracket</Link>
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 text-red-300"
              disabled={busy || saving}
              onClick={() => changeSharing(true)}
            >
              Stop sharing
            </Button>
          </>
        )}
      </div>
      {path && (
        <div className="flex gap-2">
          <Input
            readOnly
            aria-label="Share link"
            value={url}
            onFocus={(event) => event.target.select()}
            className="min-w-0 min-h-11 text-base"
          />
          <Button variant="outline" className="min-h-11" onClick={copy}>
            Copy link
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm text-green-200">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
