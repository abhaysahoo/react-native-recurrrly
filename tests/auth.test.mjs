import assert from "node:assert/strict";
import test from "node:test";

import {
  clerkErrorMessage,
  clerkFieldMessage,
  clerkFormMessage,
  completeAuthSession,
  isAlreadySignedInError,
  MIN_PASSWORD_LENGTH,
  sanitizeUserMessage,
  validateCode,
  validateEmail,
  validatePassword,
} from "../lib/auth.ts";

test("email validation distinguishes missing, malformed, and valid addresses", () => {
  for (const email of ["", "  \t "]) {
    assert.equal(validateEmail(email), "Enter your email address.");
  }
  for (const email of ["name", "name@example", "@example.com", "name@@example.com", "name @example.com"]) {
    assert.equal(validateEmail(email), "Enter a valid email address.", email);
  }
  for (const email of ["name@example.com", "  name+tag@example.co  "]) {
    assert.equal(validateEmail(email), undefined, email);
  }
});

test("password validation enforces the boundary without altering the password", () => {
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(validatePassword(""), "Enter your password.");
  assert.equal(
    validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1)),
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  );
  assert.equal(validatePassword("a".repeat(MIN_PASSWORD_LENGTH)), undefined);
  assert.equal(validatePassword("a".repeat(MIN_PASSWORD_LENGTH + 1)), undefined);
});

test("verification codes require exactly six ASCII digits after outer whitespace is removed", () => {
  assert.equal(validateCode("  "), "Enter the 6-digit code.");
  for (const code of ["12345", "1234567", "12 456", "12345a", "１２３４５６"]) {
    assert.equal(validateCode(code), "Enter the 6-digit code from your email.", code);
  }
  assert.equal(validateCode("000000"), undefined);
  assert.equal(validateCode(" 123456\n"), undefined);
});

test("provider branding is hidden without changing ordinary messages", () => {
  const fallback = "Something went wrong. Check your details and try again.";
  assert.equal(sanitizeUserMessage("clerk rejected the code"), fallback);
  assert.equal(sanitizeUserMessage("Contact CLERK support"), fallback);
  assert.equal(sanitizeUserMessage("The code has expired."), "The code has expired.");
});

test("field errors use the short message and tolerate missing errors", () => {
  assert.equal(clerkFieldMessage(undefined), undefined);
  assert.equal(clerkFieldMessage(null), undefined);
  assert.equal(clerkFieldMessage({ message: "" }), undefined);
  assert.equal(
    clerkFieldMessage({ message: "Invalid email", longMessage: "Other detail" }),
    "Invalid email",
  );
  assert.equal(
    clerkFieldMessage({ message: "Clerk field error" }),
    "Something went wrong. Check your details and try again.",
  );
});

test("form errors select only the first global error and prefer its long message", () => {
  assert.equal(clerkFormMessage(undefined), undefined);
  assert.equal(clerkFormMessage({ global: null }), undefined);
  assert.equal(clerkFormMessage({ global: [] }), undefined);
  assert.equal(
    clerkFormMessage({
      global: [
        { message: "Short", longMessage: "More useful detail" },
        { message: "Later error" },
      ],
    }),
    "More useful detail",
  );
  assert.equal(clerkFormMessage({ global: [{ message: "Fallback" }] }), "Fallback");
  assert.equal(
    clerkFormMessage({ global: [{ message: "Clerk form failure" }] }),
    "Something went wrong. Check your details and try again.",
  );
});

test("individual errors prefer long messages and sanitize provider names", () => {
  assert.equal(clerkErrorMessage(null), undefined);
  assert.equal(clerkErrorMessage(undefined), undefined);
  assert.equal(
    clerkErrorMessage({ message: "Short", longMessage: "Detailed error" }),
    "Detailed error",
  );
  assert.equal(clerkErrorMessage({ message: "Short" }), "Short");
  assert.equal(
    clerkErrorMessage({ message: "Short", longMessage: "Clerk failed" }),
    "Something went wrong. Check your details and try again.",
  );
});

test("session completion finalizes once and leaves navigation to the auth guard", async () => {
  const calls = [];
  const resource = {
    existingSession: { sessionId: "existing" },
    async finalize(...args) {
      calls.push(args);
      return { error: null };
    },
  };

  assert.equal(await completeAuthSession(resource), undefined);
  assert.deepEqual(calls, [[]]);
});

test("session completion returns a safe finalization error", async () => {
  const resource = {
    async finalize() {
      return { error: { message: "Short", longMessage: "Clerk could not finish" } };
    },
  };
  assert.equal(
    await completeAuthSession(resource),
    "Something went wrong. Check your details and try again.",
  );
});

test("session completion does not disguise a rejected finalization request", async () => {
  const failure = new Error("network unavailable");
  await assert.rejects(
    completeAuthSession({ finalize: async () => { throw failure; } }),
    (error) => error === failure,
  );
});

test("already-signed-in detection matches only the exact provider code", () => {
  assert.equal(isAlreadySignedInError(undefined), false);
  assert.equal(isAlreadySignedInError(null), false);
  assert.equal(isAlreadySignedInError({ code: "identifier_already_signed_in", message: "" }), true);
  assert.equal(isAlreadySignedInError({ code: "Identifier_Already_Signed_In", message: "" }), false);
  assert.equal(isAlreadySignedInError({ code: "other", message: "" }), false);
});
