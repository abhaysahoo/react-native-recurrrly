import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "../lib/utils.ts";

test("currency formatting groups, rounds, and preserves negative amounts", () => {
  assert.equal(formatCurrency(0, "USD", "en-US"), "$0");
  assert.equal(formatCurrency(1234.5, "USD", "en-US"), "$1,234.5");
  assert.equal(formatCurrency(1234.567, "USD", "en-US"), "$1,234.57");
  assert.equal(formatCurrency(-8.25, "USD", "en-US"), "-$8.25");
});

test("currency formatting respects the requested currency and locale", () => {
  assert.equal(formatCurrency(1234, "EUR", "de-DE"), "1.234 €");
});

test("currency formatting rejects non-finite amounts before passing them to Intl", () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(
      () => formatCurrency(value, "USD", "en-US"),
      { name: "RangeError", message: `formatCurrency: value must be a finite number, got ${value}` },
    );
  }
});

test("subscription dates use the compact display format and a missing-value fallback", () => {
  assert.equal(formatSubscriptionDateTime("2026-09-25"), "09/25/2026");
  assert.equal(formatSubscriptionDateTime("2024-02-29"), "02/29/2024");
  assert.equal(formatSubscriptionDateTime(undefined), "Not provided");
  assert.equal(formatSubscriptionDateTime(""), "Not provided");
  assert.equal(formatSubscriptionDateTime("not-a-date"), "Not provided");
});

test("status labels capitalize the first character and handle missing values", () => {
  assert.equal(formatStatusLabel(undefined), "Unknown");
  assert.equal(formatStatusLabel(""), "Unknown");
  assert.equal(formatStatusLabel("active"), "Active");
  assert.equal(formatStatusLabel("PAST_DUE"), "PAST_DUE");
});
