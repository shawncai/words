import assert from "node:assert/strict";
import { test } from "node:test";
import { exportFileName, isShareCancelled } from "./files";

test("export names cannot escape the cache directory or select executable extensions", () => {
  assert.equal(exportFileName("word-atlas-thursday.png"), "word-atlas-thursday.png");
  assert.equal(exportFileName("word-atlas-backup-2026-11-11.json"), "word-atlas-backup-2026-11-11.json");
  const hostile = exportFileName("word-atlas-../../Documents/secret.png");
  assert.ok(!hostile.includes("/") && !hostile.includes(".."));
  assert.ok(exportFileName(`word-atlas-${"x".repeat(500)}.png`).length <= 144);
  assert.throws(() => exportFileName("word-atlas-export.html"));
  assert.throws(() => exportFileName("../../secret.json"));
});

test("only explicit native and Web Share cancellation is silent", () => {
  assert.equal(isShareCancelled(new DOMException("The user cancelled", "AbortError")), true);
  assert.equal(isShareCancelled(new Error("Share canceled")), true);
  assert.equal(isShareCancelled(new Error("Share cancelled")), true);
  assert.equal(isShareCancelled(new Error("Permission denied")), false);
  assert.equal(isShareCancelled(new Error("Can't share while sharing is in progress")), false);
  assert.equal(isShareCancelled(null), false);
});
