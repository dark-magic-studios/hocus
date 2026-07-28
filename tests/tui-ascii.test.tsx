import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { StatusDot } from "../src/tui/components/StatusDot.js";
import { ProgressBar } from "../src/tui/components/ProgressBar.js";

test("HOCUS_ASCII=1 degrades glyphs to the ascii set", () => {
  const previous = process.env.HOCUS_ASCII;
  process.env.HOCUS_ASCII = "1";
  try {
    const instance = render(<StatusDot status="active" />);
    const frame = instance.lastFrame() ?? "";
    assert.match(frame, /\*/);
    assert.doesNotMatch(frame, /●/);
    instance.unmount();
  } finally {
    if (previous === undefined) delete process.env.HOCUS_ASCII;
    else process.env.HOCUS_ASCII = previous;
  }
});

test("without HOCUS_ASCII, unicode glyphs are used", () => {
  const previous = process.env.HOCUS_ASCII;
  delete process.env.HOCUS_ASCII;
  try {
    const instance = render(<StatusDot status="active" />);
    const frame = instance.lastFrame() ?? "";
    assert.match(frame, /●/);
    instance.unmount();
  } finally {
    if (previous !== undefined) process.env.HOCUS_ASCII = previous;
  }
});

test("HOCUS_ASCII=1 degrades the progress bar fill characters", () => {
  const previous = process.env.HOCUS_ASCII;
  process.env.HOCUS_ASCII = "1";
  try {
    const instance = render(<ProgressBar value={50} width={10} />);
    const frame = instance.lastFrame() ?? "";
    assert.match(frame, /#/);
    assert.doesNotMatch(frame, /█/);
    instance.unmount();
  } finally {
    if (previous === undefined) delete process.env.HOCUS_ASCII;
    else process.env.HOCUS_ASCII = previous;
  }
});
