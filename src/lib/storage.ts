import type { BracketState, SavedBracket } from "@/types";

const STORAGE_PREFIX = "nfl-bracket:";
const USER_KEY = `${STORAGE_PREFIX}user`;
const BRACKETS_KEY = `${STORAGE_PREFIX}brackets`;
const CURRENT_KEY = `${STORAGE_PREFIX}current`;

function storageKey(key: string, ownerId?: string): string {
  return ownerId ? `${key}:account:${ownerId}` : key;
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

// User storage
export function getStoredUser(): { name: string } | null {
  if (!isClient()) return null;
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(name: string): void {
  if (!isClient()) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ name }));
}

export function clearStoredUser(): void {
  if (!isClient()) return;
  localStorage.removeItem(USER_KEY);
}

// Saved brackets storage
export function getSavedBrackets(ownerId?: string): SavedBracket[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem(storageKey(BRACKETS_KEY, ownerId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBracket(bracket: BracketState, ownerId?: string): string {
  if (!isClient()) return bracket.id;

  const brackets = getSavedBrackets(ownerId);
  const existingIndex = brackets.findIndex((b) => b.id === bracket.id);

  const savedBracket: SavedBracket = {
    id: bracket.id,
    name: bracket.name,
    userName: bracket.userName,
    createdAt: bracket.createdAt,
    updatedAt: Date.now(),
    state: { ...bracket, updatedAt: Date.now() },
  };

  if (existingIndex >= 0) {
    brackets[existingIndex] = savedBracket;
  } else {
    brackets.push(savedBracket);
  }

  localStorage.setItem(storageKey(BRACKETS_KEY, ownerId), JSON.stringify(brackets));
  return bracket.id;
}

export function loadBracket(id: string, ownerId?: string): BracketState | null {
  const brackets = getSavedBrackets(ownerId);
  const saved = brackets.find((b) => b.id === id);
  return saved?.state || null;
}

export function deleteBracket(id: string, ownerId?: string): void {
  if (!isClient()) return;
  const brackets = getSavedBrackets(ownerId);
  const filtered = brackets.filter((b) => b.id !== id);
  localStorage.setItem(storageKey(BRACKETS_KEY, ownerId), JSON.stringify(filtered));
}

// Current session storage (auto-save)
export function getCurrentBracket(ownerId?: string): BracketState | null {
  if (!isClient()) return null;
  try {
    const data = localStorage.getItem(storageKey(CURRENT_KEY, ownerId));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveCurrentBracket(bracket: BracketState, ownerId?: string): void {
  if (!isClient()) return;
  localStorage.setItem(
    storageKey(CURRENT_KEY, ownerId),
    JSON.stringify({ ...bracket, updatedAt: Date.now() }),
  );
}

export function clearCurrentBracket(ownerId?: string): void {
  if (!isClient()) return;
  localStorage.removeItem(storageKey(CURRENT_KEY, ownerId));
}
