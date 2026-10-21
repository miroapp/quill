import assert from "node:assert/strict";
import { test } from "node:test";
import { nextVersionOnConflict } from "./publish-version.mjs";

test("prerelease conflict bumps the index", () => {
  assert.equal(nextVersionOnConflict("2.0.7-fix.9"), "2.0.7-fix.10");
});

test("stable conflict bumps the patch", () => {
  assert.equal(nextVersionOnConflict("2.0.7"), "2.0.8");
});

test("a version outside 2.0.N cannot be incremented", () => {
  assert.throws(
    () => nextVersionOnConflict("0.0.0-stage"),
    /Cannot increment version 0\.0\.0-stage/,
  );
});
