import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectStack } from "../src/scanners/detect-stack.js";

test("detectStack distinguishes JavaScript-only from TypeScript projects", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-js-"));
  try {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "js-proj" }));
    const stack = await detectStack(dir);
    assert.deepEqual(stack.languages, ["javascript"]);
    assert.equal(stack.languages.includes("typescript"), false);

    // Add tsconfig.json
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    const tsStack = await detectStack(dir);
    assert.ok(tsStack.languages.includes("javascript"));
    assert.ok(tsStack.languages.includes("typescript"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("detectStack detects Rails stack", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-rails-"));
  try {
    fs.writeFileSync(path.join(dir, "Gemfile"), 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\n');
    fs.mkdirSync(path.join(dir, "config"), { recursive: true });
    fs.writeFileSync(path.join(dir, "config", "routes.rb"), "Rails.application.routes.draw do\nend\n");

    const stack = await detectStack(dir);
    assert.ok(stack.languages.includes("ruby"));
    assert.ok(stack.frameworks.includes("Rails"));
    assert.equal(stack.packageManager, "bundler");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("detectStack detects Phaser and web game dev", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-phaser-"));
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "phaser-game",
        dependencies: { phaser: "^3.80.0" },
        devDependencies: { typescript: "^5.0.0" },
      }),
    );
    const stack = await detectStack(dir);
    assert.ok(stack.languages.includes("javascript"));
    assert.ok(stack.languages.includes("typescript"));
    assert.ok(stack.frameworks.includes("Phaser"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("detectStack detects .NET and ASP.NET Core", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-dotnet-"));
  try {
    fs.writeFileSync(
      path.join(dir, "MyService.csproj"),
      '<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n  </PropertyGroup>\n</Project>',
    );
    const stack = await detectStack(dir);
    assert.ok(stack.languages.includes("csharp"));
    assert.ok(stack.frameworks.includes(".NET"));
    assert.ok(stack.frameworks.includes("ASP.NET Core"));
    assert.equal(stack.packageManager, "dotnet");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("detectStack detects Elixir and Phoenix", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-elixir-"));
  try {
    fs.writeFileSync(
      path.join(dir, "mix.exs"),
      'defmodule App.MixProject do\n  use Mix.Project\n  defp deps do\n    [{:phoenix, "~> 1.7"}]\n  end\nend\n',
    );
    const stack = await detectStack(dir);
    assert.ok(stack.languages.includes("elixir"));
    assert.ok(stack.frameworks.includes("Phoenix"));
    assert.equal(stack.packageManager, "mix");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("detectStack detects Godot engine", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-godot-"));
  try {
    fs.writeFileSync(path.join(dir, "project.godot"), 'config_version=5\n[application]\nconfig/name="MyGame"\n');
    const stack = await detectStack(dir);
    assert.ok(stack.frameworks.includes("Godot"));
    assert.ok(stack.languages.includes("gdscript"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
