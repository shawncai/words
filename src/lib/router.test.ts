import assert from "node:assert/strict";
import { test } from "node:test";

test("closing a word sheet removes its history entry, including after changing words", async () => {
  const listeners = new Map<string, () => void>();
  const entries: { hash: string; state: unknown }[] = [{ hash: "#/atlas", state: null }];
  let index = 0;
  const location = { hash: "#/atlas" };
  const history = {
    get state() { return entries[index].state; },
    pushState(state: unknown, _unused: string, hash: string) {
      entries.splice(index + 1);
      entries.push({ hash, state });
      index++;
      location.hash = hash;
    },
    replaceState(state: unknown, _unused: string, hash: string) {
      entries[index] = { hash, state };
      location.hash = hash;
    },
    back() {
      if (!index) return;
      location.hash = entries[--index].hash;
      listeners.get("hashchange")?.();
    },
  };
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: { addEventListener: (type: string, fn: () => void) => listeners.set(type, fn) } },
    location: { configurable: true, value: location },
    history: { configurable: true, value: history },
    document: { configurable: true, value: {} },
  });
  const { openWord, closeWord, currentLocation, go } = await import("./router");
  openWord("thursday");
  assert.equal(index, 1);
  openWord("friday");
  assert.equal(index, 1);
  assert.equal(currentLocation().word, "friday");
  closeWord();
  assert.equal(index, 0);
  assert.equal(currentLocation().word, null);
  assert.equal(currentLocation().route.page, "atlas");

  // A word opened directly from a link has no previous page to pop.
  go({ page: "atlas" }, "thursday", true);
  closeWord();
  assert.equal(index, 0);
  assert.equal(currentLocation().word, null);
  assert.equal(location.hash, "#/atlas");
});
