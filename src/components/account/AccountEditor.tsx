"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { GameDialogProvider } from "@/contexts/GameDialogContext";
import { BracketProvider, useBracket } from "@/contexts/BracketContext";
import { Bracket } from "@/components/bracket/Bracket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import { createInitialBracket } from "@/lib/playoff-rules";
import { accountRequest, AccountRequestError } from "@/lib/account-client";
import type { AccountBracket } from "@/lib/bracket-document";
import type { BracketState } from "@/types";

export function AccountEditor({ id }: { id?: string }) {
  const { userId } = useAuth();
  return <EditorLoader key={`${userId}:${id ?? "new"}`} id={id} />;
}

function EditorLoader({ id }: { id?: string }) {
  const { user } = useUser();
  const [saved, setSaved] = useState<AccountBracket | null>(null);
  const [initial] = useState(() =>
    createInitialBracket(user?.firstName ?? user?.username ?? "Football fan"),
  );
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setError("");
    accountRequest<AccountBracket>(`/api/brackets/${id}`, "GET", undefined, controller.signal)
      .then(setSaved)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [id, retry]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <Button className="mt-4 min-h-11" onClick={() => setRetry((value) => value + 1)}>
          Retry
        </Button>
        <Link className="ml-4 underline" href="/brackets">
          My brackets
        </Link>
      </div>
    );
  if (id && !saved) return <p role="status">Loading bracket…</p>;
  return (
    <BracketProvider initialBracket={saved?.state ?? initial} persist={false}>
      <GameDialogProvider>
        <Editor initial={saved} />
      </GameDialogProvider>
    </BracketProvider>
  );
}

function pickFingerprint(state: BracketState) {
  const { liveResults: _liveResults, updatedAt: _updatedAt, ...picks } = state;
  return JSON.stringify(picks);
}

function Editor({ initial }: { initial: AccountBracket | null }) {
  const { userId } = useAuth();
  const router = useRouter();
  const { bracket, setBracketName, setSubtitle, setUserName, loadBracket } = useBracket();
  const [saved, setSaved] = useState(initial);
  const [savedFingerprint, setSavedFingerprint] = useState(() => pickFingerprint(bracket));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dirty = pickFingerprint(bracket) !== savedFingerprint;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (
        link &&
        !event.ctrlKey &&
        !event.metaKey &&
        !window.confirm("Leave without saving your bracket changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function save(copy = false) {
    setBusy(true);
    setError("");
    setNotice("");
    const snapshot = { ...bracket, id: copy ? nanoid() : bracket.id };
    try {
      const result = await accountRequest<AccountBracket>(
        saved && !copy ? `/api/brackets/${saved.id}` : "/api/brackets",
        saved && !copy ? "PUT" : "POST",
        {
          seasonYear: PLAYOFF_SEASON_YEAR,
          state: snapshot,
          ...(saved && !copy ? { revision: saved.revision } : {}),
        },
        undefined,
        userId,
      );
      setSaved(result);
      setSavedFingerprint(pickFingerprint(result.state));
      loadBracket(result.state);
      setConflict(false);
      setNotice("Saved to your account.");
      if (!saved || copy) router.replace(`/brackets/${result.id}/edit`);
    } catch (reason) {
      setConflict(reason instanceof AccountRequestError && reason.status === 409);
      setError(
        reason instanceof Error ? reason.message : "Save failed. Your edits are still here.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{initial ? "Edit bracket" : "New bracket"}</h1>
          <p className="mt-1 text-gray-400">
            {PLAYOFF_SEASON_YEAR} postseason · Private until shared
          </p>
        </div>
        <Link href="/brackets" className="inline-flex min-h-11 items-center rounded px-3 underline">
          My brackets
        </Link>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="mb-8 grid gap-4 rounded-xl border border-gray-800 bg-gray-950 p-5 sm:grid-cols-2"
      >
        <div>
          <Label htmlFor="account-bracket-name">Bracket name</Label>
          <Input
            id="account-bracket-name"
            name="bracketName"
            maxLength={100}
            value={bracket.name}
            onChange={(event) => setBracketName(event.target.value)}
            placeholder="My championship picks…"
            className="mt-2 min-h-11 text-base"
          />
        </div>
        <div>
          <Label htmlFor="account-display-name">Public display name</Label>
          <Input
            id="account-display-name"
            name="displayName"
            autoComplete="nickname"
            maxLength={80}
            value={bracket.userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="Football fan…"
            className="mt-2 min-h-11 text-base"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="account-subtitle">Subtitle (optional)</Label>
          <Input
            id="account-subtitle"
            name="subtitle"
            maxLength={200}
            value={bracket.subtitle ?? ""}
            onChange={(event) => setSubtitle(event.target.value || null)}
            placeholder="A few bold predictions…"
            className="mt-2 min-h-11 text-base"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy} className="min-h-11">
            {busy && (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            Save bracket
          </Button>
          <span className="text-sm text-gray-400" role="status">
            {dirty ? "Unsaved changes" : notice || (saved ? "Saved" : "Not yet saved")}
          </span>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <p ref={errorRef} tabIndex={-1} role="alert" className="text-red-300">
              {error}
            </p>
            {conflict && (
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => save(true)}
                >
                  Save as a copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    if (window.confirm("Discard these edits and reload the saved bracket?"))
                      window.location.reload();
                  }}
                >
                  Reload saved version
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
      <div className="max-w-full overflow-x-auto pb-8">
        <Bracket />
      </div>
    </div>
  );
}
