import { migrateProjectCast } from "../utils/cast-migrate.js";
import {
  createCustomCast,
  customCastExists,
  deleteCustomCast,
  describeProjectCast,
  isBuiltinCast,
  listAvailableCasts,
  loadCustomCast,
  readProjectCastId,
} from "../utils/cast-registry.js";
import { normalizeCast } from "../utils/cast.js";
import { log } from "../utils/log.js";

export interface RecastOptions {
  repoRoot: string;
  castName: string;
  dryRun?: boolean;
  create?: boolean;
  label?: string;
  delete?: boolean;
  list?: boolean;
}

export async function runRecast(opts: RecastOptions): Promise<void> {
  if (opts.list) {
    const casts = await listAvailableCasts(opts.repoRoot);
    const active = await readProjectCastId(opts.repoRoot);
    for (const c of casts) {
      const marker = c.id === active ? " (active)" : "";
      log.info(`${c.id}${marker} — ${c.label}${c.builtin ? "" : " [custom]"}`);
    }
    return;
  }

  if (opts.delete) {
    await deleteCustomCast(opts.repoRoot, opts.castName);
    const active = await readProjectCastId(opts.repoRoot);
    if (active === opts.castName) {
      await migrateProjectCast(opts.repoRoot, "wizard", { dryRun: opts.dryRun });
    }
    log.ok(`deleted custom cast "${opts.castName}"`);
    return;
  }

  if (opts.create) {
    const config = await createCustomCast(opts.repoRoot, opts.castName, opts.label);
    log.ok(`created custom cast "${opts.castName}" at .hocus/casts/${opts.castName}.json`);
    log.info(`edit persona names in ${config.label} before running: hocus recast ${opts.castName}`);
    return;
  }

  const normalized = normalizeCast(opts.castName);
  const castId = normalized ?? opts.castName;
  if (!normalized && !(await customCastExists(opts.repoRoot, castId))) {
    throw new Error(
      `unknown cast "${opts.castName}". Use valley, wizard, or create a custom cast:\n` +
        `  hocus recast --create my-cast\n` +
        `See docs/custom-casts.md for the JSON schema.`,
    );
  }
  const custom = isBuiltinCast(castId) ? undefined : await loadCustomCast(opts.repoRoot, castId);
  await migrateProjectCast(opts.repoRoot, castId, { dryRun: opts.dryRun });
  log.info(`cast is now "${castId}" (${describeProjectCast(castId, custom)})`);
  log.info("re-run `hocus cast` to recompile agents for the new names");
}
