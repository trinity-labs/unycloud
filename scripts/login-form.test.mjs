import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(realpathSync(new URL("../frontend/node_modules/vue/package.json", import.meta.url)));
const { parse } = require("@vue/compiler-dom");

const source = readFileSync(new URL("../frontend/src/views/Login.vue", import.meta.url), "utf8");
const root = parse(source);
const elements = [];
function walk(node) {
  if (node.type === 1) elements.push(node);
  for (const child of node.children || []) walk(child);
}
walk(root);
const attr = (node, name) => node.props.find((p) => p.type === 6 && p.name === name);
const value = (node, name) => attr(node, name)?.value?.content;

test("username remains a native editable text field without forced focus", () => {
  const input = elements.find((node) => value(node, "id") === "username");
  assert.ok(input);
  // Chrome server predictions misclassified the old name as CREDIT_CARD_NAME_FIRST.
  assert.equal(value(input, "name"), "unycloud_username");
  assert.equal(value(input, "type"), "text");
  assert.equal(value(input, "autocomplete"), "username");
  for (const name of ["disabled", "readonly", "autofocus", "inputmode", "enterkeyhint", "aria-label", "autocapitalize", "autocorrect", "spellcheck"]) {
    assert.equal(attr(input, name), undefined);
    assert.equal(input.props.some((p) => p.type === 7 && p.arg?.content === name), false);
  }
  assert.ok(elements.some((node) => node.tag === "label" && value(node, "for") === "username"));
});

test("credentials share the native login form", () => {
  const form = elements.find((node) => node.tag === "form");
  // Trial A (9adacea7) restored Username suggestions; input identities stay intact.
  for (const name of ["id", "name"]) {
    assert.equal(attr(form, name), undefined);
    assert.equal(form.props.some((p) => p.type === 7 && p.arg?.content === name), false);
  }
  assert.equal(value(form, "autocomplete"), "on");
  assert.equal(value(form, "method"), "post");
  for (const id of ["username", "password"]) {
    assert.equal(form.children.filter((node) => node.type === 1 && value(node, "id") === id).length, 1);
  }
});
