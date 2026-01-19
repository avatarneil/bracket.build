import type { BracketState, SavedBracket } from "@/types";

const STORAGE_PREFIX = "nfl-bracket:";
const USER_KEY = `${STORAGE_PREFIX}user`;
const BRACKETS_KEY = `${STORAGE_PREFIX}brackets`;
const CURRENT_KEY = `${STORAGE_PREFIX}current`;

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
export function getSavedBrackets(): SavedBracket[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem(BRACKETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBracket(bracket: BracketState): string {
  if (!isClient()) return bracket.id;

  const brackets = getSavedBrackets();
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

  localStorage.setItem(BRACKETS_KEY, JSON.stringify(brackets));
  return bracket.id;
}

export function loadBracket(id: string): BracketState | null {
  const brackets = getSavedBrackets();
  const saved = brackets.find((b) => b.id === id);
  return saved?.state || null;
}

export function deleteBracket(id: string): void {
  if (!isClient()) return;
  const brackets = getSavedBrackets();
  const filtered = brackets.filter((b) => b.id !== id);
  localStorage.setItem(BRACKETS_KEY, JSON.stringify(filtered));
}

// Current session storage (auto-save)
export function getCurrentBracket(): BracketState | null {
  if (!isClient()) return null;
  try {
    const data = localStorage.getItem(CURRENT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveCurrentBracket(bracket: BracketState): void {
  if (!isClient()) return;
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ ...bracket, updatedAt: Date.now() }));
}

export function clearCurrentBracket(): void {
  if (!isClient()) return;
  localStorage.removeItem(CURRENT_KEY);
}
