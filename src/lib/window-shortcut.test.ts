import test from "node:test";
import assert from "node:assert/strict";
import {
  isFunctionKeyToken,
  isToggleWindowShortcut,
  matchesShortcutEvent,
} from "./window-shortcut";

test("isFunctionKeyToken identifies F1 through F12 case-insensitively", () => {
  assert.equal(isFunctionKeyToken("f9"), true);
  assert.equal(isFunctionKeyToken("F12"), true);
  assert.equal(isFunctionKeyToken("f1"), true);
  assert.equal(isFunctionKeyToken("f13"), false);
  assert.equal(isFunctionKeyToken("a"), false);
});

test("matchesShortcutEvent matches single F9 press without extra modifiers", () => {
  assert.equal(matchesShortcutEvent({ key: "F9" }, "f9"), true);
  assert.equal(
    matchesShortcutEvent({ key: "F9", ctrlKey: true }, "f9"),
    false
  );
  assert.equal(
    matchesShortcutEvent({ key: "F9", shiftKey: true }, "f9"),
    false
  );
});

test("matchesShortcutEvent matches modifier combos like ctrl+backslash and cmd+shift+d", () => {
  assert.equal(
    matchesShortcutEvent({ key: "\\", ctrlKey: true }, "ctrl+backslash"),
    true
  );
  assert.equal(
    matchesShortcutEvent(
      { key: "d", metaKey: true, shiftKey: true },
      "cmd+shift+d"
    ),
    true
  );
  assert.equal(
    matchesShortcutEvent({ key: "d", metaKey: true }, "cmd+shift+d"),
    false
  );
});

test("isToggleWindowShortcut handles F9 default, legacy defaults, disabled state, and custom overrides", () => {
  assert.equal(isToggleWindowShortcut({ key: "F9" }, undefined), true);
  assert.equal(
    isToggleWindowShortcut({ key: "F9" }, { key: "f9", enabled: true }),
    true
  );
  assert.equal(
    isToggleWindowShortcut(
      { key: "F9" },
      { key: "ctrl+backslash", enabled: true }
    ),
    true
  );
  assert.equal(
    isToggleWindowShortcut({ key: "F9" }, { key: "f9", enabled: false }),
    false
  );
  assert.equal(
    isToggleWindowShortcut(
      { key: "F9" },
      { key: "ctrl+shift+h", enabled: true }
    ),
    false
  );
  assert.equal(
    isToggleWindowShortcut(
      { key: "H", ctrlKey: true, shiftKey: true },
      { key: "ctrl+shift+h", enabled: true }
    ),
    true
  );
});
