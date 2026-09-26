import assert from "node:assert/strict";
import test from "node:test";
import { clozeAnswer, clozePrompt, hasCloze } from "../src/lib/cloze.ts";

test("combined cloze masks every numbered span and keeps hints", () => {
  const source = "{{c1::Paris::city}} is in {{c2::France}}.";
  assert.equal(clozePrompt(source), "[city] is in […].");
  assert.equal(clozeAnswer(source), "Paris is in France.");
  assert.equal(hasCloze(source), true);
});

test("ordinary text is unchanged", () => {
  assert.equal(clozePrompt("No cloze"), "No cloze");
  assert.equal(clozeAnswer("No cloze"), "No cloze");
  assert.equal(hasCloze("No cloze"), false);
});
