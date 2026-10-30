import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../frontend/public/sw.js", import.meta.url), "utf8");

function worker(fetch, caches = {}, scope = "https://example.test/") {
  const listeners = {};
  runInNewContext(source, {
    self: { registration: { scope }, addEventListener: (name, handler) => { listeners[name] = handler; } },
    URL, Response, fetch, caches,
  });
  return (path, mode = "cors") => {
    let response;
    const pending = [];
    listeners.fetch({
      request: { method: "GET", url: new URL(path, scope).href, mode },
      respondWith: (value) => { response = value; },
      waitUntil: (value) => pending.push(value),
    });
    return { get response() { return response; }, pending };
  };
}

test("pages, auth, APIs and manifest bypass interception", () => {
  const dispatch = worker(() => assert.fail("unexpected fetch"));
  for (const path of ["files/", "login", "api/resources/", "static/manifest.json"]) {
    assert.equal(dispatch(path).response, undefined);
  }
  assert.equal(dispatch("static/assets/test.js", "navigate").response, undefined);
});

test("offline cache miss returns a Response instead of undefined", async () => {
  const dispatch = worker(async () => { throw new Error("offline"); }, { match: async () => undefined });
  assert.equal((await dispatch("static/assets/test.js").response).type, "error");
});

test("offline assets can still use cache", async () => {
  const cached = new Response("cached");
  const dispatch = worker(async () => { throw new Error("offline"); }, { match: async () => cached });
  assert.equal(await dispatch("static/assets/test.js").response, cached);
});

test("cache storage failure does not fail an online asset, including subpath deployments", async () => {
  const dispatch = worker(async () => new Response("online"), {
    open: async () => { throw new Error("quota"); },
  }, "https://example.test/cloud/");
  const event = dispatch("static/assets/test.js");
  assert.equal(await (await event.response).text(), "online");
  await Promise.all(event.pending);
  assert.equal(dispatch("/static/assets/test.js").response, undefined);
});
