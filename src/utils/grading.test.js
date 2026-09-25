// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { gradeNote, noteTips } from "./grading.js";

const status = (note, req) => gradeNote(note, [{ id: "r", ...req }])[0].status;

const scenarioDir = new URL("../scenarios/", import.meta.url);
const scenarios = readdirSync(scenarioDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, scenarioDir), "utf8")));

test("every scenario's model note meets all of its own requirements", () => {
  for (const s of scenarios) {
    const graded = gradeNote(s.documentation.modelNote, s.documentation.requirements);
    const failed = graded.filter((g) => g.status !== "met").map((g) => g.id);
    assert.deepEqual(failed, [], `${s.id}: model note fails ${failed.join(", ")}`);
  }
});

test("keywords match at word starts, short ones as whole words", () => {
  assert.equal(status("walked through the hall", { keywords: ["hr"] }), "missing");
  assert.equal(status("HR 92", { keywords: ["hr"] }), "met");
  assert.equal(status("medication given", { keywords: ["md"] }), "missing");
  assert.equal(status("pt is anticoagulated", { keywords: ["anticoagul"] }), "met");
});

test("aliases and typos are accepted", () => {
  assert.equal(status("pulse 88", { keywords: ["hr"] }), "met");
  assert.equal(status("called the doctor", { keywords: ["provider"] }), "met");
  assert.equal(status("neurlogical checks q15", { keywords: ["neurological"] }), "met");
  assert.equal(status("incision clean", { keywords: ["decision"] }), "missing");
});

test("forbidden phrases count only when asserted", () => {
  assert.equal(status("pt climbed over rails", { forbidden: ["climbed over"] }), "violated");
  assert.equal(status("pt did not climb over rails", { forbidden: ["climb over"] }), "met");
});

test("needs: time / number must sit near the keyword", () => {
  const req = { keywords: ["notified"], needs: ["time"] };
  assert.equal(status("Notified provider at 2118.", req), "met");
  assert.equal(status("Notified provider. 21:18.", req), "met");
  assert.equal(status("Notified provider.", req), "missing");
  assert.equal(status("BP 128/76. Notified provider.", req), "missing");
  assert.equal(status("SpO2 on room air", { keywords: ["spo2"], needs: ["number"] }), "missing");
  assert.equal(status("SpO2 91%", { keywords: ["spo2"], needs: ["number"] }), "met");
});

test("rejectNegated: a keyword the note says didn't happen isn't credited", () => {
  const req = { keywords: ["notified", "provider", "orders"], rejectNegated: true };
  for (const note of [
    "Provider not notified.",
    "Did not notify the provider, was not notified.",
    "Unable to reach provider.",
    "Provider was not notified at this time.",
  ]) {
    const [g] = gradeNote(note, [{ id: "r", ...req }]);
    assert.equal(g.status, "missing", note);
    assert.ok(g.hint, `expected a hint for: ${note}`);
  }
  for (const note of [
    "Notified provider at 2120, no new orders.",
    "No response to juice so notified provider.",
    "Initially unable to reach provider; provider notified at 2130.",
  ]) {
    assert.equal(status(note, req), "met", note);
  }
});

test("without rejectNegated, pertinent negatives still count", () => {
  assert.equal(status("Denies nausea.", { keywords: ["nausea"] }), "met");
  assert.equal(status("No nausea.", { keywords: ["nausea"] }), "met");
});

test("noteTips flags guessy words and a note with no times", () => {
  const tips = noteTips("Pt appears comfortable");
  assert.equal(tips.length, 2);
  assert.deepEqual(noteTips("2100 pt resting, HR 72"), []);
});
