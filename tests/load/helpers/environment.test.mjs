import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeLoadTarget,
  assertStressAllowed,
  isLocalLoadTarget,
  isProductionLoadTarget,
} from "./environment.mjs";

test("blocks Xingyu production hosts", () => {
  assert.equal(isProductionLoadTarget("https://xingyu.com.br"), true);
  assert.equal(isProductionLoadTarget("https://www.xingyu.com.br/api"), true);
  assert.equal(isProductionLoadTarget("https://api.xingyu.com.br"), true);
  assert.equal(isProductionLoadTarget("https://app.xingyu.com/api"), true);
});

test("allows localhost", () => {
  assert.equal(isLocalLoadTarget("http://localhost:3333/api"), true);
  assert.equal(isLocalLoadTarget("http://127.0.0.1:3333/api"), true);
  assert.equal(isProductionLoadTarget("http://localhost:3333/api"), false);
});

test("assertSafeLoadTarget throws on production", () => {
  assert.throws(() => assertSafeLoadTarget("https://xingyu.com.br"), /forbidden/);
});

test("assertSafeLoadTarget throws on empty URL", () => {
  assert.throws(() => assertSafeLoadTarget(""), /required/);
});

test("assertSafeLoadTarget throws on remote staging without opt-in", () => {
  assert.throws(
    () => assertSafeLoadTarget("https://staging.example.com/api"),
    /ALLOW_REMOTE_LOAD_TEST/,
  );
});

test("assertSafeLoadTarget allows remote staging with opt-in", () => {
  assert.equal(
    assertSafeLoadTarget("https://staging.example.com/api", { ALLOW_REMOTE_LOAD_TEST: "true" }),
    true,
  );
});

test("assertStressAllowed requires explicit env", () => {
  assert.throws(() => assertStressAllowed({}), /ALLOW_STRESS_TEST/);
  assert.equal(assertStressAllowed({ ALLOW_STRESS_TEST: "true" }), undefined);
});
