export interface ShortcutKeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface ToggleWindowBindingLike {
  key?: string;
  enabled?: boolean;
}

const LEGACY_TOGGLE_DEFAULT_KEYS = new Set([
  "cmd+backslash",
  "ctrl+backslash",
]);

const KEY_ALIASES: Record<string, string> = {
  " ": "space",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  escape: "esc",
  enter: "return",
  "\\": "backslash",
  "/": "slash",
  ",": "comma",
  ".": "period",
  "-": "minus",
  "=": "equal",
  "+": "plus",
  "[": "bracketleft",
  "]": "bracketright",
  ";": "semicolon",
  "'": "quote",
  "`": "grave",
};

export function isFunctionKeyToken(token: string): boolean {
  return /^f([1-9]|1[0-2])$/i.test(token.trim());
}

export function normalizeEventMainKey(key: string): string {
  const lower = (key || "").toLowerCase();
  return KEY_ALIASES[lower] ?? lower;
}

export function matchesShortcutEvent(
  event: ShortcutKeyEventLike,
  bindingKey: string
): boolean {
  const normalizedBinding = (bindingKey || "").trim().toLowerCase();
  if (!normalizedBinding) return false;

  const parts = normalizedBinding
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;

  const expectedCtrlOrCmd =
    parts.includes("ctrl") || parts.includes("cmd");
  const expectedAlt = parts.includes("alt");
  const expectedShift = parts.includes("shift");
  const nonModifierParts = parts.filter(
    (part) => !["ctrl", "cmd", "alt", "shift"].includes(part)
  );

  if (nonModifierParts.length !== 1) return false;

  const expectedKey = nonModifierParts[0];
  const actualKey = normalizeEventMainKey(event.key);
  const actualCtrlOrCmd = Boolean(event.ctrlKey || event.metaKey);
  const actualAlt = Boolean(event.altKey);
  const actualShift = Boolean(event.shiftKey);

  return (
    actualKey === expectedKey &&
    actualCtrlOrCmd === expectedCtrlOrCmd &&
    actualAlt === expectedAlt &&
    actualShift === expectedShift
  );
}

export function isToggleWindowShortcut(
  event: ShortcutKeyEventLike,
  binding?: ToggleWindowBindingLike | null
): boolean {
  if (binding?.enabled === false) {
    return false;
  }

  const configuredKey = (binding?.key || "f9").trim().toLowerCase();
  if (matchesShortcutEvent(event, configuredKey)) {
    return true;
  }

  // Keep F9 working seamlessly even if older localStorage had ctrl+backslash / cmd+backslash
  if (LEGACY_TOGGLE_DEFAULT_KEYS.has(configuredKey)) {
    return matchesShortcutEvent(event, "f9");
  }

  return false;
}
