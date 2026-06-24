import fsExtra from "fs-extra";
const { pathExists, readJson } = fsExtra;
import path from "node:path";
import type { DetectedStack } from "../compilers/types.js";

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const FRAMEWORK_SIGNALS: Record<string, string> = {
  next: "Next.js",
  tailwindcss: "Tailwind",
  "@supabase/supabase-js": "Supabase",
  "@tauri-apps/cli": "Tauri",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
};

/**
 * Cheap, local heuristics only — no network calls, no AI inference. This is
 * meant to narrow down what `cast` should pay attention to, not to be a
 * complete picture of the repo.
 */
export async function detectStack(repoRoot: string): Promise<DetectedStack> {
  const languages: string[] = [];
  const frameworks: string[] = [];
  let packageManager: string | undefined;

  const packageJsonPath = path.join(repoRoot, "package.json");
  if (await pathExists(packageJsonPath)) {
    languages.push("javascript", "typescript");

    if (await pathExists(path.join(repoRoot, "pnpm-lock.yaml"))) packageManager = "pnpm";
    else if (await pathExists(path.join(repoRoot, "yarn.lock"))) packageManager = "yarn";
    else if (await pathExists(path.join(repoRoot, "package-lock.json"))) packageManager = "npm";

    const pkg = await readJson(packageJsonPath).catch(() => ({} as PackageJsonShape));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [dep, label] of Object.entries(FRAMEWORK_SIGNALS)) {
      if (deps[dep]) frameworks.push(label);
    }
  }

  if (await pathExists(path.join(repoRoot, "Cargo.toml"))) {
    languages.push("rust");
    packageManager = packageManager ?? "cargo";
  }

  if (await pathExists(path.join(repoRoot, "go.mod"))) {
    languages.push("go");
  }

  if (
    (await pathExists(path.join(repoRoot, "pyproject.toml"))) ||
    (await pathExists(path.join(repoRoot, "requirements.txt")))
  ) {
    languages.push("python");
  }

  return {
    languages: [...new Set(languages)],
    frameworks: [...new Set(frameworks)],
    packageManager,
  };
}
