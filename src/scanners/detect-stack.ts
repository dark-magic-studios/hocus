import fsExtra from "fs-extra";
const { pathExists, readJson, readFile, readdir } = fsExtra;
import path from "node:path";
import type { DetectedStack } from "../compilers/types.js";

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const JS_FRAMEWORK_SIGNALS: Record<string, string> = {
  // Web frameworks & UI
  next: "Next.js",
  tailwindcss: "Tailwind",
  "@supabase/supabase-js": "Supabase",
  "@tauri-apps/cli": "Tauri",
  "@tauri-apps/api": "Tauri",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
  nuxt: "Nuxt",
  astro: "Astro",
  "@remix-run/react": "Remix",
  "@remix-run/node": "Remix",
  // Backend
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
  nestjs: "NestJS",
  // Mobile & Desktop
  electron: "Electron",
  "react-native": "React Native",
  expo: "Expo",
  // Game Dev
  phaser: "Phaser",
  "pixi.js": "PixiJS",
  three: "Three.js",
  "@types/three": "Three.js",
  "@babylonjs/core": "Babylon.js",
  babylonjs: "Babylon.js",
  kaboom: "Kaboom",
  kaplay: "Kaplay",
  excalibur: "Excalibur.js",
  playcanvas: "PlayCanvas",
};

async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Cheap, local heuristics only — no network calls, no AI inference.
 * Scans repoRoot for project files, manifests, and configs to infer
 * languages, frameworks (Rails, game dev, .NET, Phaser, Phoenix, etc.),
 * and package managers.
 */
export async function detectStack(repoRoot: string): Promise<DetectedStack> {
  const languages: string[] = [];
  const frameworks: string[] = [];
  let packageManager: string | undefined;

  const rootEntries = await readdir(repoRoot).catch(() => [] as string[]);
  const entrySet = new Set(rootEntries);

  // 1. Node / JavaScript / TypeScript
  const packageJsonPath = path.join(repoRoot, "package.json");
  const hasPackageJson = entrySet.has("package.json");
  const hasTsConfig = entrySet.has("tsconfig.json") || (await pathExists(path.join(repoRoot, "tsconfig.json")));

  if (hasPackageJson) {
    languages.push("javascript");

    if (entrySet.has("pnpm-lock.yaml")) packageManager = "pnpm";
    else if (entrySet.has("yarn.lock")) packageManager = "yarn";
    else if (entrySet.has("package-lock.json")) packageManager = "npm";
    else if (entrySet.has("bun.lockb") || entrySet.has("bun.lock")) packageManager = "bun";

    const pkg = await readJson(packageJsonPath).catch(() => ({} as PackageJsonShape));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const hasTsDep = Boolean(
      deps.typescript ||
      Object.keys(deps).some((d) => d.startsWith("@types/")),
    );

    if (hasTsConfig || hasTsDep) {
      languages.push("typescript");
    }

    for (const [dep, label] of Object.entries(JS_FRAMEWORK_SIGNALS)) {
      if (deps[dep]) frameworks.push(label);
    }
  } else {
    if (hasTsConfig) {
      languages.push("typescript");
    }
    if (entrySet.has("deno.json") || entrySet.has("deno.jsonc")) {
      languages.push("javascript", "typescript");
      packageManager = packageManager ?? "deno";
    }
    if (entrySet.has("bun.lockb") || entrySet.has("bun.lock")) {
      languages.push("javascript");
      packageManager = packageManager ?? "bun";
    }
  }

  // 2. Ruby / Rails
  const hasGemfile = entrySet.has("Gemfile");
  const hasRubyFiles = hasGemfile || entrySet.has("Gemfile.lock") || entrySet.has("Rakefile") || entrySet.has(".ruby-version");
  const hasRailsDir = (await pathExists(path.join(repoRoot, "config", "routes.rb"))) ||
    (await pathExists(path.join(repoRoot, "config", "application.rb"))) ||
    (await pathExists(path.join(repoRoot, "bin", "rails")));

  if (hasRubyFiles || hasRailsDir) {
    languages.push("ruby");
    if (hasGemfile) packageManager = packageManager ?? "bundler";

    let isRails = hasRailsDir;
    if (!isRails && hasGemfile) {
      const gemfileContent = await safeReadFile(path.join(repoRoot, "Gemfile"));
      if (/gem\s+['"]rails['"]/i.test(gemfileContent)) {
        isRails = true;
      }
      if (/gem\s+['"]sinatra['"]/i.test(gemfileContent)) {
        frameworks.push("Sinatra");
      }
    }
    if (isRails) {
      frameworks.push("Rails");
    }
  }

  // 3. .NET / C# / F#
  const csprojFiles = rootEntries.filter((f) => f.endsWith(".csproj"));
  const fsprojFiles = rootEntries.filter((f) => f.endsWith(".fsproj"));
  const slnFiles = rootEntries.filter((f) => f.endsWith(".sln"));
  const hasDotnetManifest = entrySet.has("global.json") || entrySet.has("Directory.Build.props");

  if (csprojFiles.length > 0 || slnFiles.length > 0 || hasDotnetManifest) {
    languages.push("csharp");
    frameworks.push(".NET");
    packageManager = packageManager ?? "dotnet";
  }
  if (fsprojFiles.length > 0) {
    languages.push("fsharp");
    frameworks.push(".NET");
    packageManager = packageManager ?? "dotnet";
  }

  // Inspect first csproj for specific .NET sub-frameworks
  if (csprojFiles.length > 0) {
    const csprojContent = await safeReadFile(path.join(repoRoot, csprojFiles[0]!));
    if (csprojContent.includes("Microsoft.NET.Sdk.Web") || csprojContent.includes("Microsoft.AspNetCore")) {
      frameworks.push("ASP.NET Core");
    }
    if (csprojContent.includes("Microsoft.Maui") || csprojContent.includes("UseMaui")) {
      frameworks.push(".NET MAUI");
    }
    if (csprojContent.includes("Microsoft.NET.Sdk.BlazorWebAssembly") || csprojContent.includes("Blazor")) {
      frameworks.push("Blazor");
    }
    if (csprojContent.includes("MonoGame")) {
      frameworks.push("MonoGame");
    }
  }

  // 4. Game Engines & Game Dev (Dedicated / Native)
  if (entrySet.has("project.godot")) {
    frameworks.push("Godot");
    languages.push("gdscript");
  }

  const hasUnity = (await pathExists(path.join(repoRoot, "ProjectSettings", "ProjectVersion.txt"))) ||
    ((await pathExists(path.join(repoRoot, "Assets"))) && (await pathExists(path.join(repoRoot, "ProjectSettings"))));
  if (hasUnity) {
    frameworks.push("Unity");
    languages.push("csharp");
  }

  const uprojectFiles = rootEntries.filter((f) => f.endsWith(".uproject"));
  if (uprojectFiles.length > 0) {
    frameworks.push("Unreal Engine");
    languages.push("cpp");
  }

  if (entrySet.has("conf.lua") && entrySet.has("main.lua")) {
    frameworks.push("LÖVE");
    languages.push("lua");
  }

  if (entrySet.has("game.project")) {
    frameworks.push("Defold");
    languages.push("lua");
  }

  // 5. Elixir / Phoenix
  if (entrySet.has("mix.exs") || entrySet.has("mix.lock")) {
    languages.push("elixir");
    packageManager = packageManager ?? "mix";
    const mixContent = await safeReadFile(path.join(repoRoot, "mix.exs"));
    if (mixContent.includes(":phoenix") || (await safeReadFile(path.join(repoRoot, "mix.lock"))).includes('"phoenix"')) {
      frameworks.push("Phoenix");
    }
  }

  // 6. Rust & Rust Game Engines / Web Frameworks
  if (entrySet.has("Cargo.toml")) {
    languages.push("rust");
    packageManager = packageManager ?? "cargo";
    const cargoContent = await safeReadFile(path.join(repoRoot, "Cargo.toml"));
    if (cargoContent.includes("bevy")) frameworks.push("Bevy");
    if (cargoContent.includes("macroquad")) frameworks.push("Macroquad");
    if (cargoContent.includes("actix-web")) frameworks.push("Actix Web");
    if (cargoContent.includes("axum")) frameworks.push("Axum");
    if (cargoContent.includes("tauri")) frameworks.push("Tauri");
  }

  // 7. Go
  if (entrySet.has("go.mod")) {
    languages.push("go");
    packageManager = packageManager ?? "go";
    const goModContent = await safeReadFile(path.join(repoRoot, "go.mod"));
    if (goModContent.includes("gin-gonic/gin")) frameworks.push("Gin");
    if (goModContent.includes("labstack/echo")) frameworks.push("Echo");
    if (goModContent.includes("gofiber/fiber")) frameworks.push("Fiber");
    if (goModContent.includes("hajimehoshi/ebiten")) frameworks.push("Ebitengine");
  }

  // 8. Python
  const hasPyProject = entrySet.has("pyproject.toml");
  const hasRequirements = entrySet.has("requirements.txt");
  const hasPipfile = entrySet.has("Pipfile");
  const hasSetupPy = entrySet.has("setup.py");

  if (hasPyProject || hasRequirements || hasPipfile || hasSetupPy) {
    languages.push("python");
    if (entrySet.has("uv.lock")) packageManager = packageManager ?? "uv";
    else if (entrySet.has("poetry.lock")) packageManager = packageManager ?? "poetry";
    else if (hasPipfile) packageManager = packageManager ?? "pipenv";
    else packageManager = packageManager ?? "pip";

    const pyManifest = (await safeReadFile(path.join(repoRoot, "requirements.txt"))) +
      (await safeReadFile(path.join(repoRoot, "pyproject.toml"))) +
      (await safeReadFile(path.join(repoRoot, "Pipfile")));

    if (/fastapi/i.test(pyManifest)) frameworks.push("FastAPI");
    if (/django/i.test(pyManifest)) frameworks.push("Django");
    if (/flask/i.test(pyManifest)) frameworks.push("Flask");
    if (/pygame/i.test(pyManifest)) frameworks.push("Pygame");
    if (/torch|pytorch/i.test(pyManifest)) frameworks.push("PyTorch");
  }

  // 9. PHP
  if (entrySet.has("composer.json")) {
    languages.push("php");
    packageManager = packageManager ?? "composer";
    const composerContent = await safeReadFile(path.join(repoRoot, "composer.json"));
    if (composerContent.includes("laravel/framework")) frameworks.push("Laravel");
    if (composerContent.includes("symfony/")) frameworks.push("Symfony");
  }

  // 10. Java / Kotlin
  if (entrySet.has("pom.xml")) {
    languages.push("java");
    packageManager = packageManager ?? "maven";
    const pomContent = await safeReadFile(path.join(repoRoot, "pom.xml"));
    if (pomContent.includes("spring-boot")) frameworks.push("Spring Boot");
  }
  if (entrySet.has("build.gradle") || entrySet.has("build.gradle.kts")) {
    languages.push(entrySet.has("build.gradle.kts") ? "kotlin" : "java");
    packageManager = packageManager ?? "gradle";
    const gradleContent = (await safeReadFile(path.join(repoRoot, "build.gradle"))) +
      (await safeReadFile(path.join(repoRoot, "build.gradle.kts")));
    if (gradleContent.includes("org.springframework.boot") || gradleContent.includes("spring-boot")) {
      frameworks.push("Spring Boot");
    }
  }

  // 11. Swift
  if (entrySet.has("Package.swift")) {
    languages.push("swift");
    packageManager = packageManager ?? "swift";
  }

  // 12. Dart / Flutter
  if (entrySet.has("pubspec.yaml")) {
    languages.push("dart");
    packageManager = packageManager ?? "flutter";
    const pubContent = await safeReadFile(path.join(repoRoot, "pubspec.yaml"));
    if (pubContent.includes("flutter:")) frameworks.push("Flutter");
  }

  return {
    languages: [...new Set(languages)],
    frameworks: [...new Set(frameworks)],
    packageManager,
  };
}
