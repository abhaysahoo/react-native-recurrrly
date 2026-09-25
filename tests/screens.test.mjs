import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import ts from "typescript";
import * as auth from "../lib/auth.ts";
import * as utils from "../lib/utils.ts";

// Exercise the screen handlers without a native renderer or a live Clerk account.
// The source is transpiled with the TypeScript version already used by this app.
function screenHarness(sourcePath, clerkHooks = {}, screenProps = {}) {
  const state = [];
  let stateIndex = 0;
  const useState = (initialValue) => {
    const index = stateIndex++;
    if (!(index in state)) state[index] = initialValue;
    return [state[index], (next) => {
      state[index] = typeof next === "function" ? next(state[index]) : next;
    }];
  };
  const element = (type, props) => ({ type, props: props ?? {} });
  const native = Object.fromEntries(
    ["ActivityIndicator", "Image", "Pressable", "Text", "View"].map((name) => [name, name]),
  );
  const dependencies = {
    "@/components/auth/AuthField": { default: "AuthField" },
    "@/components/auth/AuthScreen": { default: "AuthScreen" },
    "@/lib/auth": auth,
    "@/lib/utils": utils,
    "@clerk/expo": clerkHooks,
    clsx: (...parts) => parts.filter(Boolean).join(" "),
    "expo-router": { Link: "Link" },
    react: { useState },
    "react-native": native,
    "react/jsx-runtime": { jsx: element, jsxs: element, Fragment: "Fragment" },
  };
  const source = readFileSync(new URL(sourcePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  const requireMock = (name) => {
    assert.ok(name in dependencies, `Unexpected screen dependency: ${name}`);
    return dependencies[name];
  };
  new Function("require", "module", "exports", compiled)(
    requireMock,
    loaded,
    loaded.exports,
  );

  let tree;
  const render = () => {
    stateIndex = 0;
    tree = loaded.exports.default(screenProps);
    return tree;
  };
  const descendants = (node, matches, found = []) => {
    if (Array.isArray(node)) {
      node.forEach((child) => descendants(child, matches, found));
    } else if (node && typeof node === "object" && "type" in node) {
      if (matches(node)) found.push(node);
      descendants(node.props.children, matches, found);
      descendants(node.props.footer, matches, found);
    }
    return found;
  };
  const content = (node) => {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(content).join("");
    return node && typeof node === "object" ? content(node.props?.children) : "";
  };
  const field = (label) => {
    const found = descendants(tree, (node) => node.type === "AuthField" && node.props.label === label);
    assert.equal(found.length, 1, `Expected one ${label} field`);
    return found[0].props;
  };
  const button = (label) => {
    const found = descendants(tree, (node) =>
      node.type === "Pressable" &&
      (node.props.accessibilityLabel === label || content(node) === label),
    );
    assert.equal(found.length, 1, `Expected one ${label} button`);
    return found[0].props;
  };
  const press = async (label) => {
    const action = button(label);
    assert.notEqual(action.disabled, true, `${label} should be enabled`);
    await action.onPress();
    render();
  };
  const shows = (message) => descendants(
    tree,
    (node) => node.type === "Text" && content(node).includes(message),
  ).length > 0;

  render();
  return { render, field, button, press, shows, screen: () => tree.props };
}

function asyncSpy(result = { error: null }) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return typeof fn.result === "function" ? fn.result(...args) : fn.result;
  };
  fn.calls = [];
  fn.result = result;
  return fn;
}

function signInFixture() {
  const signIn = {
    status: "complete",
    supportedSecondFactors: [{ strategy: "email_code" }],
    password: asyncSpy(),
    finalize: asyncSpy(),
    create: asyncSpy(),
    reset: asyncSpy(),
    mfa: { sendEmailCode: asyncSpy(), verifyEmailCode: asyncSpy() },
    resetPasswordEmailCode: {
      sendCode: asyncSpy(),
      verifyCode: asyncSpy(),
      submitPassword: asyncSpy(),
    },
  };
  const setActive = asyncSpy();
  const hook = { signIn, errors: { fields: {}, global: [] }, fetchStatus: "idle" };
  const screen = screenHarness("../app/(auth)/sign-in.tsx", {
    useSignIn: () => hook,
    useClerk: () => ({ setActive }),
  });
  return { screen, signIn, setActive, hook };
}

function signUpFixture() {
  const signUp = {
    status: "unverified",
    unverifiedFields: [],
    missingFields: [],
    password: asyncSpy(),
    finalize: asyncSpy(),
    reset: asyncSpy(),
    verifications: { sendEmailCode: asyncSpy(), verifyEmailCode: asyncSpy() },
  };
  const hook = { signUp, errors: { fields: {}, global: [] }, fetchStatus: "idle" };
  const screen = screenHarness("../app/(auth)/sign-up.tsx", {
    useSignUp: () => hook,
  });
  return { screen, signUp, hook };
}

test("sign-in validates both credentials before contacting Clerk, then finalizes", async () => {
  const { screen, signIn } = signInFixture();
  await screen.press("Sign in");
  assert.equal(screen.field("Email").error, "Enter your email address.");
  assert.equal(screen.field("Password").error, "Enter your password.");
  assert.equal(signIn.password.calls.length, 0);

  screen.field("Email").onChangeText("  member@example.com  ");
  screen.field("Password").onChangeText("password8");
  screen.render();
  assert.equal(screen.field("Email").error, undefined);
  await screen.press("Sign in");
  assert.deepEqual(signIn.password.calls, [[{
    emailAddress: "member@example.com",
    password: "password8",
  }]]);
  assert.equal(signIn.finalize.calls.length, 1);
});

test("sign-in activates an existing session for the exact already-signed-in error", async () => {
  const { screen, signIn, setActive } = signInFixture();
  signIn.existingSession = { sessionId: "session-123" };
  signIn.password.result = { error: { code: "identifier_already_signed_in", message: "Already signed in" } };
  screen.field("Email").onChangeText("member@example.com");
  screen.field("Password").onChangeText("password8");
  screen.render();

  await screen.press("Sign in");
  assert.deepEqual(setActive.calls, [[{ session: "session-123" }]]);
  assert.equal(signIn.finalize.calls.length, 0);
  assert.equal(screen.shows("Already signed in"), false);
});

test("sign-in sends and verifies a supported second-factor email challenge", async () => {
  const { screen, signIn } = signInFixture();
  signIn.status = "needs_second_factor";
  screen.field("Email").onChangeText("member@example.com");
  screen.field("Password").onChangeText("password8");
  screen.render();
  await screen.press("Sign in");
  assert.equal(signIn.mfa.sendEmailCode.calls.length, 1);
  assert.equal(screen.screen().title, "Confirm it's you");

  await screen.press("Verify");
  assert.equal(screen.field("Verification code").error, "Enter the 6-digit code.");
  assert.equal(signIn.mfa.verifyEmailCode.calls.length, 0);
  screen.field("Verification code").onChangeText(" 123456 ");
  signIn.status = "complete";
  screen.render();
  await screen.press("Verify");
  assert.deepEqual(signIn.mfa.verifyEmailCode.calls, [[{ code: "123456" }]]);
  assert.equal(signIn.finalize.calls.length, 1);
});

test("unsupported second factors stop without sending or finalizing", async () => {
  const { screen, signIn } = signInFixture();
  signIn.status = "needs_second_factor";
  signIn.supportedSecondFactors = [{ strategy: "phone_code" }];
  screen.field("Email").onChangeText("member@example.com");
  screen.field("Password").onChangeText("password8");
  screen.render();
  await screen.press("Sign in");
  assert.equal(signIn.mfa.sendEmailCode.calls.length, 0);
  assert.equal(signIn.finalize.calls.length, 0);
  assert.equal(screen.screen().title, "Welcome back");
  assert.equal(screen.shows("extra verification step"), true);
});

test("password reset validates each step and submits with other sessions signed out", async () => {
  const { screen, signIn } = signInFixture();
  await screen.press("Forgot password?");
  await screen.press("Send reset code");
  assert.equal(screen.field("Email").error, "Enter your email address.");
  assert.equal(signIn.create.calls.length, 0);

  screen.field("Email").onChangeText(" reset@example.com ");
  screen.render();
  await screen.press("Send reset code");
  assert.deepEqual(signIn.create.calls, [[{ identifier: "reset@example.com" }]]);
  assert.equal(signIn.resetPasswordEmailCode.sendCode.calls.length, 1);
  assert.equal(screen.screen().title, "Check your email");

  await screen.press("Verify code");
  assert.equal(signIn.resetPasswordEmailCode.verifyCode.calls.length, 0);
  screen.field("Verification code").onChangeText(" 000001 ");
  screen.render();
  await screen.press("Verify code");
  assert.deepEqual(signIn.resetPasswordEmailCode.verifyCode.calls, [[{ code: "000001" }]]);
  assert.equal(screen.screen().title, "Choose a new password");

  await screen.press("Update password");
  assert.equal(signIn.resetPasswordEmailCode.submitPassword.calls.length, 0);
  screen.field("New password").onChangeText("replacement8");
  screen.render();
  await screen.press("Update password");
  assert.deepEqual(signIn.resetPasswordEmailCode.submitPassword.calls, [[{
    password: "replacement8",
    signOutOfOtherSessions: true,
  }]]);
  assert.equal(signIn.finalize.calls.length, 1);
});

test("sign-up validates locally, sends an email code, and finalizes verified accounts", async () => {
  const { screen, signUp } = signUpFixture();
  await screen.press("Create an account");
  assert.equal(screen.field("Email").error, "Enter your email address.");
  assert.equal(screen.field("Password").error, "Enter your password.");
  assert.equal(signUp.password.calls.length, 0);

  screen.field("Email").onChangeText(" new@example.com ");
  screen.field("Password").onChangeText("password8");
  screen.render();
  await screen.press("Create an account");
  assert.deepEqual(signUp.password.calls, [[{
    emailAddress: "new@example.com",
    password: "password8",
  }]]);
  assert.equal(signUp.verifications.sendEmailCode.calls.length, 1);
  assert.equal(screen.screen().title, "Check your email");

  await screen.press("Verify");
  assert.equal(screen.field("Verification code").error, "Enter the 6-digit code.");
  assert.equal(signUp.verifications.verifyEmailCode.calls.length, 0);
  screen.field("Verification code").onChangeText(" 654321 ");
  signUp.status = "complete";
  screen.render();
  await screen.press("Verify");
  assert.deepEqual(signUp.verifications.verifyEmailCode.calls, [[{ code: "654321" }]]);
  assert.equal(signUp.finalize.calls.length, 1);
});

test("sign-up keeps a pending verification step after remount and can start over", async () => {
  const { screen, signUp } = signUpFixture();
  signUp.status = "missing_requirements";
  signUp.unverifiedFields = ["email_address"];
  screen.render();
  assert.equal(screen.screen().title, "Check your email");
  await screen.press("Use a different email");
  assert.equal(signUp.reset.calls.length, 1);
  signUp.status = "unverified";
  signUp.unverifiedFields = [];
  screen.render();
  assert.equal(screen.screen().title, "Create an account");
});

test("sign-up surfaces a safe send-code error without entering verification", async () => {
  const { screen, signUp } = signUpFixture();
  signUp.verifications.sendEmailCode.result = { error: { message: "Clerk refused the request" } };
  screen.field("Email").onChangeText("new@example.com");
  screen.field("Password").onChangeText("password8");
  screen.render();
  await screen.press("Create an account");
  assert.equal(screen.screen().title, "Create an account");
  assert.equal(screen.shows("Something went wrong. Check your details and try again."), true);
  assert.equal(signUp.finalize.calls.length, 0);
});

test("fetching disables auth submission to prevent duplicate requests", () => {
  const { screen, hook } = signUpFixture();
  hook.fetchStatus = "fetching";
  screen.render();
  assert.equal(screen.button("Create an account").disabled, true);
});

test("subscription cards keep details collapsed and use the plan when category is blank", () => {
  let pressed = 0;
  const props = {
    name: "Example Plan",
    icon: 1,
    price: 12.5,
    currency: "USD",
    billing: "Monthly",
    category: "  ",
    plan: "Premium",
    renewalDate: "2026-09-25",
    expanded: false,
    onPress: () => { pressed++; },
  };
  const screen = screenHarness("../components/SubscriptionCard.tsx", {}, props);
  assert.equal(screen.shows("Example Plan"), true);
  assert.equal(screen.shows("Premium"), true);
  assert.equal(screen.shows(utils.formatCurrency(12.5, "USD")), true);
  assert.equal(screen.shows("Payment:"), false);
  screen.screen().onPress();
  assert.equal(pressed, 1);
});

test("expanded subscription cards show formatted detail values", () => {
  const props = {
    name: "Example Plan",
    icon: 1,
    price: 12.5,
    currency: "USD",
    billing: "Monthly",
    category: "Streaming",
    paymentMethod: "Visa ending in 1234",
    startDate: "2024-02-29",
    renewalDate: "2026-09-25",
    status: "active",
    expanded: true,
    onPress: () => {},
  };
  const screen = screenHarness("../components/SubscriptionCard.tsx", {}, props);
  for (const value of ["Payment:", "Visa ending in 1234", "Streaming", "02/29/2024", "09/25/2026", "Active"]) {
    assert.equal(screen.shows(value), true, value);
  }
});

test("upcoming cards distinguish the last day from multiple remaining days", () => {
  const props = { name: "Renewal", icon: 1, price: 5.99, daysLeft: 2 };
  const screen = screenHarness("../components/UpcomingSubscriptionCard.tsx", {}, props);
  assert.equal(screen.shows("2 days left"), true);
  assert.equal(screen.shows(utils.formatCurrency(5.99, "USD")), true);
  props.daysLeft = 1;
  screen.render();
  assert.equal(screen.shows("Last day"), true);
});
