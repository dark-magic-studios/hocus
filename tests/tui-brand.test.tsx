import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { BrandMark } from "../src/tui/components/BrandMark.js";
import { getBrandMark } from "../src/tui/theme.js";

test("getBrandMark renders the rotated-H lockup with violet star and green bars", () => {
  const rows = getBrandMark(true);
  assert.equal(rows.length, 5);
  assert.match(rows[0]!.text, /✦/);
  assert.equal(rows[0]!.color, "violet");
  assert.match(rows[1]!.text, /█{8,}/);
  assert.equal(rows[1]!.color, "green");
  assert.match(rows[4]!.text, /HOCUS/);
});

test("getBrandMark degrades to ascii when unicode is unavailable", () => {
  const rows = getBrandMark(false);
  assert.match(rows[0]!.text, /\*/);
  assert.match(rows[1]!.text, /#{8,}/);
});

test("BrandMark compact header shows violet star and HOCUS wordmark", () => {
  const instance = render(<BrandMark compact />);
  const frame = instance.lastFrame() ?? "";
  assert.match(frame, /HOCUS/);
  instance.unmount();
});

test("BrandMark full lockup renders without throwing", () => {
  const instance = render(<BrandMark />);
  const frame = instance.lastFrame() ?? "";
  assert.match(frame, /HOCUS/);
  assert.match(frame, /█|#/);
  instance.unmount();
});
